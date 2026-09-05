import React, { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType, NotFoundException } from "@zxing/library";
import { lookupOffBarcode } from "../data/openFoodFactsApi";
import type { FoodItem } from "../data/foodDatabase";
import { InfoBanner } from "../components/UI";

type ScanState = "starting" | "scanning" | "looking-up" | "not-found" | "error";
type ErrorKind = "permission-denied" | "no-camera" | "lookup-failed";

/** A real decoding library (zxing), not the native BarcodeDetector API -- that API is Chromium-only
 * (Chrome/Edge/Android WebView/Samsung Internet); Safari has never shipped it, on iOS or macOS, despite
 * this file's earlier comment claiming otherwise. This app's real target is an installed iOS PWA, so a
 * pure-JS decoder that works via canvas frame analysis (works in any browser with camera access) is the
 * only option that actually functions there. */
const HINTS = new Map();
HINTS.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E]);

export default function BarcodeScanner({ onFound, onNotFound, onClose }: { onFound: (food: FoodItem) => void; onNotFound: (barcode: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [state, setState] = useState<ScanState>("starting");
  const [errorKind, setErrorKind] = useState<ErrorKind | null>(null);
  const [lastCode, setLastCode] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    function stopCamera() {
      controlsRef.current?.stop();
      controlsRef.current = null;
    }

    async function start() {
      const reader = new BrowserMultiFormatReader(HINTS);
      let sawFirstFrame = false;
      try {
        const controls = await reader.decodeFromConstraints({ video: { facingMode: "environment" } }, videoRef.current!, (result, error) => {
          if (!active) return;
          if (!sawFirstFrame) {
            sawFirstFrame = true;
            setState("scanning");
          }
          if (!result) {
            // NotFoundException fires on every frame with no decodable barcode in view -- completely
            // normal while the camera's just pointed at a countertop, not a real error to surface.
            if (error && !(error instanceof NotFoundException)) return;
            return;
          }
          const code = result.getText();
          stopCamera();
          setLastCode(code);
          setState("looking-up");
          lookupOffBarcode(code)
            .then((food) => {
              if (!active) return;
              if (food) onFound(food);
              else setState("not-found");
            })
            .catch(() => {
              if (active) {
                setErrorKind("lookup-failed");
                setState("error");
              }
            });
        });
        if (!active) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
      } catch (e) {
        if (!active) return;
        setErrorKind(e instanceof Error && e.name === "NotAllowedError" ? "permission-denied" : "no-camera");
        setState("error");
      }
    }

    start();
    return () => {
      active = false;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ERROR_COPY: Record<ErrorKind, string> = {
    "permission-denied": "Camera access was denied. Allow camera access in your browser settings to scan a barcode, or search by name instead.",
    "no-camera": "Couldn't access a camera on this device. Search by name instead.",
    "lookup-failed": "Couldn't look up that barcode — check your connection and try again.",
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="row">
          <div style={{ flex: 1, fontSize: 14, fontFamily: "var(--font-heading)" }}>Scan a barcode</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--color-neutral-400)", cursor: "pointer", display: "flex" }}>
            <i className="ph ph-x" style={{ fontSize: 16 }} />
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
            <button className="btn btn-primary btn-block" style={{ height: 48 }} onClick={() => onNotFound(lastCode ?? "")}>
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
