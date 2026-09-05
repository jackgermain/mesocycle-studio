import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCoachStore } from "../store";
import { BackHeader, InfoBanner } from "../../components/UI";

/** Program-first entry point: ProgramDetail's "Assign to a client" lands here to pick who, then hands
 * off to AssignProgram's existing-program confirm step with this program pre-selected. */
export default function AssignProgramPickClient() {
  const { programId = "" } = useParams();
  const { state } = useCoachStore();
  const nav = useNavigate();
  const program = state.programs.find((p) => p.id === programId);
  const accepted = state.clients.filter((c) => c.accountId);

  if (!program) return <div className="screen-scroll">Not found.</div>;

  return (
    <div className="screen">
      <BackHeader kicker={program.name} title="Assign to a client" />
      <div className="screen-scroll">
        {accepted.length === 0 && <InfoBanner icon="ph-users-three">No accepted clients yet — invite someone from the Clients tab first.</InfoBanner>}
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {accepted.map((c) => (
            <button key={c.id} className="link-row" style={{ padding: "11px 12px" }} onClick={() => nav(`/coach/clients/${c.id}/assign?programId=${program.id}`)}>
              <div className="avatar" style={{ width: 34, height: 34 }}>{c.initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="trunc" style={{ fontSize: 12.5, fontFamily: "var(--font-heading)" }}>{c.name}</div>
                <div className="mu" style={{ marginTop: 1 }}>{c.status === "unassigned" ? "Not assigned yet" : `Currently on ${c.programName}`}</div>
              </div>
              <i className="ph ph-caret-right" style={{ fontSize: 14, color: "var(--color-neutral-600)" }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
