import { useEffect, useRef, useState } from "react";

/** Speech-to-text for the instruction boxes, using the browser's own recogniser.
 *
 * Worth knowing before relying on this: iOS Safari's keyboard already has a dictation mic, and that works
 * everywhere, always, including in an installed PWA. This hook is the in-app button on top of that -- nicer
 * when it works, and deliberately invisible when it doesn't, because `webkitSpeechRecognition` is
 * unevenly supported and has a history of not working at all in home-screen PWAs. `supported` being false
 * is a normal outcome, not an error: the textarea and the keyboard mic still do the job. */
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
}

function recognizerClass(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useDictation(onText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<SpeechRecognitionLike | null>(null);
  // Held in a ref so the recogniser's callbacks always reach the current handler rather than the one
  // captured when listening started -- these fire seconds later, after several renders.
  const sink = useRef(onText);
  sink.current = onText;

  const supported = recognizerClass() !== null;

  useEffect(() => {
    return () => {
      ref.current?.abort();
      ref.current = null;
    };
  }, []);

  function stop() {
    ref.current?.stop();
    setListening(false);
  }

  function start() {
    const Recognizer = recognizerClass();
    if (!Recognizer) return;
    setError(null);

    const rec = new Recognizer();
    rec.lang = navigator.language || "en-US";
    rec.continuous = false;
    // Final results only: an instruction box that rewrites itself mid-sentence is harder to read than one
    // that fills in when you stop talking.
    rec.interimResults = false;

    rec.onresult = (e: any) => {
      const text = Array.from(e.results as ArrayLike<any>)
        .map((r: any) => r[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (text) sink.current(text);
    };
    rec.onerror = (e: any) => {
      setListening(false);
      if (e?.error === "not-allowed" || e?.error === "service-not-allowed") {
        setError("Microphone access is off for this site — turn it on in your browser settings.");
      } else if (e?.error !== "aborted" && e?.error !== "no-speech") {
        setError("Couldn't catch that. Try again, or type it.");
      }
    };
    rec.onend = () => setListening(false);

    ref.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }

  return { supported, listening, error, start, stop, toggle: () => (listening ? stop() : start()) };
}
