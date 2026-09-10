import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCoachStore } from "../store";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import { listClaimedInvites } from "../../shared/invites";
import { CoachTabBar } from "../components/CoachTabBar";
import { HeroHeader, HeroStat } from "../../components/UI";
import { SwipeRow } from "../components/SwipeRow";
import { listCoachesForAdmin, type CoachSummary } from "../../shared/deleteAccount";
import type { ClientStatus, CoachClient } from "../types";

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

const STATUS_DOT: Record<ClientStatus, string> = {
  "on-track": "var(--color-accent)",
  behind: "var(--color-accent-400)",
  "at-risk": "var(--color-neutral-300)",
  paused: "var(--color-neutral-600)",
  unassigned: "var(--color-neutral-700)",
};

type Filter = "review" | "all" | "at-risk" | "clients" | "friends" | "coaches";

export default function Clients() {
  const { state, dispatch } = useCoachStore();
  const { account } = useAuth();
  const nav = useNavigate();
  const [filter, setFilter] = useState<Filter>("all");
  // Which row is swiped open, if any. Held here rather than in each row so opening one closes the last.
  const [swipedId, setSwipedId] = useState<string | null>(null);
  // The platform owner's view of every coach on the app. Loaded only when that tab is opened, because
  // it is a cross-account read that nobody else on the roster screen has any use for.
  const isOwner = account?.is_platform_admin === true;
  const [coaches, setCoaches] = useState<CoachSummary[] | null>(null);
  useEffect(() => {
    if (filter !== "coaches" || !isOwner) return;
    let live = true;
    listCoachesForAdmin().then((rows) => live && setCoaches(rows));
    return () => {
      live = false;
    };
  }, [filter, isOwner]);

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

  // The roster list above is just a local cache — the real relationship is accounts.coach_id. Self-heal
  // against it: anyone with a real account pointing at this coach but missing from the cached roster
  // (however that happened — a reset, a race, testing) gets linked back rather than silently disappearing.
  // Prefer merging into a stale "not accepted yet" placeholder with a matching name over adding a
  // duplicate row — that placeholder is almost always the same person's earlier, never-linked invite.
  useEffect(() => {
    if (!account) return;
    supabase
      .from("accounts")
      .select("id, role, display_name")
      .eq("coach_id", account.id)
      .then(({ data }) => {
        if (!data) return;
        for (const row of data) {
          if (state.clients.some((c) => c.accountId === row.id)) continue;
          const staleMatch = state.clients.find((c) => !c.accountId && c.name.trim().toLowerCase() === row.display_name.trim().toLowerCase());
          if (staleMatch) {
            dispatch({ type: "RECONCILE_CLIENT", clientId: staleMatch.id, accountId: row.id });
            continue;
          }
          const client: CoachClient = {
            id: row.id,
            name: row.display_name,
            initials: initialsFor(row.display_name),
            status: "unassigned",
            role: row.role === "friend" ? "friend" : "client",
            accountId: row.id,
            programName: "—",
            week: 0,
            totalWeeks: 0,
            adherencePct: 0,
            flags: [],
            loadHistory: [],
            recentSessions: [],
          };
          dispatch({ type: "ADD_CLIENT", client });
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);

  const needsReviewCount = state.clients.filter((c) => c.flags.length > 0).length;
  const atRiskCount = state.clients.filter((c) => c.status === "at-risk" || c.status === "behind").length;
  const acceptedCount = state.clients.filter((c) => c.accountId).length;
  const clientCount = state.clients.filter((c) => c.role !== "friend").length;
  const friendCount = state.clients.filter((c) => c.role === "friend").length;

  const filtered = useMemo(() => {
    if (filter === "review") return state.clients.filter((c) => c.flags.length > 0);
    if (filter === "at-risk") return state.clients.filter((c) => c.status === "at-risk" || c.status === "behind");
    if (filter === "clients") return state.clients.filter((c) => c.role !== "friend");
    if (filter === "friends") return state.clients.filter((c) => c.role === "friend");
    // Clients lead. They're the paying work; friends and family sit underneath rather than interleaved
    // by whatever order the roster happens to be in. Stable within each group, so the existing order is
    // preserved inside them.
    return [...state.clients].sort((a, b) => Number(a.role === "friend") - Number(b.role === "friend"));
  }, [state.clients, filter]);

  return (
    <div className="screen">
      <HeroHeader
        title="Clients"
        right={
          <button className="btn btn-solid" style={{ height: 36, padding: "0 13px", fontSize: 12.5, flex: "none" }} onClick={() => nav("/coach/invite")}>
            <i className="ph ph-user-plus" style={{ fontSize: 14 }} />
            Invite
          </button>
        }
      >
        <HeroStat
          value={state.clients.length}
          label="clients"
          rows={[
            { label: "Accepted", value: acceptedCount },
            { label: "Needs review", value: needsReviewCount, tone: "warning" },
            { label: "At risk", value: atRiskCount, tone: "warning" },
          ]}
        />
      </HeroHeader>
      <div className="screen-scroll">
        {/* hscroll because the admin view has five chips, which overflow a phone -- without it they
            squash rather than scroll. */}
        <div className="row hscroll" style={{ gap: 6 }}>
          <button className={`chip${filter === "review" ? " on" : ""}`} onClick={() => setFilter("review")}>
            Needs review {needsReviewCount}
          </button>
          <button className={`chip${filter === "all" ? " on" : ""}`} onClick={() => setFilter("all")}>
            All <span className="mono">{state.clients.length}</span>
          </button>
          <button className={`chip${filter === "at-risk" ? " on" : ""}`} onClick={() => setFilter("at-risk")}>
            At risk
          </button>
          {/* Splitting the roster by role is only offered to the platform owner. Every coach can invite
              friend/family accounts, but nobody else has a roster mixed enough for the split to earn its
              place -- two extra chips on a list of four people is noise. */}
          {account?.is_platform_admin && (
            <>
              <button className={`chip${filter === "clients" ? " on" : ""}`} onClick={() => setFilter("clients")}>
                Clients <span className="mono">{clientCount}</span>
              </button>
              <button className={`chip${filter === "friends" ? " on" : ""}`} onClick={() => setFilter("friends")}>
                Friends <span className="mono">{friendCount}</span>
              </button>
              {/* Owner only. Every other coach's roster is invisible to them by design, so this chip
                  would show an empty screen and imply something was broken. */}
              {isOwner && (
                <button className={`chip${filter === "coaches" ? " on" : ""}`} onClick={() => setFilter("coaches")}>
                  Coaches
                </button>
              )}
            </>
          )}
        </div>

        {filter === "coaches" ? (
          <CoachDirectory coaches={coaches} />
        ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {filtered.map((c) => (
            /* Swiping removes them from the roster -- the reversible one. Deleting the actual account is
               permanent and cascades, so it stays behind the explicit confirmation sheet on their page;
               a gesture this easy to make by accident should not be able to reach it. */
            <SwipeRow
              key={c.id}
              open={swipedId === c.id}
              onOpenChange={(o) => setSwipedId(o ? c.id : null)}
              onAction={() => {
                if (window.confirm(`Remove ${c.name} from your roster?\n\nThis takes them off your list. It does not delete their account — do that from their page if that's what you want.`)) {
                  dispatch({ type: "REMOVE_CLIENT", clientId: c.id });
                }
                setSwipedId(null);
              }}
            >
            <button
              className="link-row"
              style={{ padding: "10px 11px", opacity: c.status === "paused" ? 0.6 : 1, width: "100%" }}
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
              {/* Shown for everyone, not just friends. Which of the two someone is changes what you can
                  expect of them -- a friend builds their own programs and sets their own macros -- so
                  "no tag" being the answer for half the roster made it something you had to remember. */}
              <span className={`tag ${c.role === "friend" ? "tag-outline" : "tag-neutral"}`} style={{ flex: "none" }}>
                {c.role === "friend" ? "Friend" : "Client"}
              </span>
              {c.status === "unassigned" ? (
                <span style={{ fontSize: 12.5, color: "var(--color-accent)", flex: "none" }}>{c.accountId ? "Open" : "Invite"}</span>
              ) : c.status === "paused" ? null : (
                <div style={{ textAlign: "right", flex: "none" }}>
                  <div className="num" style={{ fontWeight: 700, fontSize: 12.5, color: c.adherencePct >= 85 ? "var(--color-accent-300)" : "var(--color-neutral-300)" }}>{c.adherencePct}%</div>
                  <div className="mu" style={{ fontSize: 11 }}>adherence</div>
                </div>
              )}
            </button>
            </SwipeRow>
          ))}
        </div>
        )}
      </div>
      <CoachTabBar />
    </div>
  );
}

/** Every coach on the platform, and how big their roster is. Read-only on purpose -- this exists to see
 * who is on the app and how much they are using it, not to reach into anyone's roster. Nothing here can:
 * the counts arrive already computed from a security definer function, because a coach's clients are
 * invisible to every other account including this one. */
function CoachDirectory({ coaches }: { coaches: CoachSummary[] | null }) {
  if (coaches === null) {
    return <div className="mu" style={{ textAlign: "center", padding: "22px 0" }}>Loading coaches…</div>;
  }
  if (coaches.length === 0) {
    return <div className="mu" style={{ textAlign: "center", padding: "22px 0" }}>No coaches yet.</div>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {coaches.map((c) => {
        const total = c.clientCount + c.friendCount;
        return (
          <div key={c.id} className="link-row" style={{ padding: "10px 11px", opacity: c.active ? 1 : 0.55 }}>
            <div className="avatar" style={{ width: 36, height: 36, flex: "none" }}>
              {(c.displayName.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("") || "?").toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontFamily: "var(--font-heading)", fontWeight: 500 }} className="trunc">
                {c.displayName}
              </div>
              <div className="mu trunc" style={{ marginTop: 1 }}>
                {c.active ? "" : "Revoked · "}
                {total === 0
                  ? "No one on their roster yet"
                  : `${c.clientCount} client${c.clientCount === 1 ? "" : "s"}${c.friendCount ? ` · ${c.friendCount} friend${c.friendCount === 1 ? "" : "s"}` : ""}`}
                {c.createdAt ? ` · joined ${new Date(c.createdAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })}` : ""}
              </div>
            </div>
            <div style={{ textAlign: "right", flex: "none" }}>
              <div className="num" style={{ fontWeight: 700, fontSize: 12.5, color: "var(--color-accent-300)" }}>{total}</div>
              <div className="mu" style={{ fontSize: 11 }}>on roster</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
