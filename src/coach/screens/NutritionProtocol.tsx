import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCoachStore } from "../store";
import { StoreProvider, useStore } from "../../state/store";
import { useAuth } from "../../lib/auth";
import { BackHeader, InfoBanner } from "../../components/UI";
import { NutritionForm } from "../../shared/NutritionForm";
import type { ClientProfile } from "../../data/types";

/** Wraps the client's own store — keyed by their account id — so what the coach saves here writes
 * straight into the exact same profile fields the client's own Nutrition tab reads, same shared row a
 * program edit would use. */
export default function NutritionProtocol() {
  const { clientId = "" } = useParams();
  const { state: coachState } = useCoachStore();
  const { account } = useAuth();
  const nav = useNavigate();
  const client = coachState.clients.find((c) => c.id === clientId);

  if (!client) return <div className="screen-scroll">Not found.</div>;

  if (!client.accountId) {
    return (
      <div className="screen">
        <BackHeader kicker={client.name} title="Nutrition protocol" />
        <div className="screen-scroll">
          <InfoBanner icon="ph-hourglass">{client.name.split(" ")[0]} hasn't accepted their invite yet — nutrition protocol will be available once they do.</InfoBanner>
        </div>
      </div>
    );
  }

  return (
    <StoreProvider accountId={client.accountId} ownerName={client.name} coachName={account?.display_name ?? "Coach"}>
      <NutritionProtocolGate clientName={client.name} onDone={() => nav(-1)} />
    </StoreProvider>
  );
}

function NutritionProtocolGate({ clientName, onDone }: { clientName: string; onDone: () => void }) {
  const { state, ready } = useStore();
  if (!ready) {
    return (
      <div className="screen">
        <BackHeader kicker={clientName} title="Nutrition protocol" />
        <div className="screen-scroll">Loading…</div>
      </div>
    );
  }
  return <NutritionFormScreen clientName={clientName} profile={state.profile} onDone={onDone} />;
}

function NutritionFormScreen({ clientName, profile, onDone }: { clientName: string; profile: ClientProfile; onDone: () => void }) {
  const { dispatch } = useStore();
  const { dispatch: coachDispatch } = useCoachStore();

  return (
    <div className="screen">
      <BackHeader kicker={`${clientName} · nutrition protocol`} title="Nutrition protocol" />
      <NutritionForm
        profile={profile}
        subjectFirstName={clientName.split(" ")[0]}
        onSave={(protocol) => {
          dispatch({ type: "SET_NUTRITION_PROTOCOL", protocol });
          coachDispatch({ type: "SHOW_TOAST", message: `Nutrition protocol saved for ${clientName} — synced to their app.` });
          setTimeout(() => coachDispatch({ type: "CLEAR_TOAST" }), 2800);
          onDone();
        }}
      />
    </div>
  );
}
