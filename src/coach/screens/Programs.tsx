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
  const [choosing, setChoosing] = useState(false);
  const [naming, setNaming] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");
  const [newName, setNewName] = useState("");

  // Two buckets, no overlap: a program you've explicitly saved ("Save as a personal template") lives
  // under Templates -- your real, reusable library, published the moment it's saved. Everything else --
  // still being built, backing a client's live assignment but never promoted, or just started and not yet
  // finished -- lives under Drafts, visible there so "save as draft" is actually resumable.
  const templates = state.programs.filter((p) => p.isTemplate);
  const drafts = state.programs.filter((p) => !p.isTemplate);
  const filtered = filter === "templates" ? templates : drafts;

  function createFromScratch() {
    const name = newName.trim() || "New Program";
    const program = { ...buildBlankProgram(name), pendingUnsaved: true };
    dispatch({ type: "ADD_PROGRAM", program });
    setNaming(false);
    setNewName("");
    nav(`/coach/programs/${program.id}`);
  }

  function deleteProgram(p: CoachProgram) {
    const backing = state.clients.filter((c) => c.assignedProgramId === p.id || c.queuedProgramId === p.id);
    const warning = backing.length
      ? ` ${backing.map((c) => c.name).join(", ")} ${backing.length > 1 ? "are" : "is"} currently on this — deleting it here won't change what they're training, but you'll lose easy access to edit it further.`
      : "";
    if (window.confirm(`Delete "${p.name}"?${warning} This can't be undone.`)) {
      dispatch({ type: "REMOVE_PROGRAM", programId: p.id });
    }
  }

  return (
    <div className="screen">
      <HeroHeader
        title="Programs"
        right={
          <div className="row" style={{ gap: 8, flex: "none" }}>
            <button className="btn btn-secondary btn-icon" aria-label="Browse the exercise library" onClick={() => nav("/coach/library")}>
              <i className="ph ph-barbell" style={{ fontSize: 16 }} />
            </button>
            <button className="btn btn-secondary btn-icon" aria-label="Add a program" onClick={() => setChoosing(true)}>
              <i className="ph ph-plus" style={{ fontSize: 16 }} />
            </button>
          </div>
        }
      >
        <HeroStat value={state.programs.length} label="programs">
          <div className="row" style={{ fontSize: 12.5 }}>
            <span style={{ flex: 1, color: "var(--color-neutral-400)" }}>Templates</span>
            <span className="num" style={{ fontWeight: 700, color: "var(--color-accent-300)" }}>{templates.length}</span>
          </div>
          <div className="row" style={{ fontSize: 12.5 }}>
            <span style={{ flex: 1, color: "var(--color-neutral-400)" }}>Drafts</span>
            <span className="num" style={{ fontWeight: 700, color: "var(--color-neutral-200)" }}>{drafts.length}</span>
          </div>
        </HeroStat>
      </HeroHeader>
      <div className="screen-scroll">
        <div className="row" style={{ gap: 6 }}>
          <button className={`chip${filter === "templates" ? " on" : ""}`} onClick={() => setFilter("templates")}>Templates</button>
          <button className={`chip${filter === "drafts" ? " on" : ""}`} onClick={() => setFilter("drafts")}>Drafts</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((p) => (
            <div key={p.id} className="cell elev-sm">
              <div className="row">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row" style={{ gap: 6 }}>
                    <div style={{ fontSize: 14, fontFamily: "var(--font-heading)", fontWeight: 500 }}>{p.name}</div>
                    {p.isTemplate && (
                      <span className={`tag ${p.visibility === "public" ? "tag-accent" : "tag-outline"}`} style={{ flex: "none" }}>
                        <i className={`ph ${p.visibility === "public" ? "ph-globe" : "ph-lock-simple"}`} style={{ fontSize: 12, marginRight: 3 }} />
                        {p.visibility === "public" ? "Public" : "Private"}
                      </span>
                    )}
                  </div>
                  <div className="mu" style={{ marginTop: 2 }}>
                    {p.weeks} weeks · {p.daysPerWeek} days · {LOAD_LABELS[p.effortScale]}
                  </div>
                </div>
                <button
                  className="btn btn-icon"
                  style={{ width: 34, height: 34, color: "var(--color-neutral-500)" }}
                  aria-label={`Rename ${p.name}`}
                  onClick={() => {
                    setRenaming(p.id);
                    setRenameText(p.name);
                  }}
                >
                  <i className="ph ph-pencil-simple" style={{ fontSize: 14 }} />
                </button>
                <button className="btn btn-icon" style={{ width: 34, height: 34, color: "var(--color-neutral-500)" }} aria-label={`Delete ${p.name}`} onClick={() => deleteProgram(p)}>
                  <i className="ph ph-trash" style={{ fontSize: 14 }} />
                </button>
              </div>
              <div className="row" style={{ gap: 3, marginTop: 11 }}>
                {p.phaseWeights.map((w, i) => (
                  <div
                    key={i}
                    style={{ flex: w, height: 6, borderRadius: 3, background: i === 0 ? "var(--color-accent)" : i === 1 ? "var(--color-accent-600)" : "var(--color-accent-800)" }}
                  />
                ))}
              </div>
              <div className="row" style={{ marginTop: 10, fontSize: 11, color: "var(--color-neutral-500)" }}>
                <span>{p.isTemplate ? "Not assignable to a client — save a copy first" : `${p.assignedCount} assigned`}</span>
                <span style={{ marginLeft: "auto" }}>{p.weeklySets} sets/wk</span>
              </div>
              <button className="btn btn-secondary btn-block" style={{ height: 44, fontSize: 12.5, marginTop: 10 }} onClick={() => nav(`/coach/programs/${p.id}`)}>
                Open builder
              </button>
            </div>
          ))}
          {filtered.length === 0 && <div className="mu">No programs here yet.</div>}
        </div>
      </div>

      {renaming && (
        <div className="sheet-backdrop" onClick={() => setRenaming(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="row" style={{ marginBottom: 4 }}>
              <div style={{ flex: 1 }}>
                <div className="scr">Program</div>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>Rename</div>
              </div>
              <button onClick={() => setRenaming(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-neutral-500)" }}>
                <i className="ph ph-x" style={{ fontSize: 16 }} />
              </button>
            </div>
            <div className="field">
              <label>Name</label>
              <input
                className="input"
                value={renameText}
                onChange={(e) => setRenameText(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && renameText.trim()) {
                    dispatch({ type: "SET_PROGRAM_NAME", programId: renaming, name: renameText.trim() });
                    setRenaming(null);
                  }
                }}
              />
            </div>
            <button
              className="btn btn-primary btn-block"
              style={{ height: 48, opacity: renameText.trim() ? 1 : 0.5 }}
              disabled={!renameText.trim()}
              onClick={() => {
                dispatch({ type: "SET_PROGRAM_NAME", programId: renaming, name: renameText.trim() });
                setRenaming(null);
              }}
            >
              Save name
            </button>
          </div>
        </div>
      )}
      <CoachTabBar />

      {choosing && (
        <div className="sheet-backdrop" onClick={() => setChoosing(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="h1" style={{ fontSize: 21, marginBottom: 4 }}>Add a program</div>
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
                  <div style={{ fontSize: 12.5, fontFamily: "var(--font-heading)" }}>Import a program</div>
                  <div className="mu" style={{ marginTop: 1 }}>PDF or screenshots</div>
                </div>
                <i className="ph ph-caret-right" style={{ fontSize: 14, color: "var(--color-neutral-600)" }} />
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
                  <div style={{ fontSize: 12.5, fontFamily: "var(--font-heading)" }}>Build from scratch</div>
                  <div className="mu" style={{ marginTop: 1 }}>Start with a blank week and add exercises yourself</div>
                </div>
                <i className="ph ph-caret-right" style={{ fontSize: 14, color: "var(--color-neutral-600)" }} />
              </button>
            </div>
          </div>
        </div>
      )}

      {naming && (
        <div className="sheet-backdrop" onClick={() => setNaming(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="h1" style={{ fontSize: 21, marginBottom: 10 }}>Name the program</div>
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
    </div>
  );
}
