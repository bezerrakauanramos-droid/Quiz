import { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { auth, googleProvider } from './lib/firebase';
import {
  deleteQuiz,
  getQuizById,
  saveQuiz,
  subscribeUserQuizzes,
  upsertUserProfile,
} from './lib/quizService';
import { DEFAULT_COVER_IMAGE } from './lib/imageUtils';
import type { Quiz, QuizFormData } from './types/quiz';
import { Navbar, type AppRoute } from './components/Navbar';
import { HomeView } from './components/HomeView';
import { GoogleAuthGate } from './components/GoogleAuthGate';
import { QuizEditor } from './components/QuizEditor';
import { QuizPlayerView } from './components/QuizPlayerView';

function createInitialFormData(): QuizFormData {
  return {
    title: '',
    description: '',
    coverImage: DEFAULT_COVER_IMAGE,
    timeLimitMinutes: 0,
    shuffleQuestions: false,
    questions: [
      {
        id: `q_${Date.now().toString(36)}_0`,
        title: '',
        options: ['', '', '', ''],
        correctIndex: 0,
        explanation: '',
      },
    ],
  };
}

function readQuizIdFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  const queryId = params.get('quiz');
  if (queryId) return queryId.trim();

  const hashMatch = window.location.hash.match(/^#?\/quiz\/([a-zA-Z0-9_-]+)/);
  if (hashMatch) return hashMatch[1];

  return null;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  const [route, setRoute] = useState<AppRoute>(() =>
    readQuizIdFromUrl() ? 'play' : 'home'
  );
  const [activeQuizId, setActiveQuizId] = useState<string | null>(() =>
    readQuizIdFromUrl()
  );

  const [userQuizzes, setUserQuizzes] = useState<Quiz[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);

  const [editorInitialData, setEditorInitialData] = useState<QuizFormData>(() =>
    createInitialFormData()
  );
  const [editingQuizId, setEditingQuizId] = useState<string | undefined>(undefined);

  const [sharedQuiz, setSharedQuiz] = useState<Quiz | null>(null);
  const [loadingSharedQuiz, setLoadingSharedQuiz] = useState(false);
  const [sharedQuizError, setSharedQuizError] = useState<string | null>(null);

  // Sync Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
      if (currentUser) {
        upsertUserProfile(currentUser).catch((err) => {
          console.error('Erro ao atualizar perfil do usuário:', err);
        });
      } else {
        setUserQuizzes([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Attach Firestore subscription ONLY when auth is ready and user is authenticated
  useEffect(() => {
    if (!authReady || !user) {
      setLoadingQuizzes(false);
      return;
    }

    setLoadingQuizzes(true);
    const unsubscribe = subscribeUserQuizzes(
      user.uid,
      (list) => {
        setUserQuizzes(list);
        setLoadingQuizzes(false);
      },
      (err) => {
        console.error(err);
        setLoadingQuizzes(false);
      }
    );

    return () => unsubscribe();
  }, [authReady, user]);

  // Load quiz when route is 'play'
  useEffect(() => {
    if (route !== 'play' || !activeQuizId) return;

    let cancelled = false;
    setLoadingSharedQuiz(true);
    setSharedQuizError(null);

    getQuizById(activeQuizId)
      .then((found) => {
        if (cancelled) return;
        if (!found) {
          setSharedQuiz(null);
          setSharedQuizError('Este quiz não existe ou foi removido.');
        } else {
          setSharedQuiz(found);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSharedQuiz(null);
          setSharedQuizError('Não foi possível carregar este quiz.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSharedQuiz(false);
      });

    return () => {
      cancelled = true;
    };
  }, [route, activeQuizId]);

  // Support browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const qId = readQuizIdFromUrl();
      if (qId) {
        setActiveQuizId(qId);
        setRoute('play');
      } else {
        setActiveQuizId(null);
        setRoute('home');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const syncUrlQuizParam = (quizId: string | null) => {
    const url = new URL(window.location.href);
    if (quizId) {
      url.searchParams.set('quiz', quizId);
      url.hash = '';
    } else {
      url.searchParams.delete('quiz');
      url.hash = '';
    }
    window.history.pushState({}, '', url.toString());
  };

  const handleSignIn = async () => {
    setAuthNotice(null);
    setSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setAuthNotice('Login cancelado. Vincule sua conta Google quando quiser criar quizzes.');
      } else if (code === 'auth/popup-blocked') {
        setAuthNotice('O navegador bloqueou a janela do Google. Permita pop-ups e tente novamente.');
      } else {
        setAuthNotice('Não foi possível conectar com o Google agora. Tente novamente.');
      }
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    if (route === 'create') {
      syncUrlQuizParam(null);
      setRoute('home');
    }
  };

  const navigateTo = useCallback((target: AppRoute) => {
    setAuthNotice(null);
    if (target === 'home') {
      syncUrlQuizParam(null);
      setActiveQuizId(null);
      setRoute('home');
      return;
    }
    if (target === 'create') {
      syncUrlQuizParam(null);
      setActiveQuizId(null);
      setEditingQuizId(undefined);
      setEditorInitialData(createInitialFormData());
      setRoute('create');
    }
  }, []);

  const handleEditQuiz = (quiz: Quiz) => {
    syncUrlQuizParam(null);
    setActiveQuizId(null);
    setEditingQuizId(quiz.id);
    setEditorInitialData({
      title: quiz.title,
      description: quiz.description,
      coverImage: quiz.coverImage,
      timeLimitMinutes: quiz.timeLimitMinutes,
      shuffleQuestions: quiz.shuffleQuestions,
      questions: quiz.questions.map((q) => ({
        ...q,
        options: [...q.options],
      })),
    });
    setRoute('create');
  };

  const handlePlayQuiz = (quizId: string) => {
    setActiveQuizId(quizId);
    syncUrlQuizParam(quizId);
    setRoute('play');
  };

  const handleSaveQuiz = async (data: QuizFormData, existingId?: string) => {
    if (!user) {
      throw new Error('Vincule sua conta Google para salvar o quiz.');
    }
    const id = await saveQuiz(user, data, existingId);
    setEditingQuizId(id);
    return id;
  };

  const handleDeleteQuiz = async (quizId: string) => {
    await deleteQuiz(quizId);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar
        activeRoute={route}
        onNavigate={navigateTo}
        user={user}
        authLoading={!authReady}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
      />

      {authNotice && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-8 pt-4">
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs sm:text-sm text-amber-900 flex items-center justify-between gap-4">
            <span>{authNotice}</span>
            <button
              type="button"
              onClick={() => setAuthNotice(null)}
              className="text-amber-800 font-semibold hover:underline shrink-0 cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      <main className="flex-1">
        {route === 'home' && (
          <HomeView
            user={user}
            quizzes={userQuizzes}
            loadingQuizzes={loadingQuizzes}
            onSignIn={handleSignIn}
            onCreateQuiz={() => navigateTo('create')}
            onEditQuiz={handleEditQuiz}
            onPlayQuiz={handlePlayQuiz}
            onDeleteQuiz={handleDeleteQuiz}
          />
        )}

        {route === 'create' &&
          (user ? (
            <QuizEditor
              key={editingQuizId ?? `new_${editorInitialData.title}`}
              user={user}
              initialData={editorInitialData}
              editingQuizId={editingQuizId}
              onSave={handleSaveQuiz}
              onCancel={() => navigateTo('home')}
              onOpenQuiz={handlePlayQuiz}
            />
          ) : (
            <GoogleAuthGate
              title="Vincule sua conta Google para criar quizzes"
              description="Para salvar seus quizzes no menu inicial, editá-los depois, gerar links compartilháveis e exportar PDFs, entre com sua conta Google."
              onSignIn={handleSignIn}
              signingIn={signingIn}
              onBackHome={() => navigateTo('home')}
            />
          ))}

        {route === 'play' && (
          <QuizPlayerView
            quiz={sharedQuiz}
            loading={loadingSharedQuiz}
            error={sharedQuizError}
            user={user}
            onBackHome={() => navigateTo('home')}
            onEditQuiz={handleEditQuiz}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>PrismaQuiz · Criação, compartilhamento por link e exportação em PDF</span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigateTo('home')}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              Início
            </button>
            <button
              type="button"
              onClick={() => navigateTo('create')}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              Criar Quiz
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
