import { useStore } from "../state/store";
import { useAuth } from "../lib/auth";
import { sendSignals, EFFORT_ALERT_AT, EFFORT_WORDING } from "../shared/signals";
import { coachOnTheOtherEnd } from "../shared/coachName";
import type { WorkExercise } from "../data/types";

/** Stores a how-hard rating, and tells the coach when it is a 5. Shared by the exercise card, which asks
 * after the last set, and ending a session early, which asks on exercises that were started but not
 * finished -- one place, so a 5 reaches the coach the same way from both. */
export function useRecordEffort() {
  const { state, dispatch } = useStore();
  const { account } = useAuth();
  return (dayId: string, ex: WorkExercise, setId: string, effort: number) => {
    dispatch({ type: "SET_EFFORT", dayId, exerciseId: ex.id, setId, effort });
    if (effort < EFFORT_ALERT_AT || !account) return;
    // Only a 5 travels. Everything below it is ordinary training, and a roster rating a set an exercise
    // would bury a coach in notifications inside a day.
    void sendSignals(account.id, account.coach_id, [
      {
        kind: "effort",
        severity: effort,
        exercise: ex.name,
        muscle: ex.muscle ?? null,
        dayId,
        detail: "final set",
        note: `${EFFORT_WORDING[effort - 1]} on the final set of ${ex.name}.`,
      },
    ]);
    const coach = coachOnTheOtherEnd(account.coach_id, state.program.coachName);
    dispatch({
      type: "SHOW_TOAST",
      // Nothing was sent anywhere when there is no coach, so nothing is promised.
      message: coach ? `${coach} will see that.` : "Noted — that's on record for next week.",
    });
    setTimeout(() => dispatch({ type: "CLEAR_TOAST" }), 3000);
  };
}
