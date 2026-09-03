import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCoachStore } from "../store";
import { useAuth } from "../../lib/auth";
import { listClaimedInvites } from "../../shared/invites";
import { CoachTabBar } from "../components/CoachTabBar";
import type { ClientStatus } from "../types";

const STATUS_DOT: Record<ClientStatus, string> = {
  "on-track": "var(--color-accent)",
  behind: "var(--color-accent-400)",
  "at-risk": "var(--color-neutral-300)",
  paused: "var(--color-neutral-600)",
  unassigned: "var(--color-neutral-700)",
};

type Filter = "review" | "all" | "at-risk";

export default function Clients() {
  const { state, dispatch } = useCoachStore();
  const { account } = useAuth();
  const nav = useNavigate();
  const [filter, setFilter] = useState<Filter>("all");

  // Pick up any invites that were claimed since we last looked, and attach the real account id to the
  // matching roster placeholder so the coach can immediately open their live program/nutrition/log.
  useEffect(() => {
    if (!account) return;
    listClaimedInvites(account.id).then((claimed) => {
      for (const c of state.clients) {
        if (c.accountId || !c.inviteCode) continue;
        const match = claimed.find((k) => k.code === c.inviteCode);
        if (match) dispatch({ type: "RECONCILE_CLIENT", clientId: c.id, accountId: match.accountId });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);

  const needsReviewCount = state.clients.filter((c) => c.flags.length > 0).length;

  const filtered = useMemo(() => {
    if (filter === "review") return state.clients.filter((c) => c.flags.length > 0);
    if (filter === "at-risk") return state.clients.filter((c) => c.status === "at-risk" || c.status === "behind");
    return state.clients;
  }, [state.clients, filter]);

  return (
    <div className="screen">
      <div className="hdr">
        <div style={{ flex: 1 }}>
          <div className="k">{state.clients.length} clients</div>
          <div className="h1">Clients</div>
        </div>
        <button className="btn btn-primary" style={{ height: 36, padding: "0 12px", fontSize: 12.5 }} onClick={() => nav("/coach/invite")}>
          <i className="ph ph-user-plus" style={{ fontSize: 14 }} />
          Invite
        </button>
      </div>
      <div className="screen-scroll">
        <div className="row" style={{ gap: 6 }}>
          <button className={`chip${filter === "review" ? " on" : ""}`} onClick={() => setFilter("review")}>
            Needs review {needsReviewCount}
          </button>
          <button className={`chip${filter === "all" ? " on" : ""}`} onClick={() => setFilter("all")}>
            All
          </button>
          <button className={`chip${filter === "at-risk" ? " on" : ""}`} onClick={() => setFilter("at-risk")}>
            At risk
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {filtered.map((c) => (
            <button
              key={c.id}
              className="link-row"
              style={{ padding: "10px 11px", opacity: c.status === "paused" ? 0.6 : 1 }}
              onClick={() => nav(`/coach/clients/${c.id}`)}
            >
              <div style={{ position: "relative", flex: "none" }}>
                <div className="avatar" style={{ width: 36, height: 36 }}>{c.initials}</div>
                <div style={{ position: "absolute", bottom: -1, right: -1, width: 9, height: 9, borderRadius: "50%", background: STATUS_DOT[c.status], border: "2px solid var(--color-bg)" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontFamily: "var(--font-heading)", fontWeight: 500 }} className="trunc">{c.name}</div>
                <div className="mu trunc" style={{ marginTop: 1 }}>
                  {c.status === "unassigned"
                    ? c.accountId
                      ? "Accepted — build their program"
                      : "Not accepted yet"
                    : c.status === "paused"
                    ? "Paused"
                    : `${c.programName} · wk ${c.week}${c.flags.length ? ` · ${c.flags.length} flag${c.flags.length > 1 ? "s" : ""}` : ""}`}
                </div>
              </div>
              {c.role === "friend" && <span className="tag tag-outline" style={{ flex: "none" }}>Friend</span>}
              {c.status === "unassigned" ? (
                <span style={{ fontSize: 12, color: "var(--color-accent)", flex: "none" }}>{c.accountId ? "Open" : "Invite"}</span>
              ) : c.status === "paused" ? null : (
                <div style={{ textAlign: "right", flex: "none" }}>
                  <div style={{ fontSize: 13, fontFamily: "var(--font-heading)", color: c.adherencePct >= 85 ? "var(--color-accent-300)" : "var(--color-neutral-300)" }}>{c.adherencePct}%</div>
                  <div className="mu" style={{ fontSize: 9.5 }}>adherence</div>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
      <CoachTabBar />
    </div>
  );
}
