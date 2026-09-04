import React, { useEffect, useRef, useState } from "react";
import { lookupOffBarcode } from "../data/openFoodFactsApi";
import type { FoodItem } from "../data/foodDatabase";
import { InfoBanner } from "../components/UI";

type ScanState = "starting" | "scanning" | "looking-up" | "not-found" | "error";
type ErrorKind = "not-supported" | "permission-denied" | "no-camera" | "lookup-failed";

/** Native BarcodeDetector -- no library needed. Ships in Chrome/Edge/Android everywhere, and Safari 17+
 * (iOS 17+, macOS Sonoma+), which covers this app's real target (an installed iOS PWA) without adding a
 * decoding library to the bundle. Falls back to a plain "not supported, use search instead" message on
 * anything older. */
declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats: string[] }) => {
      detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
    };
  }
}

export default function BarcodeScanner({ onFound, onNotFound, onClose }: { onFound: (food: FoodItem) => void; onNotFound: (barcode: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<ScanState>("starting");
  const [errorKind, setErrorKind] = useState<ErrorKind | null>(null);
  const [lastCode, setLastCode] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    function stopCamera() {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (intervalId) clearInterval(intervalId);
    }

    async function start() {
      if (!window.BarcodeDetector) {
        setErrorKind("not-supported");
        setState("error");
        return;
      }
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      } catch (e) {
        if (!active) return;
        setErrorKind(e instanceof Error && e.name === "NotAllowedError" ? "permission-denied" : "no-camera");
        setState("error");
        return;
      }
      if (!active) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setState("scanning");

      const detector = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_e", "upc_a"] });
      intervalId = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        try {
          const codes = await detector.detect(videoRef.current);
          const code = codes[0]?.rawValue;
          if (code && active) {
            if (intervalId) clearInterval(intervalId);
            stopCamera();
            setLastCode(code);
            setState("looking-up");
            try {
              const food = await lookupOffBarcode(code);
              if (!active) return;
              if (food) onFound(food);
              else {
                setState("not-found");
              }
            } catch {
              if (active) {
                setErrorKind("lookup-failed");
                setState("error");
              }
            }
          }
        } catch {
          // A mid-frame detect() failure (video not ready yet, tab backgrounded) -- just try again next tick.
        }
      }, 350);
    }

    start();
    return () => {
      active = false;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ERROR_COPY: Record<ErrorKind, string> = {
    "not-supported": "Barcode scanning isn't supported in this browser. Search for the food by name instead.",
    "permission-denied": "Camera access was denied. Allow camera access in your browser settings to scan a barcode, or search by name instead.",
    "no-camera": "Couldn't access a camera on this device. Search by name instead.",
    "lookup-failed": "Couldn't look up that barcode — check your connection and try again.",
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="row">
          <div style={{ flex: 1, fontSize: 15, fontFamily: "var(--font-heading)" }}>Scan a barcode</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--color-neutral-400)", cursor: "pointer", display: "flex" }}>
            <i className="ph ph-x" style={{ fontSize: 18 }} />
          </button>
        </div>

        {(state === "starting" || state === "scanning") && (
          <div style={{ position: "relative", borderRadius: "var(--radius-md)", overflow: "hidden", background: "#000", aspectRatio: "4/3" }}>
            <video ref={videoRef} playsInline muted autoPlay style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div
              style={{
                position: "absolute",
                inset: "30% 10%",
                border: "2px solid var(--color-accent)",
                borderRadius: 8,
                boxShadow: "0 0 0 2000px rgba(0,0,0,0.35)",
                pointerEvents: "none",
              }}
            />
            <div className="mu" style={{ position: "absolute", bottom: 10, left: 0, right: 0, textAlign: "center", color: "#fff" }}>
              Line up the barcode in the box
            </div>
          </div>
        )}

        {state === "looking-up" && (
          <div className="mu" style={{ textAlign: "center", padding: 30 }}>Looking up {lastCode}…</div>
        )}

        {state === "not-found" && (
          <>
            <InfoBanner icon="ph-warning">No product found for barcode {lastCode}.</InfoBanner>
            <button className="btn btn-primary btn-block" style={{ height: 46 }} onClick={() => onNotFound(lastCode ?? "")}>
              Enter it manually
            </button>
          </>
        )}

        {state === "error" && errorKind && (
          <>
            <InfoBanner icon="ph-warning">{ERROR_COPY[errorKind]}</InfoBanner>
            <button className="btn btn-secondary btn-block" style={{ height: 44 }} onClick={onClose}>
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
}
