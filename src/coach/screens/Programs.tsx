import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCoachStore } from "../store";
import { CoachTabBar } from "../components/CoachTabBar";
import { HeroHeader, HeroStat } from "../../components/UI";
import { LOAD_LABELS } from "../loadMode";
import { buildBlankProgram } from "../mockData";
import type { CoachProgram } from "../types";

type Filter = "templates" | "drafts";

export default function Programs() {
  const { state, dispatch } = useCoachStore();
  const nav = useNavigate();
  const [filter, setFilter] = useState<Filter>("templates");
  const [publishing, setPublishing] = useState<CoachProgram | null>(null);
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [choosing, setChoosing] = useState(false);
  const [naming, setNaming] = useState(false);
  const [newName, setNewName] = useState("");

  // Two buckets, no overlap: a program you've explicitly saved ("Save as a personal template") lives
  // under Templates -- your real, reusable library. Everything else -- still being built, backing a
  // client's live assignment but never promoted, or just started and not yet finished -- lives under
  // Drafts, visible there so "save as draft" (see ProgramDetail's leave prompt) is actually resumable
  // instead of vanishing.
  const templates = state.programs.filter((p) => p.isTemplate);
  const drafts = state.programs.filter((p) => !p.isTemplate);
  const filtered = filter === "templates" ? templates : drafts;

  function openPublish(p: CoachProgram) {
    setVisibility(p.visibility === "public" ? "public" : "private");
    setPublishing(p);
  }

  function confirmPublish() {
    if (!publishing) return;
    dispatch({ type: "PUBLISH_PROGRAM", programId: publishing.id, visibility });
    dispatch({
      type: "SHOW_TOAST",
      message: `${publishing.name} published — week 1 locked, clients notified.${publishing.isTemplate ? "" : visibility === "public" ? " Listed publicly." : ""}`,
    });
    setTimeout(() => dispatch({ type: "CLEAR_TOAST" }), 3000);
    setPublishing(null);
  }

  function createFromScratch() {
    const name = newName.trim() || "New Program";
    const program = { ...buildBlankProgram(name), pendingUnsaved: true };
    dispatch({ type: "ADD_PROGRAM", program });
    setNaming(false);
    setNewName("");
    nav(`/coach/programs/${program.id}`);
  }

  return (
    <div className="screen">
      <HeroHeader
        title="Programs"
        right={
          <div className="row" style={{ gap: 8, flex: "none" }}>
            <button className="btn btn-secondary btn-icon" aria-label="Browse the exercise library" onClick={() => nav("/coach/library")}>
              <i className="ph ph-barbell" style={{ fontSize: 17 }} />
            </button>
            <button className="btn btn-secondary btn-icon" aria-label="Add a program" onClick={() => setChoosing(true)}>
              <i className="ph ph-plus" style={{ fontSize: 17 }} />
            </button>
          </div>
        }
      >
        <HeroStat value={state.programs.length} label="programs">
          <div className="row" style={{ fontSize: 12 }}>
            <span style={{ flex: 1, color: "var(--color-neutral-400)" }}>Templates</span>
            <span style={{ fontFamily: "var(--font-heading)", color: "var(--color-accent-300)" }}>{templates.length}</span>
          </div>
          <div className="row" style={{ fontSize: 12 }}>
            <span style={{ flex: 1, color: "var(--color-neutral-400)" }}>Drafts</span>
            <span style={{ fontFamily: "var(--font-heading)", color: "var(--color-neutral-200)" }}>{drafts.length}</span>
          </div>
        </HeroStat>
      </HeroHeader>
      <div className="screen-scroll">
        <div className="row" style={{ gap: 6 }}>
          <button className={`chip${filter === "templates" ? " on" : ""}`} onClick={() => setFilter("templates")}>Templates {templates.length}</button>
          <button className={`chip${filter === "drafts" ? " on" : ""}`} onClick={() => setFilter("drafts")}>Drafts {drafts.length}</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((p) => (
            <div key={p.id} className="cell elev-sm">
              <div className="row">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row" style={{ gap: 6 }}>
                    <div style={{ fontSize: 15, fontFamily: "var(--font-heading)", fontWeight: 500 }}>{p.name}</div>
                    {p.isTemplate && (
                      <span className="tag tag-outline" style={{ flex: "none" }}>
                        <i className="ph ph-lock-simple" style={{ fontSize: 10, marginRight: 3 }} />
                        Template
                      </span>
                    )}
                  </div>
                  <div className="mu" style={{ marginTop: 2 }}>
                    {p.weeks} weeks · {p.daysPerWeek} days · {LOAD_LABELS[p.effortScale]}
                  </div>
                </div>
                <span className={`tag ${p.status === "published" ? "tag-accent" : "tag-neutral"}`}>{p.status}</span>
              </div>
              <div className="row" style={{ gap: 3, marginTop: 11 }}>
                {p.phaseWeights.map((w, i) => (
                  <div
                    key={i}
                    style={{
                      flex: w,
                      height: 6,
                      borderRadius: 3,
                      background: i === 0 ? "var(--color-accent)" : i === 1 ? "var(--color-accent-600)" : "var(--color-accent-800)",
                      opacity: p.status === "draft" ? 0.35 : 1,
                    }}
                  />
                ))}
              </div>
              <div className="row" style={{ marginTop: 10, fontSize: 11.5, color: "var(--color-neutral-500)" }}>
                <span>{p.isTemplate ? "Not assignable to a client — save a copy first" : `${p.assignedCount} assigned`}</span>
                <span style={{ marginLeft: "auto" }}>{p.weeklySets} sets/wk</span>
              </div>
              <div className="row" style={{ gap: 8, marginTop: 10 }}>
                <button className="btn btn-secondary" style={{ flex: 1, height: 36, fontSize: 12.5 }} onClick={() => nav(`/coach/programs/${p.id}`)}>
                  Open builder
                </button>
                {p.status === "draft" && (
                  <button className="btn btn-primary" style={{ flex: "none", height: 36, fontSize: 12.5 }} onClick={() => openPublish(p)}>
                    Publish
                  </button>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="mu">No programs here yet.</div>}
        </div>
      </div>
      <CoachTabBar />

      {choosing && (
        <div className="sheet-backdrop" onClick={() => setChoosing(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="h1" style={{ fontSize: 20, marginBottom: 4 }}>Add a program</div>
            <p className="mu" style={{ fontSize: 12.5, lineHeight: 1.6, marginBottom: 14 }}>Start from a PDF or screenshots you already have, or build one from a blank week right here.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                className="cell row"
                style={{ padding: 13, textAlign: "left", cursor: "pointer" }}
                onClick={() => {
                  setChoosing(false);
                  nav("/coach/programs/import");
                }}
              >
                <i className="ph ph-file-arrow-up" style={{ fontSize: 20, color: "var(--color-accent)", flex: "none" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontFamily: "var(--font-heading)" }}>Import a program</div>
                  <div className="mu" style={{ marginTop: 1 }}>PDF or screenshots</div>
                </div>
                <i className="ph ph-caret-right" style={{ fontSize: 15, color: "var(--color-neutral-600)" }} />
              </button>
              <button
                className="cell row"
                style={{ padding: 13, textAlign: "left", cursor: "pointer" }}
                onClick={() => {
                  setChoosing(false);
                  setNaming(true);
                }}
              >
                <i className="ph ph-plus-circle" style={{ fontSize: 20, color: "var(--color-accent)", flex: "none" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontFamily: "var(--font-heading)" }}>Build from scratch</div>
                  <div className="mu" style={{ marginTop: 1 }}>Start with a blank week and add exercises yourself</div>
                </div>
                <i className="ph ph-caret-right" style={{ fontSize: 15, color: "var(--color-neutral-600)" }} />
              </button>
            </div>
          </div>
        </div>
      )}

      {naming && (
        <div className="sheet-backdrop" onClick={() => setNaming(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="h1" style={{ fontSize: 20, marginBottom: 10 }}>Name the program</div>
            <div className="field">
              <input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Off-Season Strength" autoFocus />
            </div>
            <div className="mu" style={{ marginTop: 8, lineHeight: 1.6 }}>Starts as a 4-week, 4-day-a-week draft — every setting is editable in the builder.</div>
            <div className="row" style={{ gap: 8, marginTop: 14 }}>
              <button className="btn btn-secondary" style={{ flex: 1, height: 44 }} onClick={() => setNaming(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1, height: 44 }} onClick={createFromScratch}>Create</button>
            </div>
          </div>
        </div>
      )}

      {publishing && (
        <div className="sheet-backdrop" onClick={() => setPublishing(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="h1" style={{ fontSize: 20 }}>Publish {publishing.name}?</div>
            <p className="mu" style={{ fontSize: 12.5, lineHeight: 1.6 }}>Locks week 1 and notifies assigned clients.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="row" style={{ gap: 8 }}>
                <i className="ph-fill ph-check-circle" style={{ fontSize: 15, color: "var(--color-accent)" }} />
                <span style={{ fontSize: 12.5 }}>Every day has at least one exercise</span>
              </div>
              <div className="row" style={{ gap: 8 }}>
                <i className="ph-fill ph-check-circle" style={{ fontSize: 15, color: "var(--color-accent)" }} />
                <span style={{ fontSize: 12.5 }}>Effort scale set for every set</span>
              </div>
              <div className="row" style={{ gap: 8 }}>
                <i className="ph ph-warning" style={{ fontSize: 15, color: "var(--color-neutral-300)" }} />
                <span style={{ fontSize: 12.5, color: "var(--color-neutral-300)" }}>3 exercises have no demo video yet</span>
              </div>
            </div>
            {publishing.isTemplate ? (
              <div className="row" style={{ gap: 8, padding: "10px 11px", borderRadius: 8, background: "var(--color-neutral-900)" }}>
                <i className="ph ph-lock-simple" style={{ fontSize: 15, color: "var(--color-neutral-400)" }} />
                <span className="mu">This is a template — it stays private to you and can't be listed publicly.</span>
              </div>
            ) : (
              <div className="seg" style={{ width: "100%" }}>
                <button className={`seg-opt${visibility === "private" ? " on" : ""}`} onClick={() => setVisibility("private")}>My clients</button>
                <button className={`seg-opt${visibility === "public" ? " on" : ""}`} onClick={() => setVisibility("public")}>Public listing</button>
              </div>
            )}
            <div className="row" style={{ gap: 8, marginTop: 4 }}>
              <button className="btn btn-secondary" style={{ flex: 1, height: 44 }} onClick={() => setPublishing(null)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1, height: 44 }} onClick={confirmPublish}>Publish</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
