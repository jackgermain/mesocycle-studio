import { DEFAULT_PROFILE_ID } from "./store";

/**
 * The client app has one route tree (/block, /progress, /nutrition…) but can be backed by
 * different people's data — Marcus, or the coach training themself. Which one is "active" is
 * chosen at the Landing screen and remembered here, so the same paths just resolve to whoever
 * was chosen last, without threading an id through every route and nav() call.
 */
const KEY = "mesocycle-active-profile";

export function getActiveProfileId(): string {
  try {
    return localStorage.getItem(KEY) ?? DEFAULT_PROFILE_ID;
  } catch {
    return DEFAULT_PROFILE_ID;
  }
}

export function setActiveProfileId(id: string) {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    // ignore — worst case the app falls back to the default profile next load
  }
}
