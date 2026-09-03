import React, { useEffect, useState } from "react";
import { HashRouter, Navigate, Outlet, Route, Routes, useNavigate } from "react-router-dom";
import { StoreProvider, useStore } from "./state/store";
import { AuthProvider, useAuth } from "./lib/auth";
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

import { CoachStoreProvider, useCoachStore } from "./coach/store";
import Desk from "./coach/screens/Desk";
import Clients from "./coach/screens/Clients";
import ClientDetail from "./coach/screens/ClientDetail";
import Programs from "./coach/screens/Programs";
import ProgramDetail from "./coach/screens/ProgramDetail";
import Messages, { CoachThread } from "./coach/screens/Messages";
import Library from "./coach/screens/Library";
import NutritionProtocol from "./coach/screens/NutritionProtocol";
import ImportProgram from "./coach/screens/ImportProgram";
import LogSession from "./coach/screens/LogSession";
import InviteRoster from "./coach/screens/InviteRoster";
import AssignProgram from "./coach/screens/AssignProgram";
import AssignProgramPickClient from "./coach/screens/AssignProgramPickClient";

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

function Gate({ children }: { children: React.ReactNode }) {
  const { state } = useStore();
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
        fontSize: 11.5,
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
  const { state } = useStore();
  const { account, previewingAsClient } = useAuth();
  return (
    <div className="app-shell">
      {account?.role === "coach" && previewingAsClient && <PreviewBanner />}
      <Outlet />
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
      <ClientLayout />
    </StoreProvider>
  );
}

function CoachLayout() {
  const { state } = useCoachStore();
  return (
    <div className="app-shell">
      <Outlet />
      {state.toast && <Toast message={state.toast} />}
    </div>
  );
}

function CoachProviders() {
  return (
    <CoachStoreProvider>
      <CoachLayout />
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
              <Route path="/inbox" element={<Gate><Inbox /></Gate>} />
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
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </HashRouter>
    </AuthProvider>
    </ErrorBoundary>
  );
}
