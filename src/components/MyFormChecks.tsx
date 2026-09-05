import React, { useEffect, useState } from "react";
import { formCheckVideoUrl, listFormChecks, type FormCheck } from "../shared/formChecks";

/** The client's own form checks and whatever their coach said back.
 *
 * Without this the loop only runs one way -- you send a video and it disappears. The answer is what was
 * actually being asked for, so it needs somewhere to land that isn't a chat thread it scrolls out of. */
export function MyFormChecks({ coachName }: { coachName: string }) {
  const [checks, setChecks] = useState<FormCheck[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listFormChecks().then((rows) => active && setChecks(rows));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setUrl(null);
    const open = checks.find((c) => c.id === openId);
    if (open) formCheckVideoUrl(open.video_path).then((u) => active && setUrl(u));
    return () => {
      active = false;
    };
  }, [openId, checks]);

  if (!checks.length) return null;

  return (
    <div>
      <div className="sh">Form checks</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {checks.map((c) => {
          const open = openId === c.id;
          return (
            <div key={c.id} className="cell elev-sm">
              <button
                onClick={() => setOpenId(open ? null : c.id)}
                className="row"
                style={{ width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer", color: "inherit", textAlign: "left" }}
              >
                <i
                  className={`ph-fill ${c.answered_at ? "ph-check-circle" : "ph-clock"}`}
                  style={{ fontSize: 17, flex: "none", color: c.answered_at ? "var(--color-accent)" : "var(--color-text-faint)" }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="trunc" style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>{c.exercise_name}</div>
                  <div className="mu trunc" style={{ marginTop: 1 }}>
                    {c.answered_at ? `${coachName.split(" ")[0]} replied` : `Waiting on ${coachName.split(" ")[0]}`}
                    {c.day_label ? ` · ${c.day_label}` : ""}
                  </div>
                </div>
                <i className={`ph ph-caret-${open ? "up" : "down"}`} style={{ fontSize: 13, color: "var(--color-neutral-600)", flex: "none" }} />
              </button>

              {open && (
                <div style={{ marginTop: 10 }}>
                  {url ? (
                    <video src={url} controls playsInline style={{ width: "100%", borderRadius: "var(--radius-sm)", background: "var(--color-surface-sunken)", maxHeight: "40vh" }} />
                  ) : (
                    <div className="mu">Loading the clip…</div>
                  )}
                  {c.note && <div className="mu" style={{ marginTop: 8 }}>You asked: {c.note}</div>}
                  {c.coach_reply && (
                    <div className="cell" style={{ marginTop: 8, borderLeft: "2px solid var(--color-accent)", background: "var(--color-surface-raised)" }}>
                      <div className="scr" style={{ color: "var(--color-accent-300)", marginBottom: 3 }}>{coachName}</div>
                      <div style={{ fontSize: "var(--text-sm)", lineHeight: 1.55 }}>{c.coach_reply}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
