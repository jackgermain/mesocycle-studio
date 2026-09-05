import React, { useEffect, useState } from "react";
import { BackHeader, InfoBanner } from "../../components/UI";
import { supabase } from "../../lib/supabase";

interface AdminCoachRow {
  id: string;
  display_name: string;
  created_at: string;
  active: boolean;
}

/** Platform-owner only -- lists every independent coach account (name, signup date, active status) and
 * lets this account revoke or restore one's access. Deliberately shows nothing else about them: no
 * roster, no clients, no programs -- both RPCs this calls are narrow security-definer functions that
 * expose exactly this and nothing more (see supabase/migrations/0010_platform_admin.sql). */
export default function PlatformAdmin() {
  const [coaches, setCoaches] = useState<AdminCoachRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setError(null);
    const { data, error } = await supabase.rpc("list_coaches_for_admin");
    if (error) setError(error.message);
    else setCoaches((data ?? []) as AdminCoachRow[]);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggle(coach: AdminCoachRow) {
    setBusyId(coach.id);
    const next = !coach.active;
    const { error } = await supabase.rpc("set_coach_active_as_admin", { p_coach_id: coach.id, p_active: next });
    setBusyId(null);
    if (!error) setCoaches((prev) => prev?.map((c) => (c.id === coach.id ? { ...c, active: next } : c)) ?? null);
  }

  return (
    <div className="screen">
      <BackHeader kicker="Platform" title="Coach accounts" />
      <div className="screen-scroll">
        <InfoBanner icon="ph-shield-check">
          Every independent coach on the platform. You can only see their name, signup date, and access status here — not their roster, clients, or anything else they've set up.
        </InfoBanner>

        {error && <InfoBanner icon="ph-warning">{error}</InfoBanner>}

        {coaches === null && !error && <div className="mu" style={{ textAlign: "center", padding: 20 }}>Loading…</div>}

        {coaches?.map((c) => (
          <div key={c.id} className="cell row">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="trunc" style={{ fontSize: 14, fontFamily: "var(--font-heading)" }}>{c.display_name}</div>
              <div className="mu" style={{ marginTop: 2 }}>
                Joined {new Date(c.created_at).toLocaleDateString()} · {c.active ? "Active" : "Revoked"}
              </div>
            </div>
            <button
              className="btn btn-secondary"
              style={{ height: 36, fontSize: 12.5, flex: "none", opacity: busyId === c.id ? 0.5 : 1, color: c.active ? "var(--color-neutral-300)" : "var(--color-accent)" }}
              disabled={busyId === c.id}
              onClick={() => toggle(c)}
            >
              {c.active ? "Revoke" : "Restore"}
            </button>
          </div>
        ))}

        {coaches?.length === 0 && <div className="mu" style={{ textAlign: "center", padding: 20 }}>No other coach accounts yet.</div>}
      </div>
    </div>
  );
}
