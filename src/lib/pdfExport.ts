import { jsPDF } from 'jspdf';
import type { Quiz } from '../types/quiz';

interface ExportPdfOptions {
  includeAnswerKey: boolean;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

function slugifyTitle(title: string): string {
  return (
    title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'quiz'
  );
}

export function exportQuizToPdf(quiz: Quiz, options: ExportPdfOptions): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 18;
  const contentWidth = pageWidth - marginX * 2;
  let cursorY = 18;

  const ensureSpace = (neededHeight: number) => {
    if (cursorY + neededHeight > pageHeight - 18) {
      doc.addPage();
      cursorY = 18;
    }
  };

  // Top tri-color minimalist accent bar (Emerald, Cerulean, Yellow)
  const segmentWidth = contentWidth / 3;
  doc.setFillColor(5, 150, 105); // #059669
  doc.rect(marginX, 12, segmentWidth, 1.8, 'F');
  doc.setFillColor(2, 132, 199); // #0284C7
  doc.rect(marginX + segmentWidth, 12, segmentWidth, 1.8, 'F');
  doc.setFillColor(234, 179, 8); // #EAB308
  doc.rect(marginX + segmentWidth * 2, 12, segmentWidth, 1.8, 'F');

  cursorY = 22;

  // Brand + metadata line
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(5, 150, 105);
  doc.text('PRISMAQUIZ', marginX, cursorY);

  const metaParts: string[] = [
    `${quiz.questions.length} ${quiz.questions.length === 1 ? 'questão' : 'questões'}`,
    quiz.timeLimitMinutes > 0 ? `Tempo limite: ${quiz.timeLimitMinutes} min` : 'Sem tempo limite',
    quiz.shuffleQuestions ? 'Ordem embaralhada' : 'Ordem fixa',
  ];
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(metaParts.join('  ·  '), pageWidth - marginX, cursorY, { align: 'right' });

  cursorY += 8;

  // Quiz Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  const titleLines = doc.splitTextToSize(quiz.title, contentWidth) as string[];
  doc.text(titleLines, marginX, cursorY);
  cursorY += titleLines.length * 7.2 + 2;

  // Description
  if (quiz.description.trim()) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(71, 85, 105);
    const descLines = doc.splitTextToSize(quiz.description.trim(), contentWidth) as string[];
    doc.text(descLines, marginX, cursorY);
    cursorY += descLines.length * 5 + 3;
  }

  // Name/Date fill line for printable test
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Autor: ${quiz.authorName}`, marginX, cursorY);
  if (!options.includeAnswerKey) {
    doc.text('Participante: ______________________________________   Data: ___/___/_____', marginX, cursorY + 6);
    cursorY += 10;
  } else {
    cursorY += 4;
  }

  // Hairline divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
  cursorY += 9;

  // Questions
  quiz.questions.forEach((question, qIndex) => {
    const qHeader = `${qIndex + 1}. ${question.title}`;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    const qLines = doc.splitTextToSize(qHeader, contentWidth) as string[];

    const estimatedOptionsHeight = question.options.reduce((acc, opt) => {
      const optLines = doc.splitTextToSize(`${OPTION_LETTERS[0]}) ${opt}`, contentWidth - 10) as string[];
      return acc + optLines.length * 4.8 + 1.5;
    }, 0);

    ensureSpace(qLines.length * 5.2 + estimatedOptionsHeight + 8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(qLines, marginX, cursorY);
    cursorY += qLines.length * 5.2 + 2.5;

    question.options.forEach((option, optIdx) => {
      const letter = OPTION_LETTERS[optIdx] ?? String(optIdx + 1);
      const isCorrect = options.includeAnswerKey && optIdx === question.correctIndex;
      const prefix = isCorrect ? `[${letter}]` : `( ${letter} )`;
      const optText = `${prefix}  ${option}`;

      doc.setFont('helvetica', isCorrect ? 'bold' : 'normal');
      doc.setFontSize(10);
      if (isCorrect) {
        doc.setTextColor(5, 150, 105);
      } else {
        doc.setTextColor(51, 65, 85);
      }

      const optLines = doc.splitTextToSize(optText, contentWidth - 6) as string[];
      ensureSpace(optLines.length * 4.8 + 2);
      doc.text(optLines, marginX + 4, cursorY);
      cursorY += optLines.length * 4.8 + 1.4;
    });

    if (options.includeAnswerKey && question.explanation?.trim()) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(2, 132, 199);
      const expLines = doc.splitTextToSize(
        `Explicação: ${question.explanation.trim()}`,
        contentWidth - 6
      ) as string[];
      ensureSpace(expLines.length * 4.5 + 3);
      doc.text(expLines, marginX + 4, cursorY + 1);
      cursorY += expLines.length * 4.5 + 2;
    }

    cursorY += 5;
  });

  // Compact Answer Key table at the end if includeAnswerKey
  if (options.includeAnswerKey) {
    ensureSpace(24);
    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
    cursorY += 7;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('Resumo do Gabarito', marginX, cursorY);
    cursorY += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    const summaryItems = quiz.questions.map(
      (q, idx) => `${idx + 1}: ${OPTION_LETTERS[q.correctIndex] ?? '?'}`
    );
    const summaryText = doc.splitTextToSize(summaryItems.join('   |   '), contentWidth) as string[];
    doc.text(summaryText, marginX, cursorY);
  }

  const suffix = options.includeAnswerKey ? '-gabarito' : '';
  doc.save(`${slugifyTitle(quiz.title)}${suffix}.pdf`);
}
