import { useState } from 'react';
import { BookOpen } from 'lucide-react';

interface CoverImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function CoverImage({ src, alt, className = '' }: CoverImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-sky-50 to-amber-50 text-slate-500 p-4 ${className}`}
      >
        <div className="w-11 h-11 rounded-xl bg-white/90 border border-slate-200/80 flex items-center justify-center text-emerald-700 mb-2">
          <BookOpen className="w-5 h-5" />
        </div>
        <span className="text-xs font-medium text-slate-600 text-center line-clamp-2 max-w-[18ch]">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`w-full h-full object-cover ${className}`}
    />
  );
}
