import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from './firebase';
import { DEFAULT_COVER_IMAGE, isSafeCoverImage } from './imageUtils';
import { QUIZ_CONSTRAINTS, type Quiz, type QuizFormData, type QuizQuestion } from '../types/quiz';

function toDateOrNull(value: unknown): Date | null {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  return null;
}

function normalizeQuizDoc(id: string, data: Record<string, unknown>): Quiz {
  const rawQuestions = Array.isArray(data.questions) ? data.questions : [];
  const questions: QuizQuestion[] = rawQuestions.map((q, idx) => {
    const qObj = (q ?? {}) as Record<string, unknown>;
    const options = Array.isArray(qObj.options)
      ? qObj.options.map((opt) => String(opt ?? '')).filter(Boolean)
      : ['Opção A', 'Opção B'];
    const correctIndex =
      typeof qObj.correctIndex === 'number' &&
      Number.isInteger(qObj.correctIndex) &&
      qObj.correctIndex >= 0 &&
      qObj.correctIndex < options.length
        ? qObj.correctIndex
        : 0;

    return {
      id: typeof qObj.id === 'string' && qObj.id ? qObj.id : `q_${idx}`,
      title: typeof qObj.title === 'string' ? qObj.title : `Questão ${idx + 1}`,
      options,
      correctIndex,
      explanation: typeof qObj.explanation === 'string' ? qObj.explanation : '',
    };
  });

  const coverCandidate = typeof data.coverImage === 'string' ? data.coverImage : '';
  const coverImage = isSafeCoverImage(coverCandidate) ? coverCandidate : DEFAULT_COVER_IMAGE;

  return {
    id,
    title: typeof data.title === 'string' ? data.title : 'Quiz sem título',
    description: typeof data.description === 'string' ? data.description : '',
    coverImage,
    timeLimitMinutes:
      typeof data.timeLimitMinutes === 'number' && Number.isInteger(data.timeLimitMinutes)
        ? data.timeLimitMinutes
        : 0,
    shuffleQuestions: Boolean(data.shuffleQuestions),
    questions,
    questionCount: questions.length,
    authorId: typeof data.authorId === 'string' ? data.authorId : '',
    authorName: typeof data.authorName === 'string' ? data.authorName : 'Criador',
    createdAt: toDateOrNull(data.createdAt),
    updatedAt: toDateOrNull(data.updatedAt),
  };
}

function generateQuizId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `qz_${ts}_${rand}`;
}

export function sanitizeQuizPayload(form: QuizFormData) {
  const title = form.title.trim().slice(0, QUIZ_CONSTRAINTS.MAX_TITLE_LENGTH);
  if (!title) {
    throw new Error('O título do quiz é obrigatório.');
  }

  const description = form.description.trim().slice(0, QUIZ_CONSTRAINTS.MAX_DESCRIPTION_LENGTH);
  const coverImage = isSafeCoverImage(form.coverImage) ? form.coverImage.trim() : DEFAULT_COVER_IMAGE;

  const parsedTime = Math.round(Number(form.timeLimitMinutes) || 0);
  const timeLimitMinutes = Math.min(
    QUIZ_CONSTRAINTS.MAX_TIME_LIMIT_MINUTES,
    Math.max(0, parsedTime)
  );

  if (!Array.isArray(form.questions) || form.questions.length === 0) {
    throw new Error('Adicione pelo menos uma questão antes de salvar.');
  }

  const questions = form.questions.slice(0, QUIZ_CONSTRAINTS.MAX_QUESTIONS).map((q, idx) => {
    const qTitle = q.title.trim().slice(0, QUIZ_CONSTRAINTS.MAX_QUESTION_TITLE_LENGTH);
    if (!qTitle) {
      throw new Error(`A questão ${idx + 1} precisa ter um título.`);
    }

    const cleanedOptions = q.options
      .map((opt) => opt.trim().slice(0, QUIZ_CONSTRAINTS.MAX_OPTION_LENGTH))
      .filter((opt) => opt.length > 0)
      .slice(0, QUIZ_CONSTRAINTS.MAX_OPTIONS);

    if (cleanedOptions.length < QUIZ_CONSTRAINTS.MIN_OPTIONS) {
      throw new Error(`A questão ${idx + 1} precisa de pelo menos 2 alternativas preenchidas.`);
    }

    const correctIndex =
      Number.isInteger(q.correctIndex) &&
      q.correctIndex >= 0 &&
      q.correctIndex < cleanedOptions.length
        ? q.correctIndex
        : 0;

    const cleanId =
      q.id && QUIZ_CONSTRAINTS.ID_PATTERN.test(q.id)
        ? q.id.slice(0, 64)
        : `q_${idx}_${Date.now().toString(36)}`;

    const sanitizedQ: {
      id: string;
      title: string;
      options: string[];
      correctIndex: number;
      explanation?: string;
    } = {
      id: cleanId,
      title: qTitle,
      options: cleanedOptions,
      correctIndex,
    };

    const explanation = (q.explanation ?? '').trim().slice(0, QUIZ_CONSTRAINTS.MAX_EXPLANATION_LENGTH);
    if (explanation) {
      sanitizedQ.explanation = explanation;
    }

    return sanitizedQ;
  });

  return {
    title,
    description,
    coverImage,
    timeLimitMinutes,
    shuffleQuestions: Boolean(form.shuffleQuestions),
    questions,
    questionCount: questions.length,
  };
}

export async function upsertUserProfile(user: User): Promise<void> {
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  const displayName = (user.displayName || 'Criador').trim().slice(0, QUIZ_CONSTRAINTS.MAX_AUTHOR_NAME_LENGTH);
  const photoURL = (user.photoURL || '').slice(0, 1000);

  try {
    const existingSnap = await getDoc(ref);
    if (existingSnap.exists()) {
      const updatePayload: Record<string, unknown> = {
        displayName,
        updatedAt: serverTimestamp(),
      };
      if (photoURL) {
        updatePayload.photoURL = photoURL;
      }
      await updateDoc(ref, updatePayload);
    } else {
      const createPayload: Record<string, unknown> = {
        uid: user.uid,
        displayName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (photoURL) {
        createPayload.photoURL = photoURL;
      }
      await setDoc(ref, createPayload);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeUserQuizzes(
  uid: string,
  onData: (quizzes: Quiz[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const collectionPath = 'quizzes';
  const q = query(collection(db, collectionPath), where('authorId', '==', uid));

  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((docSnap) =>
        normalizeQuizDoc(docSnap.id, docSnap.data() as Record<string, unknown>)
      );
      list.sort((a, b) => {
        const timeA = a.updatedAt?.getTime() ?? 0;
        const timeB = b.updatedAt?.getTime() ?? 0;
        return timeB - timeA;
      });
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, collectionPath);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function getQuizById(quizId: string): Promise<Quiz | null> {
  const cleanId = quizId.trim();
  if (!QUIZ_CONSTRAINTS.ID_PATTERN.test(cleanId) || cleanId.length > 128) {
    return null;
  }

  const path = `quizzes/${cleanId}`;
  try {
    const snap = await getDoc(doc(db, 'quizzes', cleanId));
    if (!snap.exists()) {
      return null;
    }
    return normalizeQuizDoc(snap.id, snap.data() as Record<string, unknown>);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveQuiz(
  user: User,
  form: QuizFormData,
  existingQuizId?: string
): Promise<string> {
  const sanitized = sanitizeQuizPayload(form);
  const authorName = (user.displayName || 'Criador').trim().slice(0, QUIZ_CONSTRAINTS.MAX_AUTHOR_NAME_LENGTH);

  if (existingQuizId && QUIZ_CONSTRAINTS.ID_PATTERN.test(existingQuizId)) {
    const path = `quizzes/${existingQuizId}`;
    try {
      await updateDoc(doc(db, 'quizzes', existingQuizId), {
        ...sanitized,
        authorName,
        aiProvider: deleteField(),
        updatedAt: serverTimestamp(),
      });
      return existingQuizId;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  } else {
    const newId = generateQuizId();
    const path = `quizzes/${newId}`;
    try {
      await setDoc(doc(db, 'quizzes', newId), {
        ...sanitized,
        authorId: user.uid,
        authorName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return newId;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }
}

export async function deleteQuiz(quizId: string): Promise<void> {
  const path = `quizzes/${quizId}`;
  try {
    await deleteDoc(doc(db, 'quizzes', quizId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
