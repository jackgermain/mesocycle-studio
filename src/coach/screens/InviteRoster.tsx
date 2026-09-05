import React, { useState } from "react";
import { useCoachStore } from "../store";
import { useAuth } from "../../lib/auth";
import { BackHeader, InfoBanner, Seg } from "../../components/UI";
import { createInvite } from "../../shared/invites";
import { shareBaseUrl } from "../../shared/appUrl";
import type { InviteRole } from "../../shared/invites";
import type { CoachClient } from "../types";

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

type PickerRole = InviteRole | "coach";

const ROLE_COPY: Record<PickerRole, string> = {
  client:
    "A fully prescribed client — you build every program and set their nutrition targets, same as the rest of your roster.",
  friend:
    "A self-directed friend/family account — they can build their own programs from scratch or clone one of your saved templates and modify it, and they get full nutrition tracking. They can't onboard anyone else, and can only message you in the app. You can still view and edit anything they set up.",
  coach:
    "A fully independent coach — they get their own separate roster, clients, and programs, completely walled off from yours. Not part of your roster at all; this is just a general signup link, so no name needed.",
};

const COACH_SIGNUP_URL = `${shareBaseUrl()}#/`;

export default function InviteRoster() {
  const { dispatch } = useCoachStore();
  const { account } = useAuth();
  const [name, setName] = useState("");
  const [role, setRole] = useState<PickerRole>("client");
  const [sent, setSent] = useState<{ name: string; role: InviteRole; url: string } | null>(null);
  const [coachLinkCopied, setCoachLinkCopied] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);

  function copyCoachLink() {
    navigator.clipboard?.writeText(COACH_SIGNUP_URL).then(() => {
      setCoachLinkCopied(true);
      setTimeout(() => setCoachLinkCopied(false), 2000);
    });
  }

  async function send() {
    if (role === "coach") return;
    const trimmed = name.trim();
    if (!trimmed || !account) return;
    setSending(true);
    try {
      const invite = await createInvite(account.id, trimmed, role);
      const id = `${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Math.random().toString(36).slice(2, 6)}`;
      const client: CoachClient = {
        id,
        name: trimmed,
        initials: initialsFor(trimmed),
        status: "unassigned",
        role,
        inviteCode: invite.code,
        programName: "—",
        week: 0,
        totalWeeks: 0,
        adherencePct: 0,
        flags: [],
        loadHistory: [],
        recentSessions: [],
      };
      dispatch({ type: "ADD_CLIENT", client });
      const url = `${shareBaseUrl()}#/invite/${invite.code}`;
      setSent({ name: trimmed, role, url });
      setName("");
    } finally {
      setSending(false);
    }
  }

  function copyLink() {
    if (!sent) return;
    navigator.clipboard?.writeText(sent.url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="screen">
      <BackHeader kicker="Clients" title="Invite someone" />
      <div className="screen-scroll">
        {!sent ? (
          <>
            <InfoBanner icon="ph-info">
              {role === "coach"
                ? "Prototype note: nothing is emailed automatically. This is a plain signup link, not a personal invite — copy it and send it to whoever you want to bring on."
                : "Prototype note: nothing is emailed automatically. This generates a link — copy it and send it however you'd reach them."}
            </InfoBanner>

            <div>
              <div className="sh">Role</div>
              <Seg
                value={role}
                onChange={setRole}
                options={[
                  { value: "client", label: "Client" },
                  { value: "friend", label: "Friend / family" },
                  { value: "coach", label: "Coach" },
                ]}
              />
              <div className="mu" style={{ marginTop: 8, lineHeight: 1.55 }}>{ROLE_COPY[role]}</div>
            </div>

            {role === "coach" ? (
              <div className="cell" style={{ marginTop: 4 }}>
                <div className="row" style={{ marginBottom: 8 }}>
                  <span style={{ flex: 1, fontSize: 12.5, fontFamily: "var(--font-heading)" }}>Coach signup link</span>
                </div>
                <div className="mu trunc" style={{ padding: "8px 10px", background: "var(--color-neutral-900)", borderRadius: 7, fontFamily: "monospace" }}>
                  {COACH_SIGNUP_URL}
                </div>
                <button className="btn btn-secondary btn-block" style={{ height: 44, marginTop: 8, fontSize: 12.5 }} onClick={copyCoachLink}>
                  {coachLinkCopied ? "Copied" : "Copy link"}
                </button>
              </div>
            ) : (
              <>
                <div className="field">
                  <label>Name</label>
                  <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Their name" autoFocus />
                </div>

                <div style={{ marginTop: "auto", paddingBottom: 8 }}>
                  <button className="btn btn-primary btn-block" style={{ height: 48, opacity: name.trim() && !sending ? 1 : 0.5 }} disabled={!name.trim() || sending} onClick={send}>
                    <i className="ph ph-paper-plane-tilt" style={{ fontSize: 14 }} />
                    {sending ? "Sending…" : "Generate invite link"}
                  </button>
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <InfoBanner icon="ph-check-circle" tone="accent">
              {sent.name} was added to your roster as {sent.role === "friend" ? "a friend/family account" : "a client"}.
            </InfoBanner>

            <div className="cell">
              <div className="row" style={{ marginBottom: 8 }}>
                <span style={{ flex: 1, fontSize: 12.5, fontFamily: "var(--font-heading)" }}>Invite link</span>
                <span className="tag tag-neutral">Pending</span>
              </div>
              <div className="mu trunc" style={{ padding: "8px 10px", background: "var(--color-neutral-900)", borderRadius: 7, fontFamily: "monospace" }}>
                {sent.url}
              </div>
              <button className="btn btn-secondary btn-block" style={{ height: 44, marginTop: 8, fontSize: 12.5 }} onClick={copyLink}>
                {copied ? "Copied" : "Copy link to send yourself"}
              </button>
              <div className="mu" style={{ marginTop: 8, lineHeight: 1.6 }}>
                Opening it walks {sent.name.split(" ")[0]} through creating their own account. From then on{" "}
                {sent.role === "friend"
                  ? "they can build or clone their own programs — you can still view and edit anything they set up from their client page."
                  : "they only see the program you build for them."}
              </div>
            </div>

            <button className="btn btn-secondary btn-block" style={{ height: 44 }} onClick={() => setSent(null)}>
              Invite someone else
            </button>
          </>
        )}
      </div>
    </div>
  );
}
