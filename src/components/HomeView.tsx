import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  Clock,
  Copy,
  Edit3,
  FileDown,
  Link2,
  LogIn,
  Play,
  Plus,
  Search,
  Shuffle,
  Trash2,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import type { Quiz } from '../types/quiz';
import { CoverImage } from './CoverImage';
import { exportQuizToPdf } from '../lib/pdfExport';

interface HomeViewProps {
  user: User | null;
  quizzes: Quiz[];
  loadingQuizzes: boolean;
  onSignIn: () => void;
  onCreateQuiz: () => void;
  onEditQuiz: (quiz: Quiz) => void;
  onPlayQuiz: (quizId: string) => void;
  onDeleteQuiz: (quizId: string) => Promise<void>;
}

function extractQuizIdFromInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const url = new URL(trimmed);
      const qParam = url.searchParams.get('quiz');
      if (qParam) return qParam.trim();
      const hashMatch = url.hash.match(/quiz\/([a-zA-Z0-9_-]+)/);
      if (hashMatch) return hashMatch[1];
      const pathMatch = url.pathname.match(/quiz\/([a-zA-Z0-9_-]+)/);
      if (pathMatch) return pathMatch[1];
    }
  } catch {
    // Fallback to raw ID
  }
  return trimmed.replace(/^#?\/?quiz\//, '').replace(/^\?quiz=/, '');
}

export function HomeView({
  user,
  quizzes,
  loadingQuizzes,
  onSignIn,
  onCreateQuiz,
  onEditQuiz,
  onPlayQuiz,
  onDeleteQuiz,
}: HomeViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [linkInput, setLinkInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pdfMenuId, setPdfMenuId] = useState<string | null>(null);

  const filteredQuizzes = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return quizzes.filter((quiz) => {
      return (
        !q ||
        quiz.title.toLowerCase().includes(q) ||
        quiz.description.toLowerCase().includes(q)
      );
    });
  }, [quizzes, searchTerm]);

  const handleCopyLink = async (quizId: string) => {
    const shareUrl = `${window.location.origin}/?quiz=${encodeURIComponent(quizId)}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedId(quizId);
      setTimeout(() => setCopiedId((prev) => (prev === quizId ? null : prev)), 2200);
    } catch {
      window.prompt('Copie o link do quiz abaixo:', shareUrl);
    }
  };

  const handleOpenByLink = (e: React.FormEvent) => {
    e.preventDefault();
    const extracted = extractQuizIdFromInput(linkInput);
    if (extracted) {
      onPlayQuiz(extracted);
    }
  };

  const handleConfirmDelete = async (quizId: string) => {
    setDeletingId(quizId);
    try {
      await onDeleteQuiz(quizId);
      setConfirmDeleteId(null);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 sm:py-14 space-y-14">
      {/* Minimalist Hero & Primary Actions */}
      <section className="grid lg:grid-cols-12 gap-10 items-stretch">
        <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-700">
            <span className="inline-block w-5 h-1 rounded-full bg-emerald-600" />
            <span className="inline-block w-3 h-1 rounded-full bg-sky-600" />
            <span className="inline-block w-2 h-1 rounded-full bg-amber-400" />
            <span className="ml-1 text-slate-600">Criação personalizada · Link rápido · PDF</span>
          </div>

          <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-[1.12] max-w-2xl">
            Crie quizzes com clareza e compartilhe em segundos.
          </h1>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
            Monte provas e desafios personalizados com imagem na capa, tempo limite, múltiplas
            questões e opção de embaralhar perguntas, com exportação em PDF.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onCreateQuiz}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Criar Quiz
            </button>

            {!user && (
              <button
                type="button"
                onClick={onSignIn}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LogIn className="w-4 h-4 text-emerald-700" />
                Vincular conta Google
              </button>
            )}
          </div>
        </div>

        {/* Right Panel: Quick Open by Link (works without account) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
              <Link2 className="w-5 h-5" />
            </div>
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Recebeu um link de quiz?
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Qualquer pessoa pode visualizar, responder e baixar o PDF de um quiz compartilhado por
              link, sem precisar criar conta.
            </p>
          </div>

          <form onSubmit={handleOpenByLink} className="mt-6 space-y-3">
            <label htmlFor="quick-link-input" className="block text-xs font-medium text-slate-700">
              Cole o link ou código do quiz
            </label>
            <div className="flex gap-2">
              <input
                id="quick-link-input"
                type="text"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                placeholder="Ex: https://.../?quiz=qz_..."
                className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-600 focus:bg-white transition-colors"
              />
              <button
                type="submit"
                disabled={!linkInput.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Abrir
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </section>

      <div className="border-t border-slate-200" />

      {/* Saved Quizzes Section (Menu Inicial) */}
      {user ? (
        <section className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold text-slate-900">
                Seus Quizzes Salvos
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Gerencie, edite, exporte em PDF ou compartilhe seus quizzes com um clique.
              </p>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por título..."
                className="pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 w-64"
              />
            </div>
          </div>

          {loadingQuizzes ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[0, 1, 2].map((idx) => (
                <div
                  key={idx}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden animate-pulse"
                >
                  <div className="aspect-[4/3] bg-slate-100" />
                  <div className="p-5 space-y-3">
                    <div className="h-5 bg-slate-100 rounded w-3/4" />
                    <div className="h-3.5 bg-slate-100 rounded w-1/2" />
                    <div className="h-9 bg-slate-100 rounded w-full mt-4" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredQuizzes.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 sm:p-14 text-center">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
                <Plus className="w-6 h-6" />
              </div>
              <h3 className="font-display text-lg font-semibold text-slate-900 mb-2">
                {quizzes.length === 0
                  ? 'Nenhum quiz criado ainda'
                  : 'Nenhum quiz encontrado para essa busca'}
              </h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
                {quizzes.length === 0
                  ? 'Clique em "Criar Quiz" para montar seu primeiro questionário com capa, tempo limite e questões personalizadas.'
                  : 'Tente limpar a busca acima.'}
              </p>
              {quizzes.length === 0 && (
                <button
                  type="button"
                  onClick={onCreateQuiz}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Criar meu primeiro quiz
                </button>
              )}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredQuizzes.map((quiz) => {
                const isConfirmingDelete = confirmDeleteId === quiz.id;
                const isDeleting = deletingId === quiz.id;
                const isCopied = copiedId === quiz.id;
                const isPdfOpen = pdfMenuId === quiz.id;

                return (
                  <article
                    key={quiz.id}
                    className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col transition-shadow hover:shadow-sm"
                  >
                    {/* Cover image (capa) */}
                    <button
                      type="button"
                      onClick={() => onPlayQuiz(quiz.id)}
                      className="aspect-[4/3] w-full overflow-hidden bg-slate-100 block text-left group cursor-pointer"
                    >
                      <CoverImage
                        src={quiz.coverImage}
                        alt={quiz.title}
                        className="transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    </button>

                    {/* Title directly below cover */}
                    <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                      <div>
                        <button
                          type="button"
                          onClick={() => onPlayQuiz(quiz.id)}
                          className="text-left w-full cursor-pointer group"
                        >
                          <h3 className="font-display text-lg font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-2">
                            {quiz.title}
                          </h3>
                        </button>

                        {/* Unboxed clean metadata */}
                        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 tabular-nums">
                          <span>
                            {quiz.questions.length}{' '}
                            {quiz.questions.length === 1 ? 'questão' : 'questões'}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 text-sky-600" />
                            {quiz.timeLimitMinutes > 0
                              ? `${quiz.timeLimitMinutes} min`
                              : 'Sem limite'}
                          </span>
                          {quiz.shuffleQuestions && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1 text-emerald-700">
                                <Shuffle className="w-3 h-3" />
                                Embaralhado
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-3 border-t border-slate-100 space-y-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onPlayQuiz(quiz.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5" />
                            Abrir
                          </button>

                          <button
                            type="button"
                            onClick={() => onEditQuiz(quiz)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopyLink(quiz.id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                              isCopied
                                ? 'border-sky-200 bg-sky-50 text-sky-700'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                Copiado
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-sky-600" />
                                Link
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => setPdfMenuId(isPdfOpen ? null : quiz.id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                              isPdfOpen
                                ? 'border-amber-300 bg-amber-50 text-amber-900'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <FileDown className="w-3.5 h-3.5 text-amber-600" />
                            PDF
                          </button>

                          {!isConfirmingDelete && (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(quiz.id)}
                              aria-label="Excluir quiz"
                              className="ml-auto inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {isPdfOpen && (
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                exportQuizToPdf(quiz, { includeAnswerKey: false });
                                setPdfMenuId(null);
                              }}
                              className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-800 transition-colors whitespace-nowrap cursor-pointer"
                            >
                              Baixar Prova
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                exportQuizToPdf(quiz, { includeAnswerKey: true });
                                setPdfMenuId(null);
                              }}
                              className="flex-1 px-2.5 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-xs font-medium text-amber-900 transition-colors whitespace-nowrap cursor-pointer"
                            >
                              Com Gabarito
                            </button>
                          </div>
                        )}

                        {isConfirmingDelete && (
                          <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                            <span className="text-rose-700 font-medium">Excluir este quiz?</span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => handleConfirmDelete(quiz.id)}
                                className="px-2.5 py-1 rounded-md bg-rose-600 text-white font-semibold hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
                              >
                                {isDeleting ? 'Excluindo...' : 'Confirmar'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2.5 py-1 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        <section className="grid md:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-2.5">
            <span className="font-mono text-xs font-semibold text-emerald-700">01.</span>
            <h3 className="font-display text-base font-semibold text-slate-900">
              Criação sob medida
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Vincule sua conta Google para criar e salvar quizzes com título, múltiplas questões e
              alternativas de resposta.
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-2.5">
            <span className="font-mono text-xs font-semibold text-sky-700">02.</span>
            <h3 className="font-display text-base font-semibold text-slate-900">
              Capa, tempo e ordem
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Personalize a imagem da capa, defina tempo limite opcional e escolha se as perguntas
              devem ser embaralhadas ou não.
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-2.5">
            <span className="font-mono text-xs font-semibold text-amber-700">03.</span>
            <h3 className="font-display text-base font-semibold text-slate-900">
              Link rápido e PDF
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Compartilhe por link para qualquer pessoa responder sem conta, ou baixe em PDF limpo
              com ou sem gabarito.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
