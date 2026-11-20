import { QUIZ_CONSTRAINTS } from '../types/quiz';

export interface CoverPreset {
  id: string;
  label: string;
  src: string;
  accent: string;
}

export const COVER_PRESETS: CoverPreset[] = [
  {
    id: 'botanical',
    label: 'Botânica Geométrica',
    src: '/src/assets/images/cover_botanical_geometry_1795203475750.jpg',
    accent: 'emerald',
  },
  {
    id: 'tech',
    label: 'Grade Translúcida',
    src: '/src/assets/images/cover_tech_grid_1795203475658.jpg',
    accent: 'sky',
  },
  {
    id: 'arch',
    label: 'Arcos & Sol',
    src: '/src/assets/images/cover_history_arch_1795203475800.jpg',
    accent: 'amber',
  },
  {
    id: 'prism',
    label: 'Prisma Editorial',
    src: '/src/assets/images/cover_creative_prism_1795203476704.jpg',
    accent: 'emerald',
  },
];

export const DEFAULT_COVER_IMAGE = COVER_PRESETS[0].src;

export function isSafeCoverImage(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.length > QUIZ_CONSTRAINTS.MAX_COVER_LENGTH) return false;
  if (trimmed.startsWith('/src/assets/images/')) return true;
  if (trimmed.startsWith('https://')) return true;
  if (/^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(trimmed)) return true;
  return false;
}

export async function compressImageToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Selecione um arquivo de imagem válido (PNG, JPG ou WebP).');
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('A imagem é muito grande. Escolha um arquivo de até 10 MB.');
  }

  const bitmapUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Não foi possível ler a imagem selecionada.'));
      image.src = bitmapUrl;
    });

    const maxWidth = 800;
    const maxHeight = 600;
    let width = img.naturalWidth || maxWidth;
    let height = img.naturalHeight || maxHeight;

    const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
    width = Math.max(1, Math.round(width * ratio));
    height = Math.max(1, Math.round(height * ratio));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Não foi possível processar a imagem no navegador.');
    }
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    let quality = 0.82;
    let dataUrl = canvas.toDataURL('image/jpeg', quality);
    while (dataUrl.length > 220000 && quality > 0.35) {
      quality -= 0.12;
      dataUrl = canvas.toDataURL('image/jpeg', quality);
    }

    if (dataUrl.length > QUIZ_CONSTRAINTS.MAX_COVER_LENGTH) {
      throw new Error('Não foi possível comprimir a imagem abaixo do limite permitido.');
    }

    return dataUrl;
  } finally {
    URL.revokeObjectURL(bitmapUrl);
  }
}
