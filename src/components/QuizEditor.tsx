import { useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Clock,
  Copy,
  FileDown,
  ImagePlus,
  Play,
  Plus,
  Save,
  Shuffle,
  Trash2,
  X,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  QUIZ_CONSTRAINTS,
  type Quiz,
  type QuizFormData,
  type QuizQuestion,
} from '../types/quiz';
import {
  COVER_PRESETS,
  DEFAULT_COVER_IMAGE,
  compressImageToDataUrl,
  isSafeCoverImage,
} from '../lib/imageUtils';
import { CoverImage } from './CoverImage';
import { exportQuizToPdf } from '../lib/pdfExport';

interface QuizEditorProps {
  user: User;
  initialData: QuizFormData;
  editingQuizId?: string;
  onSave: (data: QuizFormData, existingId?: string) => Promise<string>;
  onCancel: () => void;
  onOpenQuiz: (quizId: string) => void;
}

function createEmptyQuestion(index: number): QuizQuestion {
  return {
    id: `q_${Date.now().toString(36)}_${index}_${Math.random().toString(36).slice(2, 6)}`,
    title: '',
    options: ['', '', '', ''],
    correctIndex: 0,
    explanation: '',
  };
}

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

export function QuizEditor({
  user,
  initialData,
  editingQuizId,
  onSave,
  onCancel,
  onOpenQuiz,
}: QuizEditorProps) {
  const [title, setTitle] = useState(initialData.title);
  const [description, setDescription] = useState(initialData.description);
  const [coverImage, setCoverImage] = useState(initialData.coverImage || DEFAULT_COVER_IMAGE);
  const [customUrlInput, setCustomUrlInput] = useState(
    initialData.coverImage.startsWith('https://') ? initialData.coverImage : ''
  );
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number>(initialData.timeLimitMinutes);
  const [shuffleQuestions, setShuffleQuestions] = useState<boolean>(initialData.shuffleQuestions);
  const [questions, setQuestions] = useState<QuizQuestion[]>(
    initialData.questions.length > 0 ? initialData.questions : [createEmptyQuestion(0)]
  );

  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedQuizId, setSavedQuizId] = useState<string | null>(editingQuizId ?? null);
  const [justSaved, setJustSaved] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMessage(null);
    setUploadingCover(true);
    try {
      const dataUrl = await compressImageToDataUrl(file);
      setCoverImage(dataUrl);
      setCustomUrlInput('');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Erro ao processar imagem.');
    } finally {
      setUploadingCover(false);
      e.target.value = '';
    }
  };

  const handleApplyUrlCover = () => {
    const url = customUrlInput.trim();
    if (!url) return;
    if (!isSafeCoverImage(url)) {
      setErrorMessage('Informe uma URL de imagem válida começando com https://.');
      return;
    }
    setErrorMessage(null);
    setCoverImage(url);
  };

  const updateQuestion = (index: number, patch: Partial<QuizQuestion>) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  };

  const updateOption = (qIndex: number, optIndex: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        const nextOptions = q.options.map((opt, oi) => (oi === optIndex ? value : opt));
        return { ...q, options: nextOptions };
      })
    );
  };

  const addOption = (qIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex || q.options.length >= QUIZ_CONSTRAINTS.MAX_OPTIONS) return q;
        return { ...q, options: [...q.options, ''] };
      })
    );
  };

  const removeOption = (qIndex: number, optIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex || q.options.length <= QUIZ_CONSTRAINTS.MIN_OPTIONS) return q;
        const nextOptions = q.options.filter((_, oi) => oi !== optIndex);
        let nextCorrect = q.correctIndex;
        if (optIndex === q.correctIndex) {
          nextCorrect = 0;
        } else if (optIndex < q.correctIndex) {
          nextCorrect = q.correctIndex - 1;
        }
        return { ...q, options: nextOptions, correctIndex: nextCorrect };
      })
    );
  };

  const addQuestion = () => {
    if (questions.length >= QUIZ_CONSTRAINTS.MAX_QUESTIONS) {
      setErrorMessage(`Limite máximo de ${QUIZ_CONSTRAINTS.MAX_QUESTIONS} questões atingido.`);
      return;
    }
    setQuestions((prev) => [...prev, createEmptyQuestion(prev.length)]);
  };

  const duplicateQuestion = (index: number) => {
    if (questions.length >= QUIZ_CONSTRAINTS.MAX_QUESTIONS) return;
    const source = questions[index];
    const copy: QuizQuestion = {
      ...source,
      id: `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      options: [...source.options],
    };
    setQuestions((prev) => {
      const next = [...prev];
      next.splice(index + 1, 0, copy);
      return next;
    });
  };

  const moveQuestion = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= questions.length) return;
    setQuestions((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next;
    });
  };

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) {
      setErrorMessage('O quiz precisa ter pelo menos uma questão.');
      return;
    }
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const buildCurrentQuizPreview = (): Quiz => ({
    id: savedQuizId || 'preview',
    title: title.trim() || 'Quiz sem título',
    description: description.trim(),
    coverImage,
    timeLimitMinutes,
    shuffleQuestions,
    questions: questions.map((q, idx) => ({
      ...q,
      title: q.title.trim() || `Questão ${idx + 1}`,
      options: q.options.map((o, oi) => o.trim() || `Alternativa ${oi + 1}`),
    })),
    questionCount: questions.length,
    authorId: user.uid,
    authorName: user.displayName || 'Criador',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setJustSaved(false);
    setSaving(true);
    try {
      const id = await onSave(
        {
          title,
          description,
          coverImage,
          timeLimitMinutes,
          shuffleQuestions,
          questions,
        },
        savedQuizId ?? undefined
      );
      setSavedQuizId(id);
      setJustSaved(true);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Não foi possível salvar o quiz.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyShareLink = async () => {
    if (!savedQuizId) return;
    const shareUrl = `${window.location.origin}/?quiz=${encodeURIComponent(savedQuizId)}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    } catch {
      window.prompt('Copie o link do quiz:', shareUrl);
    }
  };

  return (
    <form onSubmit={handleSave} className="max-w-5xl mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-10">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="space-y-1">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors mb-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar ao menu inicial
          </button>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
            {savedQuizId ? 'Editar Quiz' : 'Criar Novo Quiz'}
          </h1>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => exportQuizToPdf(buildCurrentQuizPreview(), { includeAnswerKey: false })}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileDown className="w-4 h-4 text-amber-600" />
            Exportar PDF
          </button>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar Quiz'}
          </button>
        </div>
      </div>

      {/* Feedback Alerts */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-800 flex items-center justify-between gap-4">
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {justSaved && savedQuizId && (
        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="font-display font-semibold text-emerald-950 text-sm">
              Quiz salvo no menu inicial!
            </p>
            <p className="text-xs text-emerald-800 mt-0.5">
              Agora você pode compartilhar por link rápido, baixar em PDF ou testar agora.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyShareLink}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-emerald-200 text-xs font-semibold text-sky-700 hover:bg-sky-50 transition-colors whitespace-nowrap cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedLink ? 'Link copiado!' : 'Copiar Link'}
            </button>
            <button
              type="button"
              onClick={() => exportQuizToPdf(buildCurrentQuizPreview(), { includeAnswerKey: true })}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-emerald-200 text-xs font-semibold text-amber-800 hover:bg-amber-50 transition-colors whitespace-nowrap cursor-pointer"
            >
              <FileDown className="w-3.5 h-3.5" />
              PDF c/ Gabarito
            </button>
            <button
              type="button"
              onClick={() => onOpenQuiz(savedQuizId)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              Abrir Quiz
            </button>
          </div>
        </div>
      )}

      {/* Quiz Settings & Cover */}
      <section className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left: Title, Description, Timer & Shuffle */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="quiz-title" className="text-sm font-semibold text-slate-900">
                Título do Quiz <span className="text-rose-600">*</span>
              </label>
              <span className="text-xs font-mono text-slate-400 tabular-nums">
                {title.length}/{QUIZ_CONSTRAINTS.MAX_TITLE_LENGTH}
              </span>
            </div>
            <input
              id="quiz-title"
              type="text"
              required
              maxLength={QUIZ_CONSTRAINTS.MAX_TITLE_LENGTH}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Fundamentos de Biologia Celular"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="quiz-desc" className="text-sm font-semibold text-slate-900">
                Descrição ou instruções
              </label>
              <span className="text-xs font-mono text-slate-400 tabular-nums">
                {description.length}/{QUIZ_CONSTRAINTS.MAX_DESCRIPTION_LENGTH}
              </span>
            </div>
            <textarea
              id="quiz-desc"
              rows={2}
              maxLength={QUIZ_CONSTRAINTS.MAX_DESCRIPTION_LENGTH}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Opcional: adicione contexto ou orientações para quem for responder."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-colors resize-none"
            />
          </div>

          {/* Time Limit */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-900 inline-flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-600" />
                Tempo limite
              </span>
              <span className="text-xs font-mono text-slate-500 tabular-nums">
                {timeLimitMinutes > 0 ? `${timeLimitMinutes} min` : 'Sem limite'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {[0, 5, 10, 15, 30, 60].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTimeLimitMinutes(preset)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    timeLimitMinutes === preset
                      ? 'bg-sky-600 border-sky-600 text-white'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {preset === 0 ? 'Sem limite' : `${preset} min`}
                </button>
              ))}
              <div className="flex items-center gap-1.5 ml-auto">
                <label htmlFor="custom-time" className="text-xs text-slate-500">
                  Outro (min):
                </label>
                <input
                  id="custom-time"
                  type="number"
                  min={0}
                  max={QUIZ_CONSTRAINTS.MAX_TIME_LIMIT_MINUTES}
                  value={timeLimitMinutes}
                  onChange={(e) =>
                    setTimeLimitMinutes(
                      Math.min(
                        QUIZ_CONSTRAINTS.MAX_TIME_LIMIT_MINUTES,
                        Math.max(0, Number(e.target.value) || 0)
                      )
                    )
                  }
                  className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-mono text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-sky-600"
                />
              </div>
            </div>
          </div>

          {/* Shuffle Questions Option */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="text-sm font-semibold text-slate-900 inline-flex items-center gap-2">
                <Shuffle className="w-4 h-4 text-emerald-600" />
                Embaralhar perguntas
              </div>
              <p className="text-xs text-slate-500">
                Quando ativado, a ordem das questões muda aleatoriamente a cada tentativa.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={shuffleQuestions}
              onClick={() => setShuffleQuestions((prev) => !prev)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                shuffleQuestions ? 'bg-emerald-600' : 'bg-slate-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                  shuffleQuestions ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Right: Cover Image Picker */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-900">Imagem na capa</span>
            <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer">
              <ImagePlus className="w-3.5 h-3.5" />
              {uploadingCover ? 'Processando...' : 'Enviar arquivo'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleCoverUpload}
                className="sr-only"
              />
            </label>
          </div>

          <div className="aspect-[4/3] w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
            <CoverImage src={coverImage} alt={title || 'Prévia da capa'} />
          </div>

          {/* Curated cover presets */}
          <div>
            <p className="text-xs font-medium text-slate-500 mb-2">Capas prontas</p>
            <div className="grid grid-cols-4 gap-2">
              {COVER_PRESETS.map((preset) => {
                const selected = coverImage === preset.src;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    title={preset.label}
                    onClick={() => {
                      setCoverImage(preset.src);
                      setCustomUrlInput('');
                    }}
                    className={`aspect-[4/3] rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                      selected
                        ? 'border-emerald-600 ring-2 ring-emerald-600/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <img
                      src={preset.src}
                      alt={preset.label}
                      className="w-full h-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional HTTPS URL */}
          <div className="flex gap-2 pt-1">
            <input
              type="url"
              value={customUrlInput}
              onChange={(e) => setCustomUrlInput(e.target.value)}
              placeholder="Ou cole uma URL https://..."
              className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
            />
            <button
              type="button"
              onClick={handleApplyUrlCover}
              disabled={!customUrlInput.trim()}
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Aplicar
            </button>
          </div>
        </div>
      </section>

      {/* Questions Builder Section (directly below) */}
      <section className="space-y-6 pt-4 border-t border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900">
              Questões e Alternativas{' '}
              <span className="font-mono text-sm font-medium text-slate-500 tabular-nums ml-1">
                ({questions.length}/{QUIZ_CONSTRAINTS.MAX_QUESTIONS})
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Preencha o título de cada questão, defina as alternativas e marque a resposta correta.
            </p>
          </div>

          <button
            type="button"
            onClick={addQuestion}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-600 text-white text-xs font-semibold hover:bg-sky-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Adicionar questão
          </button>
        </div>

        <div className="space-y-6">
          {questions.map((question, qIndex) => (
            <div
              key={question.id}
              className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5"
            >
              {/* Question Toolbar */}
              <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-100">
                <span className="font-display text-sm font-bold text-slate-900 tabular-nums">
                  {String(qIndex + 1).padStart(2, '0')}. Questão
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={qIndex === 0}
                    onClick={() => moveQuestion(qIndex, -1)}
                    title="Mover para cima"
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={qIndex === questions.length - 1}
                    onClick={() => moveQuestion(qIndex, 1)}
                    title="Mover para baixo"
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => duplicateQuestion(qIndex)}
                    title="Duplicar questão"
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeQuestion(qIndex)}
                    title="Remover questão"
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Question Title */}
              <div>
                <label
                  htmlFor={`q-title-${question.id}`}
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Título da questão <span className="text-rose-600">*</span>
                </label>
                <input
                  id={`q-title-${question.id}`}
                  type="text"
                  required
                  maxLength={QUIZ_CONSTRAINTS.MAX_QUESTION_TITLE_LENGTH}
                  value={question.title}
                  onChange={(e) => updateQuestion(qIndex, { title: e.target.value })}
                  placeholder="Digite o enunciado da pergunta..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-colors"
                />
              </div>

              {/* Alternatives */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">
                    Alternativas de resposta (selecione a correta)
                  </span>
                  {question.options.length < QUIZ_CONSTRAINTS.MAX_OPTIONS && (
                    <button
                      type="button"
                      onClick={() => addOption(qIndex)}
                      className="text-xs font-semibold text-sky-700 hover:text-sky-800 cursor-pointer"
                    >
                      + Adicionar alternativa
                    </button>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  {question.options.map((opt, optIndex) => {
                    const isCorrect = question.correctIndex === optIndex;
                    return (
                      <div
                        key={optIndex}
                        className={`flex items-center gap-2 p-2 rounded-xl border transition-colors ${
                          isCorrect
                            ? 'border-emerald-500 bg-emerald-50/60'
                            : 'border-slate-200 bg-slate-50/60'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => updateQuestion(qIndex, { correctIndex: optIndex })}
                          title={
                            isCorrect ? 'Alternativa correta' : 'Marcar como alternativa correta'
                          }
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors cursor-pointer ${
                            isCorrect
                              ? 'bg-emerald-600 text-white'
                              : 'bg-white border border-slate-300 text-slate-600 hover:border-emerald-500'
                          }`}
                        >
                          {isCorrect ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            OPTION_LABELS[optIndex] ?? optIndex + 1
                          )}
                        </button>

                        <input
                          type="text"
                          required
                          maxLength={QUIZ_CONSTRAINTS.MAX_OPTION_LENGTH}
                          value={opt}
                          onChange={(e) => updateOption(qIndex, optIndex, e.target.value)}
                          placeholder={`Alternativa ${OPTION_LABELS[optIndex] ?? optIndex + 1}`}
                          className="flex-1 min-w-0 px-2 py-1.5 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                        />

                        {question.options.length > QUIZ_CONSTRAINTS.MIN_OPTIONS && (
                          <button
                            type="button"
                            onClick={() => removeOption(qIndex, optIndex)}
                            title="Remover alternativa"
                            className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Optional Explanation */}
              <div>
                <label
                  htmlFor={`q-exp-${question.id}`}
                  className="block text-xs font-medium text-slate-500 mb-1"
                >
                  Explicação da resposta (opcional)
                </label>
                <input
                  id={`q-exp-${question.id}`}
                  type="text"
                  maxLength={QUIZ_CONSTRAINTS.MAX_EXPLANATION_LENGTH}
                  value={question.explanation ?? ''}
                  onChange={(e) => updateQuestion(qIndex, { explanation: e.target.value })}
                  placeholder="Exibida após o participante responder à questão."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-600 focus:bg-white"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA Strip */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
          <button
            type="button"
            onClick={addQuestion}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 text-sm font-medium hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-sky-600" />
            Adicionar mais uma questão
          </button>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando quiz...' : 'Salvar Quiz'}
          </button>
        </div>
      </section>
    </form>
  );
}
