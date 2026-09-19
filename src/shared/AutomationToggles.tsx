import React from "react";
import { useStore } from "../state/store";
import { useAuth } from "../lib/auth";
import { ownsTheirProgressions } from "./selfDirected";
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

/** Whether finishing a session programs next week automatically.
 *
 * **Self-directed accounts, which is a coach training themselves AND a General account.** It was coach-only
 * for a while, on the reading that "for general accounts they do not approve the loads, I do" meant a
 * General account should have no switch at all. That made it invisible on the one account Jack actually
 * tests on: *"the auto programming button in the train tab, which is actually gone for some reason. It
 * should be there."* Approving is not the same question as having the app do the work — a General account
 * directs its own training, so the switch is theirs, exactly as auto nutrition already is.
 *
 * **A prescribed client still gets no switch.** Their block belongs to their coach, and for them the app
 * proposes while the coach reviews. That is the difference between the two roles, not something a switch
 * should be able to erase.
 *
 * On means *applied*, not *suggested*. Jack: "I want the algorithm progressing reps, load etc, every week,
 * automatically… the last time you train that body part each week you have all the information you need to
 * do the programming for the following week." The coach still gets a record of what was written. */
export function ProgressionToggle() {
  const { state, dispatch } = useStore();
  const { account, previewingAsClient } = useAuth();
  // The same predicate ClientLayout uses to decide whether to apply or only propose — see selfDirected.ts.
  // A switch that renders on a different rule from the behaviour it controls is worse than no switch.
  if (!ownsTheirProgressions(account, previewingAsClient)) return null;

  // Absent means on — see ClientProfile.autoProgressions for why this is never a falsy check.
  const on = state.profile.autoProgressions !== false;
  return (
    <ToggleRow
      on={on}
      title="Auto training programming"
      hint={
        on
          ? "On — finishing a session works out next week's sets, reps and load and writes them into your program. You can still change any of it."
          : "Off — finishing a session works nothing out for next week."
      }
      onToggle={() => {
        dispatch({ type: "UPDATE_PROFILE", profile: { autoProgressions: !on } });
        dispatch({
          type: "SHOW_TOAST",
          message: !on
            ? "Auto training programming on — next week is set after each session."
            : "Auto training programming off — nothing will be worked out for next week.",
        });
        setTimeout(() => dispatch({ type: "CLEAR_TOAST" }), 2800);
      }}
    />
  );
}

/** Whether calories and macros are worked out from maintenance and a rate, or typed by hand.
 *
 * Unlike progressions, this one IS a General account's to switch: they own their own nutrition targets.
 * Jack: "they can enable nutrition coaching though." */
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
