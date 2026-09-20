import React, { useEffect, useState } from "react";
import { HashRouter, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { StoreProvider, useStore } from "./state/store";
import { AuthProvider, useAuth } from "./lib/auth";
import { hasInbox } from "./shared/canBuild";
import { supabase } from "./lib/supabase";
import { Toast } from "./components/UI";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { UpdateBanner } from "./components/UpdateBanner";
import Landing from "./screens/Landing";
import AcceptInvite from "./screens/AcceptInvite";
import Onboarding from "./screens/Onboarding";
import TodayRedirect from "./screens/TodayRedirect";
import DayDetail from "./screens/DayDetail";
import LiveSet from "./screens/LiveSet";
import RemoveSet from "./screens/RemoveSet";
import Reorder from "./screens/Reorder";
import Feedback from "./screens/Feedback";
import Progress from "./screens/Progress";
import Nutrition from "./screens/Nutrition";
import Inbox from "./screens/Inbox";
import AllDaysCalendar from "./screens/AllDaysCalendar";
import AllLifts from "./screens/AllLifts";
import LiftDetail from "./screens/LiftDetail";
import BuildProgram from "./screens/BuildProgram";
import { AiScopeProvider, useRegisterAiScope } from "./shared/aiScope";
import IntakeForm from "./screens/IntakeForm";
import { AiFabHost } from "./shared/AiFabHost";
import { CoachAiFab } from "./coach/components/CoachAiFab";
import { reconcileLiveProgram, diffProgram, summarizeProgramForAi } from "./shared/liveProgramAiEdit";
import {
  autoProgressDueDays, autoReviewedPayload, programFollowingWeek, progressionDueDay,
} from "./shared/progressionProposal";
import { sendProgressionProposals, sendProgressionRecord } from "./shared/progressionSignals";
import { ownsTheirProgressions } from "./shared/selfDirected";
import { alignBlockShape } from "./shared/blockShape";
import { isoToday } from "./shared/dayStatus";
import { ClientSideNav } from "./components/TabBar";
import { CoachSideNav } from "./coach/components/CoachTabBar";
import { useIsDesktop } from "./shared/useMediaQuery";
import type { Program } from "./data/types";

import { CoachStoreProvider, useCoachStore } from "./coach/store";
import Desk from "./coach/screens/Desk";
import Clients from "./coach/screens/Clients";
import ClientDetail from "./coach/screens/ClientDetail";
import Programs from "./coach/screens/Programs";
import ProgramDetail from "./coach/screens/ProgramDetail";
import Messages, { CoachThread } from "./coach/screens/Messages";
import Library from "./coach/screens/Library";
import PlatformAdmin from "./coach/screens/PlatformAdmin";
import NutritionProtocol from "./coach/screens/NutritionProtocol";
import ImportProgram from "./coach/screens/ImportProgram";
import LogSession from "./coach/screens/LogSession";
import InviteRoster from "./coach/screens/InviteRoster";
import AssignProgram from "./coach/screens/AssignProgram";
import AssignProgramPickClient from "./coach/screens/AssignProgramPickClient";
import ReviewProgression from "./coach/screens/ReviewProgression";

function LoadingShell() {
  return (
    <div className="app-shell">
      <div className="screen">
        <div className="hdr" style={{ paddingBottom: 8 }}>
          <div className="h1">Loading…</div>
        </div>
      </div>
    </div>
  );
}

/** Blocks a route tree until we know who's signed in and which app they belong in — a client/friend
 * never sees the coach app and vice versa. The one exception: a coach who's turned on client preview
 * (see Desk.tsx's account sheet) is let through to the member routes as themselves, to click around the
 * real client experience without needing a separate test account. */
function RequireRole({ role, children }: { role: "coach" | "member"; children: React.ReactNode }) {
  const { loading, account, previewingAsClient } = useAuth();
  if (loading) return <LoadingShell />;
  if (!account) return <Navigate to="/" replace />;
  if (role === "coach" && account.role !== "coach") return <Navigate to="/" replace />;
  if (role === "member" && account.role === "coach" && !previewingAsClient) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/** The inbox belongs to prescribed clients. A self-directed account has no coach writing to them.
 *
 * Jack: "general accounts do not have a coach who can message them... that's only client accounts and
 * coaching accounts." The tab was removed from those accounts already, but the route stayed mounted, so
 * the screen was still reachable by URL, by an old link, or by back-navigation. Hiding a control is not
 * access control -- migration 0028 closed the same gap on the database side, where the two messaging RPCs
 * had been keyed off `coach_id` alone and a General account has one of those too.
 *
 * Gated on `canSelfBuildProgram` rather than a fresh role check on purpose: that is the exact predicate
 * TabBar uses to decide whether to show the Inbox tab, so the tab and the route cannot disagree about who
 * messaging is for. A new check here would be a second definition free to drift from the first. */
function RequireInbox({ children }: { children: React.ReactNode }) {
  const { loading, account } = useAuth();
  if (loading) return <LoadingShell />;
  // Gated on hasInbox, not canSelfBuildProgram. The latter is true for a coach as well as a General
  // account, so guarding on it bounced coaches away from their own messages.
  if (!hasInbox(account?.role)) return <Navigate to="/block" replace />;
  return <>{children}</>;
}

/** Guards every real training route behind onboarding -- but the client's real state loads
 * asynchronously (see StoreProvider's hydrate effect), so reading state.onboarded before that resolves
 * always sees the blank default (onboarded: false) and redirects to onboarding regardless of what's
 * actually saved. Waiting for `ready` fixes that: a real "already onboarded" account lands straight on
 * its real dashboard on a fresh load instead of being bounced back through onboarding every time. */
function Gate({ children }: { children: React.ReactNode }) {
  const { state, ready } = useStore();
  if (!ready) return <LoadingShell />;
  if (!state.onboarded) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

function PreviewBanner() {
  const { exitClientPreview } = useAuth();
  const nav = useNavigate();
  return (
    <div
      style={{
        flex: "none",
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        // The status bar/notch sits right at the top of the screen on a real phone — without this, the
        // banner (and the Exit button in it) renders partly or fully underneath it and can't be tapped.
        paddingTop: "calc(8px + env(safe-area-inset-top))",
        background: "var(--color-accent)",
        color: "#0b1710",
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      <i className="ph-fill ph-barbell" style={{ fontSize: 14 }} />
      <span style={{ flex: 1 }}>Training as yourself</span>
      <button
        onClick={() => {
          exitClientPreview();
          nav("/coach/desk", { replace: true });
        }}
        style={{ background: "#0b1710", color: "var(--color-accent)", border: "none", borderRadius: 6, padding: "5px 10px", fontWeight: 700, fontSize: 11, cursor: "pointer" }}
      >
        Back to coaching
      </button>
    </div>
  );
}

function ClientLayout() {
  const { state, dispatch } = useStore();
  const { account, previewingAsClient } = useAuth();
  const showingPreviewBanner = account?.role === "coach" && previewingAsClient;
  const desktop = useIsDesktop();
  const { pathname } = useLocation();
  // A prescribed client's block belongs to their coach, so the button isn't theirs to have. Everyone
  // self-directed -- friends and family, and a coach training themselves -- owns their own program.
  const selfDirected = ownsTheirProgressions(account, previewingAsClient);

  /* A PRESCRIBED CLIENT's finished session: next week's numbers proposed to their coach, who decides.
   * Their block is their coach's, and that separation is the point of the roles. Here rather than in the
   * finish handler so it also catches a session finished on an older build or while offline. Marked before
   * sending, so the store saving and this effect re-running can never send the same session twice. One per
   * run; marking changes `state.program`, which re-runs this and picks up the next, so a week drains in
   * order. Self-directed accounts take the auto-programming effect below instead, never both -- two
   * notifications for one session is how a desk stops being readable. */
  useEffect(() => {
    if (!account || selfDirected) return;
    // Switched off from the Train tab. `=== false` rather than `!`: absent means on, because proposals
    // send for everyone today and every account saved before this field existed hydrates without it.
    // Nothing is marked as sent while it is off, so turning it back on picks up whatever is still recent
    // enough to qualify rather than replaying the whole block.
    if (state.profile.autoProgressions === false) return;
    const due = progressionDueDay(state.program, isoToday());
    if (!due) return;

    dispatch({ type: "MARK_PROGRESSION_SENT", dayId: due });
    void sendProgressionProposals(account, state.program, due, state.profile.units);
  }, [account, selfDirected, state.program, state.profile.units, state.profile.autoProgressions, dispatch]);

  /* Auto programming, for an account that owns its own progressions. A WHOLE week at a time, not a session
   * per render: Jack, standing on week 2 day 1 with week 1 fully logged — "you are supposed to take the
   * information from week one, which is all logged, and use it to make progressions for where things should
   * be by the end of week two, and then do the same thing once week two is complete for week three."
   *
   * Kept separate from the review effect above rather than branching inside it, because the two now read
   * different marks and different windows and had started to read as one function doing two jobs. */
  /* The shape half of "copy last week to this week and change the numbers". Later weeks of a session take
   * the exercises and the ORDER of the last completed one, because reordering used to change a single week
   * and a block can already be in that state — Jack: "the hip clean is at the very end of the day for some
   * reason on week two day one." Idempotent, so it runs on every open rather than once per session; an
   * already-aligned block returns the same object and nothing is written. */
  useEffect(() => {
    if (!account || !selfDirected) return;
    if (state.profile.autoProgressions === false) return;
    const { program, changed } = alignBlockShape(state.program);
    if (changed.length === 0) return;
    dispatch({ type: "SET_PROGRAM", program });
  }, [account, selfDirected, state.program, state.profile.autoProgressions, dispatch]);

  useEffect(() => {
    if (!account || !selfDirected) return;
    if (state.profile.autoProgressions === false) return;
    const dueDays = autoProgressDueDays(state.program, isoToday());
    if (dueDays.length === 0) return;

    // Applied here rather than inside the reducer so the list of what actually landed is available to put
    // in each signal -- a proposal skipped because the following session was already started is recorded as
    // not applied, not quietly counted as done.
    const { program, results } = programFollowingWeek(state.program, dueDays, state.profile.units);
    dispatch({ type: "AUTO_PROGRESS", dayIds: dueDays, program });
    for (const r of results) {
      if (r.result.proposals.length === 0) continue;
      void sendProgressionRecord(account, state.program, r.dayId, autoReviewedPayload(r.result, r.written));
    }
  }, [account, selfDirected, state.program, state.profile.units, state.profile.autoProgressions, dispatch]);

  // Registered once here rather than per screen: on this side there is only ever one program, so it's in
  // scope on the calendar, a workout, progress, nutrition — anywhere they happen to be.
  useRegisterAiScope(
    selfDirected && state.program.weeks.length > 0
      ? () => ({
          title: state.program.name,
          buildPayload: () => summarizeProgramForAi(state.program, state.program.weeks.find((w) => w.days.some((d) => d.status === "today"))?.number ?? null),
          build: (result) => (result.weeks ? reconcileLiveProgram(state.program, result.weeks) : state.program),
          diff: (next) => diffProgram(state.program, next as Program),
          apply: (next, changes, summary) => {
            dispatch({
              type: "SET_PROGRAM",
              program: { ...(next as Program), lastAiEdit: { at: new Date().toISOString(), summary, exerciseIds: changes.map((c) => c.exerciseId).filter((id): id is string => !!id) } },
            });
            dispatch({ type: "SHOW_TOAST", message: `Applied — ${changes.length} change${changes.length === 1 ? "" : "s"}.` });
            setTimeout(() => dispatch({ type: "CLEAR_TOAST" }), 2600);
          },
        })
      : null,
  );

  return (
    <div className={`app-shell${showingPreviewBanner ? " has-preview-banner" : ""}`}>
      {showingPreviewBanner && <PreviewBanner />}
      {/* On a phone these two wrappers are invisible and the screen fills the column as it always has. On a
          computer the side menu sits beside the page. Not during onboarding: every destination in it would
          bounce straight back to the setup screen. */}
      <div className="app-body">
        {desktop && !pathname.startsWith("/onboarding") && <ClientSideNav />}
        <div className="app-main">
          <Outlet />
        </div>
      </div>
      <AiFabHost hidden={!selfDirected} />
      {state.toast && <Toast message={state.toast} />}
    </div>
  );
}

function ClientProviders() {
  const { account } = useAuth();
  const [coachName, setCoachName] = useState<string | null>(null);

  useEffect(() => {
    if (!account?.coach_id) {
      setCoachName(null);
      return;
    }
    let active = true;
    supabase
      .from("accounts")
      .select("display_name")
      .eq("id", account.coach_id)
      .maybeSingle()
      .then(({ data }) => active && setCoachName((data?.display_name as string | undefined) ?? null));
    return () => {
      active = false;
    };
  }, [account?.coach_id]);

  if (!account) return null; // RequireRole already guarantees this, just satisfying TS
  // Wait for the real coach name before mounting the store — it only matters the very first time this
  // account is opened (seeding a blank state), but that value gets saved permanently, so a wrong
  // placeholder here would otherwise stick forever.
  if (account.coach_id && coachName === null) return null;

  return (
    <StoreProvider accountId={account.id} ownerName={account.display_name} coachName={coachName ?? account.display_name}>
      <AiScopeProvider>
        <ClientLayout />
      </AiScopeProvider>
    </StoreProvider>
  );
}

function CoachLayout() {
  const { state } = useCoachStore();
  const desktop = useIsDesktop();
  return (
    <div className="app-shell">
      <div className="app-body">
        {desktop && <CoachSideNav />}
        <div className="app-main">
          <Outlet />
        </div>
      </div>
      <CoachAiFab />
      {state.toast && <Toast message={state.toast} />}
    </div>
  );
}

function CoachProviders() {
  return (
    <CoachStoreProvider>
      <AiScopeProvider>
        <CoachLayout />
      </AiScopeProvider>
    </CoachStoreProvider>
  );
}

function LandingShell() {
  return (
    <div className="app-shell">
      <Landing />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
    <UpdateBanner />
    <AuthProvider>
      <HashRouter>
        <div className="app-root">
          <Routes>
            <Route path="/" element={<LandingShell />} />
            <Route path="/invite/:code" element={<div className="app-shell"><AcceptInvite /></div>} />

            <Route element={<RequireRole role="member"><ClientProviders /></RequireRole>}>
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/intake" element={<Gate><IntakeForm /></Gate>} />
              <Route path="/block" element={<Gate><TodayRedirect /></Gate>} />
              <Route path="/block/calendar" element={<Gate><AllDaysCalendar /></Gate>} />
              <Route path="/block/day/:dayId" element={<Gate><DayDetail /></Gate>} />
              <Route path="/block/day/:dayId/exercise/:exerciseId/live/:setId" element={<Gate><LiveSet /></Gate>} />
              <Route path="/block/day/:dayId/exercise/:exerciseId/remove/:setId" element={<Gate><RemoveSet /></Gate>} />
              <Route path="/block/day/:dayId/reorder" element={<Gate><Reorder /></Gate>} />
              <Route path="/block/day/:dayId/finish" element={<Gate><Feedback /></Gate>} />
              <Route path="/progress" element={<Gate><Progress /></Gate>} />
              <Route path="/progress/lifts" element={<Gate><AllLifts /></Gate>} />
              <Route path="/progress/lifts/:name" element={<Gate><LiftDetail /></Gate>} />
              <Route path="/nutrition" element={<Gate><Nutrition /></Gate>} />
              <Route path="/inbox" element={<Gate><RequireInbox><Inbox /></RequireInbox></Gate>} />
              <Route path="/build" element={<Gate><BuildProgram /></Gate>} />
            </Route>

            <Route element={<RequireRole role="coach"><CoachProviders /></RequireRole>}>
              <Route path="/coach" element={<Navigate to="/coach/desk" replace />} />
              <Route path="/coach/desk" element={<Desk />} />
              <Route path="/coach/clients" element={<Clients />} />
              <Route path="/coach/invite" element={<InviteRoster />} />
              <Route path="/coach/clients/:clientId" element={<ClientDetail />} />
              <Route path="/coach/clients/:clientId/assign" element={<AssignProgram />} />
              <Route path="/coach/programs/:programId/assign" element={<AssignProgramPickClient />} />
              <Route path="/coach/clients/:clientId/nutrition" element={<NutritionProtocol />} />
              <Route path="/coach/clients/:clientId/log" element={<LogSession />} />
              <Route path="/coach/programs" element={<Programs />} />
              <Route path="/coach/programs/import" element={<ImportProgram />} />
              <Route path="/coach/programs/:programId" element={<ProgramDetail />} />
              <Route path="/coach/messages" element={<Messages />} />
              <Route path="/coach/messages/:threadId" element={<CoachThread />} />
              <Route path="/coach/library" element={<Library />} />
              <Route path="/coach/admin" element={<PlatformAdmin />} />
              <Route path="/coach/review/:signalId" element={<ReviewProgression />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </HashRouter>
    </AuthProvider>
    </ErrorBoundary>
  );
}
