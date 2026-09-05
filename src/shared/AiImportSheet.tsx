import React, { useRef, useState } from "react";
import { InfoBanner } from "../components/UI";
import { AI_ACCEPT, parseProgramWithAi, prepareFile, type AiProgramResult } from "./aiImport";

/** Import a program from a photo, screenshot or PDF, with an instruction in plain English. The point of
 * the instruction box is that most real programs need reshaping, not just reading -- a coach has a 2-day
 * plan on paper and wants it run four days a week -- and describing that is far quicker than rebuilding
 * it by hand afterwards.
 *
 * Nothing is written from here. The parsed days go back to the caller's existing import preview, which is
 * where they were always reviewed and accepted, so an AI reading mistake gets caught in the same place a
 * spreadsheet typo would. */
export function AiImportSheet({ onParsed, onClose }: { onParsed: (result: AiProgramResult, sourceLabel: string) => void; onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (picked.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const prepared = await Promise.all(picked.map(prepareFile));
      const result = await parseProgramWithAi(prepared);
      const label = picked.length === 1 ? picked[0].name : `${picked.length} files`;
      onParsed(result, label);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't work. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sheet-backdrop" onClick={busy ? undefined : onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "88%", overflowY: "auto" }}>
        <div className="row" style={{ marginBottom: 4 }}>
          <div style={{ flex: 1 }}>
            <div className="scr">Import</div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>From a photo or PDF</div>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-neutral-500)" }}
          >
            <i className="ph ph-x" style={{ fontSize: 18 }} />
          </button>
        </div>

        <div className="mu" style={{ lineHeight: 1.55 }}>
          A photo of a written program, a screenshot, or a PDF. It gets read exactly as written — reshape it afterwards with Edit&nbsp;with&nbsp;AI.
        </div>

        {error && <InfoBanner icon="ph-warning">{error}</InfoBanner>}

        <input
          ref={fileRef}
          type="file"
          accept={AI_ACCEPT}
          multiple
          style={{ display: "none" }}
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length) {
              setPicked(files);
              setError(null);
            }
            // Reset so picking the same file twice in a row still fires a change event.
            e.target.value = "";
          }}
        />

        <button className="link-row" style={{ padding: "12px 12px" }} disabled={busy} onClick={() => fileRef.current?.click()}>
          <i className="ph ph-image" style={{ fontSize: 16, color: "var(--color-accent-300)" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13 }}>{picked.length === 0 ? "Choose photos or a PDF" : `${picked.length} file${picked.length === 1 ? "" : "s"} selected`}</div>
            <div className="mu trunc" style={{ marginTop: 1 }}>
              {picked.length === 0 ? "Camera roll, files, or take a photo" : picked.map((f) => f.name).join(", ")}
            </div>
          </div>
        </button>

        <button
          className="btn btn-primary btn-block"
          style={{ height: 46, opacity: picked.length && !busy ? 1 : 0.5 }}
          disabled={picked.length === 0 || busy}
          onClick={run}
        >
          <i className={busy ? "ph ph-circle-notch" : "ph ph-sparkle"} style={{ fontSize: 15 }} />
          {busy ? "Reading it…" : "Build the program"}
        </button>
        {busy && <div className="mu" style={{ textAlign: "center", marginTop: 8 }}>This can take up to a minute for a multi-page PDF.</div>}
        <div className="mu" style={{ textAlign: "center", marginTop: 8, lineHeight: 1.5 }}>
          You'll see everything it read before anything is saved.
        </div>
      </div>
    </div>
  );
}
