import React, { useState } from "react";
import { deleteAccount } from "../../shared/deleteAccount";
import { InfoBanner } from "../../components/UI";

/** The confirmation for erasing someone.
 *
 * It asks for the person's first name to be typed rather than offering a single button. This app already
 * asks that much to end a mesocycle, and this is permanent deletion of another person's account -- a
 * weaker confirmation for the far heavier action would be the wrong way round. It also means a
 * mis-aimed thumb cannot do it. */
export function DeleteAccountSheet({
  accountId, name, role, onClose, onDeleted,
}: {
  accountId: string;
  name: string;
  role?: "coach" | "client" | "friend";
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [typed, setTyped] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const firstName = name.split(" ")[0];
  // One phrase for every account rather than the person's own name. A name is short, sometimes a single
  // common word, and on the wrong card it can be typed correctly by accident -- "delete account" cannot.
  const CONFIRM = "delete account";
  const matches = typed.trim().toLowerCase() === CONFIRM;

  async function go() {
    setWorking(true);
    setError(null);
    const result = await deleteAccount(accountId);
    setWorking(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onDeleted();
    onClose();
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ marginBottom: 4 }}>
          <div style={{ flex: 1 }}>
            <div className="scr" style={{ color: "var(--color-danger)" }}>Permanent</div>
            <div style={{ fontSize: "var(--text-md)", fontWeight: 600, marginTop: 2 }}>Delete {name}'s account</div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-neutral-500)", display: "flex", padding: 4 }}
          >
            <i className="ph ph-x" style={{ fontSize: 16 }} />
          </button>
        </div>

        {role === "coach" ? (
          <InfoBanner icon="ph-warning">
            {firstName} is a coach. Deleting them also deletes every client and friend on their roster, and
            all of those people's programs, logs and history. There is no undo.
          </InfoBanner>
        ) : (
          <InfoBanner icon="ph-warning">
            This erases their login and everything attached to it — programs, logged sessions, nutrition,
            weigh-ins, messages and form checks. There is no undo, and no way to restore it afterwards.
          </InfoBanner>
        )}

        <p className="mu" style={{ lineHeight: 1.6 }}>
          If they ever come back, they'll need a brand-new invite and a brand-new account. To revoke access
          without destroying anything, close this and use <b>Revoke access</b> instead.
        </p>

        <div className="field">
          <label>Type “delete account” to confirm</label>
          <input
            className="input"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoCapitalize="off"
            autoCorrect="off"
            placeholder="delete account"
          />
        </div>

        {error && <InfoBanner icon="ph-warning">{error}</InfoBanner>}

        <button
          className="btn btn-block"
          style={{
            height: 48,
            background: matches && !working ? "var(--color-danger)" : "var(--color-surface-raised)",
            color: matches && !working ? "#2a0808" : "var(--color-text-faint)",
            fontWeight: 700,
            cursor: matches && !working ? "pointer" : "not-allowed",
          }}
          disabled={!matches || working}
          onClick={go}
        >
          {working ? "Deleting…" : `Delete ${firstName} permanently`}
        </button>
      </div>
    </div>
  );
}
