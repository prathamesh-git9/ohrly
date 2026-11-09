import type { LangCode } from '../domain/types';

/**
 * Speech plays pre-generated files when we have them and falls back to the browser's own voices.
 * The manifest maps a stable text key to a file under public/audio; see scripts/gen_audio.py.
 */

type Manifest = Record<string, string>;

const LOCALES: Record<LangCode, string> = {
  en: 'en-GB',
  de: 'de-DE',
  es: 'es-ES',
  fr: 'fr-FR',
  it: 'it-IT',
  hi: 'hi-IN',
};

const manifests = new Map<LangCode, Promise<Manifest>>();
let current: HTMLAudioElement | null = null;
let voicesEnabled = true;
let playToken = 0;

export function setVoicesEnabled(on: boolean): void {
  voicesEnabled = on;
  if (!on) stopSpeech();
}

/** The key must match scripts/gen_audio.py: trimmed text with its whitespace collapsed. */
export function audioKey(text: string): string {
  return text.normalize('NFC').trim().replace(/\s+/g, ' ');
}

function audioUrl(path: string): string {
  return `${import.meta.env.BASE_URL}audio/${path}`;
}

function manifestFor(lang: LangCode): Promise<Manifest> {
  let m = manifests.get(lang);
  if (!m) {
    m = fetch(audioUrl(`${lang}/manifest.json`))
      .then((r) => (r.ok ? (r.json() as Promise<Manifest>) : {}))
      .catch(() => ({}));
    manifests.set(lang, m);
  }
  return m;
}

export function preloadVoice(lang: LangCode): void {
  void manifestFor(lang);
}

export function stopSpeech(): void {
  if (current) {
    current.pause();
    current = null;
  }
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

function pickVoice(locale: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  const lang = locale.slice(0, 2);
  const inLang = voices.filter((v) => v.lang.toLowerCase().startsWith(lang));
  // Natural and Google voices are clearly better than the OS defaults, where they exist.
  return (
    inLang.find((v) => /natural|neural|online/i.test(v.name)) ??
    inLang.find((v) => /google/i.test(v.name)) ??
    inLang.find((v) => v.lang.replace('_', '-') === locale) ??
    inLang[0] ??
    null
  );
}

function speakWithBrowser(text: string, lang: LangCode, slow: boolean): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) return resolve();
    const utter = new SpeechSynthesisUtterance(text);
    const locale = LOCALES[lang];
    utter.lang = locale;
    const voice = pickVoice(locale);
    if (voice) utter.voice = voice;
    utter.rate = slow ? 0.6 : 0.95;
    utter.onend = () => resolve();
    utter.onerror = () => resolve();
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  });
}

/** Resolves when playback ends. Never rejects: missing audio must not break a lesson. */
export async function speak(text: string, lang: LangCode, slow = false): Promise<void> {
  if (!voicesEnabled) return;
  stopSpeech();
  // A newer request may arrive while the manifest loads; only the latest one may play.
  const token = ++playToken;
  const manifest = await manifestFor(lang);
  if (token !== playToken) return;
  const file = manifest[audioKey(text)];
  if (!file) return speakWithBrowser(text, lang, slow);

  const el = new Audio(audioUrl(`${lang}/${file}`));
  el.playbackRate = slow ? 0.7 : 1;
  // Keep the pitch natural when slowed down, so it sounds like careful speech, not a slow tape.
  el.preservesPitch = true;
  current = el;
  return new Promise((resolve) => {
    el.onended = () => resolve();
    el.onerror = () => {
      void speakWithBrowser(text, lang, slow).then(resolve);
    };
    el.play().catch(() => {
      // Autoplay blocked or decode failed. The learner can still tap the speaker.
      resolve();
    });
  });
}

/* --------------------------- Speech recognition --------------------------- */

interface RecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface RecognitionEventLike {
  results: ArrayLike<RecognitionResultLike>;
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((e: RecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

function recognitionCtor(): (new () => Recognition) | null {
  const w = window as unknown as Record<string, unknown>;
  return ((w.SpeechRecognition ?? w.webkitSpeechRecognition) as new () => Recognition) ?? null;
}

export function canRecognizeSpeech(): boolean {
  return typeof window !== 'undefined' && recognitionCtor() !== null;
}

export interface Listening {
  stop(): void;
}

export function listen(
  lang: LangCode,
  onText: (text: string, final: boolean) => void,
  onEnd: (error?: string) => void,
): Listening | null {
  const Ctor = recognitionCtor();
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = LOCALES[lang];
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  rec.continuous = false;
  let error: string | undefined;
  rec.onresult = (e) => {
    const results = Array.from(e.results);
    const text = results.map((r) => r[0].transcript).join(' ');
    onText(text, results[results.length - 1]?.isFinal ?? false);
  };
  rec.onerror = (e) => {
    error = e.error;
  };
  rec.onend = () => onEnd(error);
  try {
    rec.start();
  } catch {
    return null;
  }
  return { stop: () => rec.stop() };
}
