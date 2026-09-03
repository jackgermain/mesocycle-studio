import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllLifts, useStore } from "../state/store";
import { CloseHeader } from "../components/UI";

export default function AllLifts() {
  const { state } = useStore();
  const nav = useNavigate();
  const [query, setQuery] = useState("");
  const lifts = useMemo(() => getAllLifts(state.program), [state.program]);
  const grouped = useMemo(() => {
    const filtered = lifts.filter((l) => l.name.toLowerCase().includes(query.toLowerCase()));
    const byMuscle = new Map<string, typeof filtered>();
    for (const l of filtered) {
      if (!byMuscle.has(l.muscle)) byMuscle.set(l.muscle, []);
      byMuscle.get(l.muscle)!.push(l);
    }
    return Array.from(byMuscle.entries());
  }, [lifts, query]);

  return (
    <div className="screen">
      <CloseHeader kicker={`${lifts.length} exercises assigned so far`} title="All lifts" />
      <div className="screen-scroll">
        <div className="input row" style={{ height: 38, gap: 8, color: "var(--color-neutral-600)" }}>
          <i className="ph ph-magnifying-glass" style={{ fontSize: 15 }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search exercises"
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: "var(--color-text)", fontSize: 14 }}
          />
        </div>

        {grouped.map(([muscle, items]) => (
          <div key={muscle}>
            <div className="sh">{muscle}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {items.map((l) => (
                <button key={l.name} className="link-row" style={{ padding: "11px 12px" }} onClick={() => nav(`/progress/lifts/${encodeURIComponent(l.name)}`)}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      flex: "none",
                      borderRadius: 7,
                      background: "var(--color-neutral-900)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--color-neutral-500)",
                    }}
                  >
                    <i className={l.hasVideo ? "ph-fill ph-play-circle" : "ph ph-barbell"} style={{ fontSize: 16, color: l.hasVideo ? "var(--color-accent)" : "var(--color-neutral-500)" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="trunc" style={{ fontSize: 13.5 }}>{l.name}</div>
                    <div className="mu" style={{ marginTop: 1 }}>
                      {l.occurrences} session{l.occurrences === 1 ? "" : "s"} · {l.lastLoggedTopSet ?? "not logged yet"}
                    </div>
                  </div>
                  <i className="ph ph-caret-right" style={{ fontSize: 15, color: "var(--color-neutral-600)" }} />
                </button>
              ))}
            </div>
          </div>
        ))}

        {grouped.length === 0 && <div className="mu">No exercises match “{query}”.</div>}
      </div>
    </div>
  );
}
