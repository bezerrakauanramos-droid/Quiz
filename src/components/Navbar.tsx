import { LogIn, LogOut } from 'lucide-react';
import type { User } from 'firebase/auth';

export type AppRoute = 'home' | 'create' | 'play';

interface NavbarProps {
  activeRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  user: User | null;
  authLoading: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}

export function Navbar({
  activeRoute,
  onNavigate,
  user,
  authLoading,
  onSignIn,
  onSignOut,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-element Brand wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 flex items-center gap-2.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-md"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="w-6 h-6 shrink-0"
            fill="none"
          >
            <rect x="2" y="3" width="6" height="18" rx="2" fill="#059669" />
            <rect x="9" y="6" width="6" height="15" rx="2" fill="#0284C7" />
            <rect x="16" y="10" width="6" height="11" rx="2" fill="#EAB308" />
          </svg>
          <span>PrismaQuiz</span>
        </button>

        {/* Zone 2: Concise single-line navigation links */}
        <nav
          aria-label="Navegação principal"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600"
        >
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className={`py-1 whitespace-nowrap shrink-0 transition-colors border-b-2 cursor-pointer ${
              activeRoute === 'home'
                ? 'text-slate-900 border-emerald-600'
                : 'border-transparent hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            Início
          </button>
          <button
            type="button"
            onClick={() => onNavigate('create')}
            className={`py-1 whitespace-nowrap shrink-0 transition-colors border-b-2 cursor-pointer ${
              activeRoute === 'create'
                ? 'text-slate-900 border-emerald-600'
                : 'border-transparent hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            Criar Quiz
          </button>
        </nav>

        {/* Zone 3: Single primary auth action */}
        <div className="flex items-center shrink-0">
          {authLoading ? (
            <div className="h-9 w-32 rounded-lg bg-slate-100 animate-pulse" />
          ) : user ? (
            <button
              type="button"
              onClick={onSignOut}
              title={`Conectado como ${user.displayName || 'Usuário'} — Clique para sair`}
              className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Conta Google'}
                  referrerPolicy="no-referrer"
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px] font-bold">
                  {(user.displayName || 'U').slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="max-w-[130px] truncate">{user.displayName || 'Conta Google'}</span>
              <LogOut className="w-3.5 h-3.5 text-slate-400" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              Entrar com Google
            </button>
          )}
        </div>
      </div>

      {/* Mobile compact secondary nav */}
      <div className="md:hidden border-t border-slate-100 px-4 py-2 flex items-center justify-around text-xs font-medium text-slate-600">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className={`px-3 py-1.5 rounded-md whitespace-nowrap shrink-0 ${
            activeRoute === 'home' ? 'text-emerald-700 bg-emerald-50 font-semibold' : ''
          }`}
        >
          Início
        </button>
        <button
          type="button"
          onClick={() => onNavigate('create')}
          className={`px-3 py-1.5 rounded-md whitespace-nowrap shrink-0 ${
            activeRoute === 'create' ? 'text-emerald-700 bg-emerald-50 font-semibold' : ''
          }`}
        >
          Criar Quiz
        </button>
      </div>
    </header>
  );
}
