export interface QuizQuestion {
  id: string;
  title: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  timeLimitMinutes: number;
  shuffleQuestions: boolean;
  questions: QuizQuestion[];
  questionCount: number;
  authorId: string;
  authorName: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface QuizFormData {
  title: string;
  description: string;
  coverImage: string;
  timeLimitMinutes: number;
  shuffleQuestions: boolean;
  questions: QuizQuestion[];
}

// Validation constants synchronized verbatim with firebase-blueprint.json
export const QUIZ_CONSTRAINTS = {
  MAX_TITLE_LENGTH: 140,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_COVER_LENGTH: 260000,
  MAX_TIME_LIMIT_MINUTES: 180,
  MIN_QUESTIONS: 1,
  MAX_QUESTIONS: 50,
  MAX_QUESTION_TITLE_LENGTH: 400,
  MIN_OPTIONS: 2,
  MAX_OPTIONS: 6,
  MAX_OPTION_LENGTH: 240,
  MAX_EXPLANATION_LENGTH: 500,
  MAX_AUTHOR_NAME_LENGTH: 100,
  ID_PATTERN: /^[a-zA-Z0-9_-]+$/,
} as const;
