import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Check,
  Clock,
  Copy,
  Edit3,
  FileDown,
  Play,
  RotateCcw,
  Shuffle,
  X,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import type { Quiz, QuizQuestion } from '../types/quiz';
import { CoverImage } from './CoverImage';
import { exportQuizToPdf } from '../lib/pdfExport';

interface QuizPlayerViewProps {
  quiz: Quiz | null;
  loading: boolean;
  error: string | null;
  user: User | null;
  onBackHome: () => void;
  onEditQuiz: (quiz: Quiz) => void;
}

type ViewMode = 'overview' | 'playing' | 'results' | 'reading';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function formatSeconds(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function QuizPlayerView({
  quiz,
  loading,
  error,
  user,
  onBackHome,
  onEditQuiz,
}: QuizPlayerViewProps) {
  const [mode, setMode] = useState<ViewMode>('overview');
  const [activeQuestions, setActiveQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);

  const isOwner = Boolean(user && quiz && user.uid === quiz.authorId);

  const startQuiz = useCallback(() => {
    if (!quiz) return;
    const prepared = quiz.shuffleQuestions
      ? shuffleArray(quiz.questions)
      : [...quiz.questions];
    setActiveQuestions(prepared);
    setCurrentIndex(0);
    setAnswers({});
    setElapsedSeconds(0);
    setSecondsLeft(quiz.timeLimitMinutes > 0 ? quiz.timeLimitMinutes * 60 : null);
    setMode('playing');
  }, [quiz]);

  const finishQuiz = useCallback(() => {
    setMode('results');
  }, []);

  useEffect(() => {
    if (mode !== 'playing') return;
    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
      setSecondsLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          setMode('results');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [mode]);

  const scoreSummary = useMemo(() => {
    let correct = 0;
    activeQuestions.forEach((q) => {
      if (answers[q.id] === q.correctIndex) {
        correct++;
      }
    });
    const total = activeQuestions.length || 1;
    const percentage = Math.round((correct / total) * 100);
    return { correct, total: activeQuestions.length, percentage };
  }, [activeQuestions, answers]);

  const handleCopyLink = async () => {
    if (!quiz) return;
    const shareUrl = `${window.location.origin}/?quiz=${encodeURIComponent(quiz.id)}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    } catch {
      window.prompt('Copie o link do quiz:', shareUrl);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-14 space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-slate-200 rounded" />
        <div className="aspect-[16/9] max-h-72 w-full bg-slate-200 rounded-2xl" />
        <div className="h-8 w-2/3 bg-slate-200 rounded" />
        <div className="h-4 w-1/2 bg-slate-200 rounded" />
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 space-y-4">
          <h1 className="font-display text-xl font-bold text-slate-900">
            Quiz não encontrado
          </h1>
          <p className="text-sm text-slate-600">
            {error || 'O link pode estar incorreto ou este quiz foi removido pelo criador.'}
          </p>
          <button
            type="button"
            onClick={onBackHome}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao início
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-8">
      {/* Top Breadcrumb + Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBackHome}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar ao início
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-sky-700 hover:bg-sky-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedLink ? 'Link copiado!' : 'Compartilhar link'}
          </button>

          <button
            type="button"
            onClick={() => exportQuizToPdf(quiz, { includeAnswerKey: false })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5 text-amber-600" />
            PDF Prova
          </button>

          <button
            type="button"
            onClick={() => exportQuizToPdf(quiz, { includeAnswerKey: true })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5 text-emerald-600" />
            PDF Gabarito
          </button>

          {isOwner && (
            <button
              type="button"
              onClick={() => onEditQuiz(quiz)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Editar
            </button>
          )}
        </div>
      </div>

      {/* Mode 1: Overview */}
      {mode === 'overview' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="grid md:grid-cols-12 items-stretch">
            <div className="md:col-span-5 aspect-[4/3] md:aspect-auto md:min-h-[260px] bg-slate-100">
              <CoverImage src={quiz.coverImage} alt={quiz.title} />
            </div>

            <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between gap-6">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 tabular-nums">
                  <span>Por {quiz.authorName}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {quiz.questions.length}{' '}
                    {quiz.questions.length === 1 ? 'questão' : 'questões'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-sky-600" />
                    {quiz.timeLimitMinutes > 0
                      ? `${quiz.timeLimitMinutes} min`
                      : 'Sem limite de tempo'}
                  </span>
                  {quiz.shuffleQuestions && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <Shuffle className="w-3.5 h-3.5" />
                        Ordem embaralhada
                      </span>
                    </>
                  )}
                </div>

                <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
                  {quiz.title}
                </h1>

                {quiz.description && (
                  <p className="text-sm text-slate-600 leading-relaxed">{quiz.description}</p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={startQuiz}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Play className="w-4 h-4" />
                  Iniciar Quiz
                </button>
                <button
                  type="button"
                  onClick={() => setMode('reading')}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 text-sky-600" />
                  Visualizar Questões
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode 2: Interactive Playing */}
      {mode === 'playing' && activeQuestions.length > 0 && (
        <div className="space-y-6">
          {/* Progress & Timer Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between gap-4 text-xs font-medium text-slate-600">
              <span className="font-display font-semibold text-slate-900 truncate">
                {quiz.title}
              </span>
              <div className="flex items-center gap-4 shrink-0 font-mono tabular-nums">
                <span>
                  Questão {currentIndex + 1}/{activeQuestions.length}
                </span>
                {secondsLeft !== null && (
                  <span
                    className={`inline-flex items-center gap-1.5 font-semibold ${
                      secondsLeft <= 60 ? 'text-rose-600' : 'text-sky-700'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    {formatSeconds(secondsLeft)}
                  </span>
                )}
              </div>
            </div>

            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 to-sky-600 transition-all duration-200"
                style={{
                  width: `${Math.round(((currentIndex + 1) / activeQuestions.length) * 100)}%`,
                }}
              />
            </div>
          </div>

          {/* Active Question Card */}
          {(() => {
            const currentQ = activeQuestions[currentIndex];
            const selectedOpt = answers[currentQ.id];
            return (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
                <div className="space-y-2">
                  <span className="font-mono text-xs font-semibold text-emerald-700 tabular-nums">
                    QUESTÃO {String(currentIndex + 1).padStart(2, '0')}
                  </span>
                  <h2 className="font-display text-xl sm:text-2xl font-semibold text-slate-900 leading-snug">
                    {currentQ.title}
                  </h2>
                </div>

                <div className="space-y-3">
                  {currentQ.options.map((opt, optIdx) => {
                    const isSelected = selectedOpt === optIdx;
                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() =>
                          setAnswers((prev) => ({ ...prev, [currentQ.id]: optIdx }))
                        }
                        className={`w-full text-left p-4 rounded-xl border transition-all flex items-center gap-3.5 cursor-pointer ${
                          isSelected
                            ? 'border-sky-600 bg-sky-50/70 ring-1 ring-sky-600'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                        }`}
                      >
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                            isSelected
                              ? 'bg-sky-600 text-white'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {OPTION_LETTERS[optIdx] ?? optIdx + 1}
                        </span>
                        <span className="text-sm sm:text-base text-slate-900">{opt}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    Anterior
                  </button>

                  {currentIndex < activeQuestions.length - 1 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentIndex((i) => Math.min(activeQuestions.length - 1, i + 1))
                      }
                      className="px-5 py-2.5 rounded-xl bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 transition-colors cursor-pointer"
                    >
                      Próxima
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={finishQuiz}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors cursor-pointer"
                    >
                      Finalizar Quiz
                    </button>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Mode 3: Results Summary */}
      {mode === 'results' && (
        <div className="space-y-8">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-emerald-700">Resultado final</span>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">
                {scoreSummary.correct} de {scoreSummary.total} acertos ({scoreSummary.percentage}%)
              </h2>
              <p className="text-sm text-slate-600 font-mono tabular-nums">
                Tempo utilizado: {formatSeconds(elapsedSeconds)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={startQuiz}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Tentar novamente
              </button>
              <button
                type="button"
                onClick={() => setMode('overview')}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Capa do Quiz
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-display text-lg font-bold text-slate-900">
              Revisão das respostas
            </h3>
            {activeQuestions.map((q, idx) => {
              const userChoice = answers[q.id];
              const isCorrect = userChoice === q.correctIndex;
              return (
                <div
                  key={q.id}
                  className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="font-display text-base font-semibold text-slate-900">
                      {idx + 1}. {q.title}
                    </h4>
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-semibold shrink-0 ${
                        isCorrect ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {isCorrect ? (
                        <>
                          <Check className="w-4 h-4" /> Correta
                        </>
                      ) : (
                        <>
                          <X className="w-4 h-4" /> Incorreta
                        </>
                      )}
                    </span>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-2.5">
                    {q.options.map((opt, optIdx) => {
                      const chosen = userChoice === optIdx;
                      const correctOpt = q.correctIndex === optIdx;
                      let style = 'border-slate-200 bg-slate-50 text-slate-700';
                      if (correctOpt) {
                        style = 'border-emerald-500 bg-emerald-50 text-emerald-950 font-medium';
                      } else if (chosen && !correctOpt) {
                        style = 'border-rose-400 bg-rose-50 text-rose-950';
                      }
                      return (
                        <div
                          key={optIdx}
                          className={`px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm flex items-center gap-2 ${style}`}
                        >
                          <span className="font-mono font-bold">
                            {OPTION_LETTERS[optIdx] ?? optIdx + 1})
                          </span>
                          <span>{opt}</span>
                        </div>
                      );
                    })}
                  </div>

                  {q.explanation && (
                    <p className="text-xs text-sky-800 bg-sky-50 border border-sky-100 rounded-xl p-3">
                      <strong>Explicação:</strong> {q.explanation}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mode 4: Reading / Observation Mode (no account needed) */}
      {mode === 'reading' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-slate-900">{quiz.title}</h1>
              {quiz.description && (
                <p className="text-sm text-slate-600 mt-1">{quiz.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={startQuiz}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Play className="w-4 h-4" />
              Responder agora
            </button>
          </div>

          <div className="space-y-4">
            {quiz.questions.map((q, idx) => (
              <div
                key={q.id}
                className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
              >
                <h3 className="font-display text-base font-semibold text-slate-900">
                  {idx + 1}. {q.title}
                </h3>
                <div className="grid sm:grid-cols-2 gap-2.5">
                  {q.options.map((opt, optIdx) => (
                    <div
                      key={optIdx}
                      className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-sm text-slate-800 flex items-center gap-2.5"
                    >
                      <span className="font-mono text-xs font-bold text-slate-500">
                        {OPTION_LETTERS[optIdx] ?? optIdx + 1})
                      </span>
                      <span>{opt}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
