import { Lock, LogIn } from 'lucide-react';

interface GoogleAuthGateProps {
  title: string;
  description: string;
  onSignIn: () => void;
  signingIn: boolean;
  onBackHome: () => void;
}

export function GoogleAuthGate({
  title,
  description,
  onSignIn,
  signingIn,
  onBackHome,
}: GoogleAuthGateProps) {
  return (
    <section className="max-w-xl mx-auto py-16 px-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-10 text-center">
        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-5">
          <Lock className="w-5 h-5" />
        </div>
        <h1 className="font-display text-2xl font-bold text-slate-900 mb-3">{title}</h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-8">{description}</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            disabled={signingIn}
            onClick={onSignIn}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            {signingIn ? 'Conectando...' : 'Vincular conta Google'}
          </button>
          <button
            type="button"
            onClick={onBackHome}
            className="w-full sm:w-auto px-5 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Voltar ao início
          </button>
        </div>
      </div>
    </section>
  );
}
