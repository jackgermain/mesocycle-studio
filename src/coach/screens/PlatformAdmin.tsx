import React, { useEffect, useState } from "react";
import { BackHeader, InfoBanner } from "../../components/UI";
import { supabase } from "../../lib/supabase";
import { listAccountsForAdmin, type AdminAccount } from "../../shared/deleteAccount";
import { DeleteAccountSheet } from "../components/DeleteAccountSheet";

type Filter = "all" | "coach" | "client" | "friend";

const ROLE_LABEL: Record<string, string> = { coach: "Coach", client: "Client", friend: "Friend/family" };

/** Platform-owner only. Lists every account on the platform -- name, role, whose roster they're on,
 * signup date, access status -- and lets this account revoke, restore, or permanently delete one.
 *
 * Still deliberately narrow about what it shows: no rosters, no programs, no logged data. Every RPC it
 * calls is a security-definer function that returns exactly these fields and nothing more (migrations
 * 0010 and 0017), so the limit is enforced by the shape of the functions, not by what this screen
 * happens to render. */
export default function PlatformAdmin() {
  const [accounts, setAccounts] = useState<AdminAccount[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [deleting, setDeleting] = useState<AdminAccount | null>(null);

  async function load() {
    setError(null);
    const rows = await listAccountsForAdmin();
    setAccounts(rows);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggle(a: AdminAccount) {
    setBusyId(a.id);
    const next = !a.active;
    // Only coaches go through the admin RPC; a coach's own people are handled by their coach, and this
    // function is scoped to coach accounts by design (migration 0010).
    const { error } = await supabase.rpc("set_coach_active_as_admin", { p_coach_id: a.id, p_active: next });
    setBusyId(null);
    if (error) setError(error.message);
    else setAccounts((prev) => prev?.map((x) => (x.id === a.id ? { ...x, active: next } : x)) ?? null);
  }

  const shown = (accounts ?? []).filter((a) => filter === "all" || a.role === filter);
  const counts = {
    all: accounts?.length ?? 0,
    coach: accounts?.filter((a) => a.role === "coach").length ?? 0,
    client: accounts?.filter((a) => a.role === "client").length ?? 0,
    friend: accounts?.filter((a) => a.role === "friend").length ?? 0,
  };

  return (
    <div className="screen">
      <BackHeader kicker="Platform" title="Accounts" />
      <div className="screen-scroll">
        <InfoBanner icon="ph-shield-check">
          Every account on the platform. You can see a name, role, signup date and access status here — not
          anyone's roster, programs or logged data.
        </InfoBanner>

        {error && <InfoBanner icon="ph-warning">{error}</InfoBanner>}

        <div className="row hscroll" style={{ gap: 6 }}>
          {(["all", "coach", "client", "friend"] as Filter[]).map((f) => (
            <button key={f} className={`chip${filter === f ? " on" : ""}`} onClick={() => setFilter(f)}>
              {f === "all" ? "Everyone" : ROLE_LABEL[f]} <span className="mono">{counts[f]}</span>
            </button>
          ))}
        </div>

        {accounts === null && !error && <div className="mu" style={{ textAlign: "center", padding: 20 }}>Loading…</div>}

        {shown.map((a) => (
          <div key={a.id} className="cell">
            <div className="row">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="trunc" style={{ fontSize: "var(--text-base)", fontWeight: 500 }}>{a.display_name}</div>
                <div className="mu" style={{ marginTop: 2 }}>
                  {ROLE_LABEL[a.role] ?? a.role}
                  {a.coach_name ? ` · with ${a.coach_name}` : ""}
                  {" · joined "}
                  {new Date(a.created_at).toLocaleDateString()}
                  {a.active ? "" : " · revoked"}
                </div>
              </div>
              {a.role === "coach" && (
                <button
                  className="btn btn-secondary"
                  style={{ height: 36, fontSize: 12.5, flex: "none", opacity: busyId === a.id ? 0.5 : 1, color: a.active ? "var(--color-neutral-300)" : "var(--color-accent)" }}
                  disabled={busyId === a.id}
                  onClick={() => toggle(a)}
                >
                  {a.active ? "Revoke" : "Restore"}
                </button>
              )}
            </div>
            <button
              className="btn btn-secondary btn-block"
              style={{ height: 36, fontSize: 12.5, marginTop: 8, color: "var(--color-danger)" }}
              onClick={() => setDeleting(a)}
            >
              Delete permanently
            </button>
          </div>
        ))}

        {accounts !== null && shown.length === 0 && (
          <div className="mu" style={{ textAlign: "center", padding: 20 }}>Nobody here.</div>
        )}
      </div>

      {deleting && (
        <DeleteAccountSheet
          accountId={deleting.id}
          name={deleting.display_name}
          role={deleting.role}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            // A deleted coach takes their roster with them (accounts.coach_id cascades), so the whole list
            // is reloaded rather than just dropping the one row -- otherwise the people who went with them
            // would sit here looking like live accounts until the next visit.
            void load();
          }}
        />
      )}
    </div>
  );
}
