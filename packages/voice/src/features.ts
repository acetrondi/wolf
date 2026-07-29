const HEDGE_RE =
  /\b(could|might|potentially|possibly|arguably|perhaps|maybe|somewhat|fairly|relatively)\b/gi;
const CONTRACTION_RE = /\b\w+'\w+\b/g;
const EMOJI_RE = /\p{Extended_Pictographic}/gu;
const POV_I_RE = /\b(I|I'm|I've|I'll|I'd|me|my|mine)\b/g;
const POV_WE_RE = /\b(we|we're|we've|we'll|we'd|us|our|ours)\b/gi;
const POV_YOU_RE = /\b(you|you're|you've|you'll|you'd|your|yours)\b/gi;
const EM_DASH_RE = /—|–/g;
const LIST_LINE_RE = /^[\s]*[-*•]\s+/m;

function splitSentences(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  return normalized
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function splitParagraphs(text: string): string[][] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  return normalized
    .split(/\n\s*\n/)
    .map((p) => splitSentences(p))
    .filter((p) => p.length > 0);
}

function countMatches(text: string, re: RegExp): number {
  return [...text.matchAll(re)].length;
}

/** Flesch reading ease — deterministic, en-only heuristic. */
function readingEase(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  const sentences = Math.max(splitSentences(text).length, 1);
  const syllables = text
    .toLowerCase()
    .split(/\s+/)
    .reduce((sum, word) => sum + Math.max(1, word.replace(/[^aeiouy]/g, "").length), 0);
  if (words === 0) return 0;
  return 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
}

export function extractFeatures(text: string): {
  sentences: number;
  avgSentenceWords: number;
  sentenceVariance: number;
  contractionRate: number;
  emojiCount: number;
  emDashPer150: number;
  povCounts: { i: number; we: number; you: number };
  hedgeDensity: number;
  listRatio: number;
  readingEase: number;
  avgParagraphSentences: number;
} {
  const normalized = text.replace(/\r\n/g, "\n");
  const sentences = splitSentences(normalized);
  const words = normalized.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const sentenceCount = Math.max(sentences.length, 1);
  const lengths = sentences.map((s) => s.split(/\s+/).filter(Boolean).length);
  const mean = lengths.reduce((a, b) => a + b, 0) / Math.max(lengths.length, 1);
  const variance =
    lengths.length > 1
      ? lengths.reduce((sum, len) => sum + (len - mean) ** 2, 0) / lengths.length
      : 0;

  const paragraphs = splitParagraphs(normalized);
  const avgParagraphSentences =
    paragraphs.length > 0
      ? paragraphs.reduce((sum, p) => sum + p.length, 0) / paragraphs.length
      : 0;

  const listLines = (normalized.match(LIST_LINE_RE) ?? []).length;
  const lineCount = Math.max(normalized.split("\n").length, 1);

  return {
    sentences: sentences.length,
    avgSentenceWords: wordCount / sentenceCount,
    sentenceVariance: variance,
    contractionRate:
      wordCount > 0 ? countMatches(normalized, CONTRACTION_RE) / wordCount : 0,
    emojiCount: countMatches(normalized, EMOJI_RE),
    emDashPer150:
      wordCount > 0 ? (countMatches(normalized, EM_DASH_RE) / wordCount) * 150 : 0,
    povCounts: {
      i: countMatches(normalized, POV_I_RE),
      we: countMatches(normalized, POV_WE_RE),
      you: countMatches(normalized, POV_YOU_RE),
    },
    hedgeDensity: wordCount > 0 ? countMatches(normalized, HEDGE_RE) / wordCount : 0,
    listRatio: listLines / lineCount,
    readingEase: readingEase(normalized),
    avgParagraphSentences,
  };
}

export function aggregateFeatures(samples: { body: string }[]) {
  if (!samples.length) return null;
  const rows = samples.map((s) => extractFeatures(s.body));
  const n = rows.length;
  return {
    avgSentenceWords: rows.reduce((s, r) => s + r.avgSentenceWords, 0) / n,
    sentenceVariance: rows.reduce((s, r) => s + r.sentenceVariance, 0) / n,
    contractionRate: rows.reduce((s, r) => s + r.contractionRate, 0) / n,
    hedgeDensity: rows.reduce((s, r) => s + r.hedgeDensity, 0) / n,
    emojiCount: rows.reduce((s, r) => s + r.emojiCount, 0) / n,
    readingEase: rows.reduce((s, r) => s + r.readingEase, 0) / n,
    avgParagraphSentences: rows.reduce((s, r) => s + r.avgParagraphSentences, 0) / n,
  };
}
