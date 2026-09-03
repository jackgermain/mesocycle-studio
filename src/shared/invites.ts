/**
 * A coach-generated invite link, shared between the two apps the same way nutrition settings are —
 * one localStorage key both sides agree on, since there's no real backend to send an email through
 * or a server to hand out session tokens from. In a real product this would be a server-issued,
 * single-use, expiring token verified over the network; here it's a plain code anyone with the
 * browser's storage can read, so treat this as a UX simulation, not real access control.
 */

/** "client" is fully coach-prescribed, same as the existing demo flow. "friend" is self-directed — they
 * build or clone their own programs and still get nutrition tracking, but can't onboard anyone else and
 * can only message this coach. */
export type InviteRole = "client" | "friend";

export interface ClientInvite {
  code: string;
  clientId: string;
  clientName: string;
  role: InviteRole;
  createdAt: string;
  usedAt?: string;
}

const KEY = "mesocycle-invites";

function readAll(): Record<string, ClientInvite> {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    for (const invite of Object.values(parsed) as ClientInvite[]) {
      if (!invite.role) invite.role = "client";
    }
    return parsed;
  } catch {
    return {};
  }
}

function writeAll(all: Record<string, ClientInvite>) {
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function createInvite(clientId: string, clientName: string, role: InviteRole = "client"): ClientInvite {
  const all = readAll();
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  const invite: ClientInvite = { code, clientId, clientName, role, createdAt: new Date().toISOString() };
  all[code] = invite;
  writeAll(all);
  return invite;
}

export function getInvite(code: string): ClientInvite | null {
  return readAll()[code.toUpperCase().trim()] ?? null;
}

export function markInviteUsed(code: string) {
  const all = readAll();
  const invite = all[code.toUpperCase().trim()];
  if (invite) {
    invite.usedAt = new Date().toISOString();
    writeAll(all);
  }
}

export function findInviteForClient(clientId: string): ClientInvite | null {
  return Object.values(readAll()).find((i) => i.clientId === clientId) ?? null;
}
