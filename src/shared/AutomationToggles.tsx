import React from "react";
import { useStore } from "../state/store";
import { useAuth } from "../lib/auth";
import { TickButton } from "../components/UI";

/** The two "let the app work it out" switches, in one place so every surface can show the same control.
 *
 * Both started life written inline on a single screen each, which is exactly why they were impossible to
 * find: the training one only rendered inside DayWorkout -- today's ACTIVE session, so never on a rest day,
 * a finished session, or a day you were looking ahead at -- and the nutrition one only inside the macros
 * view, so an account that had never set food tracking up saw nothing at all.
 *
 * Each component carries its own gate, so a call site is one line and cannot get the gate wrong. */

function ToggleRow({ on, title, hint, onToggle }: { on: boolean; title: string; hint: string; onToggle: () => void }) {
  return (
    <button
      className="cell row"
      style={{ width: "100%", textAlign: "left", cursor: "pointer", alignItems: "flex-start", gap: 11 }}
      onClick={(e) => {
        // Several of these sit inside scroll areas with their own click handler for closing menus.
        e.stopPropagation();
        onToggle();
      }}
      aria-pressed={on}
    >
      <TickButton checked={on} size={22} style={{ marginTop: 1 }} />
      <span style={{ flex: 1 }}>
        <span style={{ display: "block", fontSize: 12.5, fontWeight: 600 }}>{title}</span>
        <span className="mu" style={{ display: "block", marginTop: 3 }}>{hint}</span>
      </span>
    </button>
  );
}

/** Whether finishing a session works next week's numbers out for review.
 *
 * Self-directed only: a coached client's progressions are their coach's mechanism and are not theirs to
 * switch off. That covers a General account and a coach training as themselves — which is every account
 * that can reach the Train tab without a coach behind it. */
export function ProgressionToggle() {
  const { state, dispatch } = useStore();
  const { account, previewingAsClient } = useAuth();
  const selfDirected = account?.role === "friend" || previewingAsClient;
  if (!selfDirected) return null;

  // Absent means on — see ClientProfile.autoProgressions for why this is never a falsy check.
  const on = state.profile.autoProgressions !== false;
  return (
    <ToggleRow
      on={on}
      title="Progression suggestions"
      hint={
        on
          ? "On — finishing a session works out next week's sets, reps and load for you to approve. Nothing changes your program on its own."
          : "Off — finishing a session works nothing out for next week."
      }
      onToggle={() => {
        dispatch({ type: "UPDATE_PROFILE", profile: { autoProgressions: !on } });
        dispatch({
          type: "SHOW_TOAST",
          message: !on
            ? "Progression suggestions on — next week's numbers come to you after each session."
            : "Progression suggestions off — nothing will be worked out for next week.",
        });
        setTimeout(() => dispatch({ type: "CLEAR_TOAST" }), 2800);
      }}
    />
  );
}

/** Whether calories and macros are worked out from maintenance and a rate, or typed by hand. */
export function AutoNutritionToggle() {
  const { state, dispatch } = useStore();
  const { account, previewingAsClient } = useAuth();
  const canSelfServe = (account?.role === "coach" && previewingAsClient) || account?.role === "friend";
  if (!canSelfServe) return null;

  const on = state.profile.autoNutrition ?? false;
  const tracking = state.profile.nutritionMode !== "off";
  return (
    <ToggleRow
      on={on}
      title="Auto nutrition programming"
      hint={
        !tracking
          ? "Works your calories and macros out from your maintenance and rate — takes effect once you turn food tracking on."
          : on
            ? "On — calories and macros are worked out from your maintenance and rate, held inside the cut cap."
            : "Off — the targets you typed stand. Turn on to have them worked out from maintenance and a rate."
      }
      onToggle={() => {
        dispatch({ type: "UPDATE_PROFILE", profile: { autoNutrition: !on } });
        dispatch({
          type: "SHOW_TOAST",
          message: !on ? "Auto nutrition on — targets follow your maintenance and rate." : "Auto nutrition off — your typed targets stand.",
        });
        setTimeout(() => dispatch({ type: "CLEAR_TOAST" }), 2800);
      }}
    />
  );
}
