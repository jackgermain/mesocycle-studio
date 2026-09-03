import React, { useState } from "react";
import { HashRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { StoreProvider, useStore } from "./state/store";
import { getActiveProfileId } from "./state/activeProfile";
import { Toast } from "./components/UI";
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
import Inbox, { Thread } from "./screens/Inbox";
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

function Gate({ children }: { children: React.ReactNode }) {
  const { state } = useStore();
  if (!state.onboarded) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

function ClientLayout() {
  const { state } = useStore();
  return (
    <div className="app-shell">
      <Outlet />
      {state.toast && <Toast message={state.toast} />}
    </div>
  );
}

function ClientProviders() {
  const [profileId] = useState(getActiveProfileId);
  return (
    <StoreProvider profileId={profileId}>
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
    <HashRouter>
      <div className="app-root">
        <Routes>
          <Route path="/" element={<LandingShell />} />
          <Route path="/invite/:code" element={<div className="app-shell"><AcceptInvite /></div>} />

          <Route element={<ClientProviders />}>
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
            <Route path="/inbox/:threadId" element={<Gate><Thread /></Gate>} />
            <Route path="/build" element={<Gate><BuildProgram /></Gate>} />
          </Route>

          <Route element={<CoachProviders />}>
            <Route path="/coach" element={<Navigate to="/coach/desk" replace />} />
            <Route path="/coach/desk" element={<Desk />} />
            <Route path="/coach/clients" element={<Clients />} />
            <Route path="/coach/invite" element={<InviteRoster />} />
            <Route path="/coach/clients/:clientId" element={<ClientDetail />} />
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
  );
}
