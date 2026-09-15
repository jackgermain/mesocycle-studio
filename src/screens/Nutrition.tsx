import React, { useEffect, useState } from "react";
import { useStore } from "../state/store";
import { useEffectiveProfile } from "../state/useEffectiveProfile";
import { useAuth } from "../lib/auth";
import { sendSignals } from "../shared/signals";
import { isNutritionAlerting, KCAL_TOLERANCE } from "../shared/signalScales";
import { coachOnTheOtherEnd } from "../shared/coachName";
import { isoToday } from "../shared/dayStatus";
import { mealDayLabel, mealNamesForNewDay, mealsOn, shiftIsoDate, weekdayOf } from "../shared/mealDays";
import { TabBar } from "../components/TabBar";
import { InfoBanner, Meter, HeroHeader, BackHeader, TickButton } from "../components/UI";
import { NutritionForm } from "../shared/NutritionForm";
import { AutoNutritionToggle } from "../shared/AutomationToggles";
import FoodSearchSheet from "./FoodSearchSheet";
import type { FoodItem } from "../data/foodDatabase";
import type { PortionCategory, LoggedFoodItem, MealSection } from "../data/types";
import { dailyDeltaKcal, rateLabel, weeklyChangeLb } from "../shared/nutritionPlan";

const PORTION_ICON: Record<PortionCategory, string> = {
  Protein: "ph-hand-palm",
  Carbs: "ph-hand-deposit",
  Vegetables: "ph-hand-fist",
  Fat: "ph-hand-pointing",
};

/** The day this screen is showing, and the way between days.
 *
 * The same ‹ calendar › cluster as the train tab's DayNavControls, in the same place, because Jack asked
 * for it in those words: "an arrow on the right or the left somewhere like on the train tab where I can
 * view yesterday's macros or view tomorrow's". The middle button goes back to today — the one destination
 * you always want after browsing, and the only way back that does not involve counting taps. */
function NutritionDayNav({ date, onChange }: { date: string; onChange: (d: string) => void }) {
  const today = isoToday();
  const arrow: React.CSSProperties = {
    background: "none",
    border: "none",
    display: "flex",
    padding: 7,
    color: "var(--color-neutral-300)",
    cursor: "pointer",
  };
  return (
    <div className="row" style={{ gap: 6, width: "100%" }}>
      <button onClick={() => onChange(shiftIsoDate(date, -1))} aria-label="Previous day" style={arrow}>
        <i className="ph ph-caret-left" style={{ fontSize: 16 }} />
      </button>
      <button
        onClick={() => onChange(today)}
        disabled={date === today}
        aria-label={date === today ? "Showing today" : "Back to today"}
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 7,
          height: 36,
          borderRadius: "var(--radius-md)",
          background: date === today ? "transparent" : "var(--color-surface-raised)",
          border: `1px solid ${date === today ? "var(--color-divider)" : "var(--color-accent)"}`,
          color: date === today ? "var(--color-neutral-300)" : "var(--color-accent-200)",
          fontSize: 12.5,
          cursor: date === today ? "default" : "pointer",
        }}
      >
        <i className="ph ph-calendar" style={{ fontSize: 14 }} />
        {mealDayLabel(date, today)}
      </button>
      <button onClick={() => onChange(shiftIsoDate(date, 1))} aria-label="Next day" style={arrow}>
        <i className="ph ph-caret-right" style={{ fontSize: 16 }} />
      </button>
    </div>
  );
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function totalsFor(items: { kcal: number; protein: number; carbs: number; fat: number }[]) {
  const raw = items.reduce((acc, i) => ({ kcal: acc.kcal + i.kcal, p: acc.p + i.protein, c: acc.c + i.carbs, f: acc.f + i.fat }), { kcal: 0, p: 0, c: 0, f: 0 });
  return { kcal: Math.round(raw.kcal), p: round1(raw.p), c: round1(raw.c), f: round1(raw.f) };
}

/** The seven days ending on the one being viewed.
 *
 * This was a hardcoded array that always claimed the same six-of-seven days on target whatever anyone had
 * eaten. That was merely useless while the screen only ever showed "today"; it became a fabrication the
 * moment the arrows let you look at the very days it was describing. Now that meals carry a date it is
 * just arithmetic, and it is what makes the arrows worth pressing — you can see which days have anything
 * in them before you go there. */
function WeekStrip({ meals, viewDate, kcalTarget }: { meals: MealSection[]; viewDate: string; kcalTarget: number }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = shiftIsoDate(viewDate, i - 6);
    const items = mealsOn(meals, date).flatMap((m) => m.items.filter((f) => f.eaten !== false));
    return {
      date,
      letter: weekdayOf(date).slice(0, 1),
      logged: items.length > 0,
      onTarget: items.length > 0 && Math.abs(totalsFor(items).kcal - kcalTarget) <= KCAL_TOLERANCE,
    };
  });
  const hit = days.filter((d) => d.onTarget).length;
  const logged = days.filter((d) => d.logged).length;

  return (
    <div>
      <div className="sh">Week · {hit} of {logged || 7} days on target</div>
      <div className="cell">
        <div style={{ display: "flex", gap: 5 }}>
          {days.map((d) => (
            <div key={d.date} style={{ flex: 1, textAlign: "center" }}>
              <div
                style={{
                  height: 26,
                  borderRadius: 6,
                  // Three states, not two: on target, logged but off it, and nothing logged at all — which
                  // is a different fact from a bad day and must not be coloured like one.
                  background: d.onTarget ? "var(--color-accent-800)" : d.logged ? "var(--color-neutral-700)" : "transparent",
                  border: d.date === viewDate ? "1px solid var(--color-accent)" : d.logged ? undefined : "1px solid var(--color-divider)",
                }}
              />
              <div className="scr" style={{ marginTop: 4, color: d.date === viewDate ? "var(--color-accent)" : undefined }}>{d.letter}</div>
            </div>
          ))}
        </div>
        <div className="mu" style={{ marginTop: 10 }}>
          Within <span className="num">{KCAL_TOLERANCE}</span> kcal of your target counts as on target.
        </div>
      </div>
    </div>
  );
}

export default function Nutrition() {
  const { state, dispatch } = useStore();
  const profile = useEffectiveProfile();
  const target = profile.macroTargets;
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showNutritionOptions, setShowNutritionOptions] = useState(false);
  const { account, previewingAsClient } = useAuth();
  const [settingUp, setSettingUp] = useState(false);
  const [editingTargets, setEditingTargets] = useState(false);
  // A coach training themselves, or a self-directed friend/family account, has no external coach setting
  // their nutrition for them — let them set (and later change) their own targets instead of just telling
  // them to "ask their coach" (which would be themselves, for the train-yourself case).
  const canSelfServe = (account?.role === "coach" && previewingAsClient) || account?.role === "friend";

  /* Which day is on screen. Defaults to today, every time the tab is opened. */
  const [viewDate, setViewDate] = useState(isoToday());
  const dayMeals = mealsOn(state.meals, viewDate);

  /** The rollover.
   *
   * Opening the tab on a new day gives you an empty day, WITHOUT yesterday needing to have been submitted
   * first. Submitting is "close and file this day", not "unlock the next one" — forgetting to submit on
   * Monday must never leave you unable to log on Tuesday, which is exactly the state Jack's screenshot was
   * in: Tuesday showing Monday's food, Monday's calories already counted against Tuesday's target.
   *
   * Only TODAY seeds itself. Arrowing back to a day you logged nothing on has to show that it was empty
   * rather than inventing sections for it after the fact, and a future day gets its sections when you
   * actually add one. */
  const needsSeeding = profile.nutritionMode !== "off" && viewDate === isoToday() && dayMeals.length === 0;
  useEffect(() => {
    if (!needsSeeding) return;
    for (const name of mealNamesForNewDay(state.meals, viewDate)) dispatch({ type: "ADD_MEAL", name, date: viewDate });
  }, [needsSeeding, viewDate, state.meals, dispatch]);

  if (settingUp || editingTargets) {
    return (
      <div className="screen">
        <BackHeader kicker="Nutrition" title={editingTargets ? "Edit targets" : "Set up tracking"} onBack={() => { setSettingUp(false); setEditingTargets(false); }} />
        <NutritionForm
          profile={profile}
          onSave={(protocol) => {
            dispatch({ type: "SET_NUTRITION_PROTOCOL", protocol });
            if (protocol.nutritionMode !== "off" && state.meals.length === 0) {
              for (const name of ["Meal 1", "Meal 2", "Meal 3"]) dispatch({ type: "ADD_MEAL", name, date: isoToday() });
            }
            dispatch({ type: "SHOW_TOAST", message: editingTargets ? "Nutrition targets updated." : "Nutrition tracking is on." });
            setTimeout(() => dispatch({ type: "CLEAR_TOAST" }), 2800);
            setSettingUp(false);
            setEditingTargets(false);
          }}
        />
      </div>
    );
  }

  if (profile.nutritionMode === "off") {
    return (
      <div className="screen">
        <HeroHeader kicker="Nutrition" title="Not turned on" />
        <div className="screen-scroll">
          <InfoBanner icon="ph-fork-knife">
            {canSelfServe
              ? "Nothing set up yet — since you're self-directed, you can set your own tracking style and targets."
              : `${state.program.coachName} hasn't turned on food tracking for you yet. Ask them if you'd like to log meals and get targets.`}
          </InfoBanner>
          {canSelfServe && (
            <button className="btn btn-primary btn-block" style={{ height: 48 }} onClick={() => setSettingUp(true)}>
              Set up nutrition tracking
            </button>
          )}
          <AutoNutritionToggle />
        </div>
        <TabBar />
      </div>
    );
  }

  if (profile.nutritionMode === "portions") {
    return (
      <PortionsNutrition
        canSelfServe={canSelfServe}
        onEditTargets={() => setEditingTargets(true)}
        viewDate={viewDate}
        onChangeDate={setViewDate}
        dayMeals={dayMeals}
      />
    );
  }

  // Only what was actually ticked counts. `eaten === false` is the planned-but-not-eaten case; undefined
  // is anything logged before this existed and still counts, so nobody's history zeroed itself overnight.
  const eatenItems = (m: { items: LoggedFoodItem[] }) => m.items.filter((i) => i.eaten !== false);
  const totals = totalsFor(dayMeals.flatMap(eatenItems));
  const kcalTarget = target.kcal + target.trainingDayCarbBonus * 4;
  const left = Math.max(0, kcalTarget - totals.kcal);

  /** Why the target is the number it is.
   *
   * Jack, looking at a 2,699 target while eating 3,350: "why is my calories say 2700 goal if my my intake
   * is 3350?" Nothing was wrong -- every target is an offset from maintenance (N1), and his rate was set to
   * a cut -- but the card showed only the result, so the two numbers that produced it were nowhere on
   * screen and the only way to find out was to ask.
   *
   * Read off the STORED maintenance and rate rather than rebuilt with buildPlan. Recomputing here would put
   * a second, slightly different target beside the one already displayed -- macrosFor reports the true sum
   * of the rounded grams, which is why the card reads 2,699 against a 2,700 target. */
  const ratePct = profile.rateTargetPct;
  const working =
    profile.maintenanceKcal != null && ratePct != null
      ? {
          maintenance: profile.maintenanceKcal,
          label: rateLabel(ratePct),
          lbPerWeek: weeklyChangeLb(profile.bodyweight, ratePct),
          delta: dailyDeltaKcal(weeklyChangeLb(profile.bodyweight, ratePct)),
        }
      : null;

  /** Submit a meal, and tell the coach once the whole day is in and landed off target.
   *
   * Fired on the last submission rather than per meal: a coach does not need to know breakfast was light,
   * they need to know the day finished 700 under. "The whole day is in" means every meal that has
   * anything in it has been submitted — an empty Meal 4 nobody used should not hold the day open forever.
   */
  function submitMeal(mealId: string) {
    dispatch({ type: "SUBMIT_MEAL", mealId });

    // Scoped to the day on screen. Across the whole list this could never fire once there was more than a
    // day of history in it, because some meal from a previous day was always still open.
    const after = dayMeals.map((m) => (m.id === mealId ? { ...m, submittedAt: isoToday() } : m));
    const withFood = after.filter((m) => m.items.length > 0);
    if (withFood.length === 0 || withFood.some((m) => !m.submittedAt)) return;
    if (state.nutritionAlertSentOn === viewDate) return;

    const dayKcal = totalsFor(after.flatMap(eatenItems)).kcal;
    const miss = dayKcal - kcalTarget;
    if (!isNutritionAlerting(miss) || !account) return;

    dispatch({ type: "MARK_NUTRITION_ALERT_SENT", date: viewDate });
    const under = miss < 0;
    void sendSignals(account.id, account.coach_id, [
      {
        kind: "nutrition",
        // Not a 1..5 scale: the magnitude of the miss, so the coach sees how far off without asking.
        severity: Math.abs(miss),
        detail: under ? "under" : "over",
        // Named when it is not today's, since a day filed late reads as today's otherwise.
        note: `${viewDate === isoToday() ? "Day" : mealDayLabel(viewDate, isoToday())} finished ${Math.abs(miss)} kcal ${under ? "under" : "over"} — ${dayKcal} of ${kcalTarget}.`,
      },
    ]);
    const coach = coachOnTheOtherEnd(account.coach_id, state.program.coachName);
    dispatch({
      type: "SHOW_TOAST",
      message: coach
        ? `Day logged · ${Math.abs(miss)} kcal ${under ? "under" : "over"}. ${coach} will see it.`
        : `Day logged · ${Math.abs(miss)} kcal ${under ? "under" : "over"}.`,
    });
    setTimeout(() => dispatch({ type: "CLEAR_TOAST" }), 3400);
  }

  function addFoodTo(mealId: string, food: FoodItem, servings: number) {
    // Two decimals -- the same precision FoodSearchSheet already shows while you are choosing it. Typing a
    // gram weight against a "1 cup (158g)" food produced 3.9556962025316458 servings and the meal row
    // printed every digit of it. Rounded HERE rather than only at display, so the macros are scaled from
    // the number that actually gets stored and a row's parts still agree with its total.
    const rounded = Math.round(servings * 100) / 100;
    const scaled = { kcal: Math.round(food.kcal * rounded), protein: Math.round(food.protein * rounded * 10) / 10, carbs: Math.round(food.carbs * rounded * 10) / 10, fat: Math.round(food.fat * rounded * 10) / 10 };
    dispatch({
      type: "ADD_FOOD_ITEM",
      mealId,
      item: { id: `li-${Date.now()}`, foodId: food.id, name: food.name, servingLabel: food.servingLabel, servings: rounded, ...scaled },
    });
  }

  function addSection(kind: "Meal" | "Snack") {
    // Counted within the DAY. Numbering off the whole list made a fresh Tuesday's first meal "Meal 4",
    // because Monday's three were still sitting in there.
    const count = dayMeals.filter((m) => m.name.startsWith(kind)).length;
    dispatch({ type: "ADD_MEAL", name: `${kind} ${count + 1}`, date: viewDate });
    setShowAddMenu(false);
  }

  // Both read off the day being VIEWED. Matched on the session's real date rather than its derived
  // "today" status, so arrowing to another day says whether that day trains, not whether this one does.
  const todayLabel = weekdayOf(viewDate);
  const hasTrainingToday = state.program.weeks.some((w) => w.days.some((d) => d.date === viewDate));

  return (
    <div className="screen">
      <HeroHeader
        kicker={`${todayLabel} · ${hasTrainingToday ? "training day" : "rest day"}`}
        title="Nutrition"
        right={
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowAddMenu((v) => !v)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex" }} aria-label="Add a meal or snack">
              <i className="ph ph-plus-circle" style={{ fontSize: 20, color: "var(--color-accent)" }} />
            </button>
            {showAddMenu && (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{ position: "absolute", top: 32, right: 0, zIndex: 10, width: 150, background: "var(--color-surface-raised)", border: "1px solid var(--color-divider)", borderRadius: 8, boxShadow: "var(--shadow-md)", overflow: "hidden" }}
              >
                <button className="link-row" style={{ padding: "9px 11px", borderRadius: 0 }} onClick={() => addSection("Meal")}>
                  <i className="ph ph-fork-knife" style={{ fontSize: 14, color: "var(--color-accent)" }} />
                  <span style={{ fontSize: 12.5 }}>Add a meal</span>
                </button>
                <button className="link-row" style={{ padding: "9px 11px", borderRadius: 0 }} onClick={() => addSection("Snack")}>
                  <i className="ph ph-cookie" style={{ fontSize: 14, color: "var(--color-accent)" }} />
                  <span style={{ fontSize: 12.5 }}>Add a snack</span>
                </button>
              </div>
            )}
          </div>
        }
      >
        <NutritionDayNav date={viewDate} onChange={setViewDate} />
      </HeroHeader>
      <div className="screen-scroll" onClick={() => showAddMenu && setShowAddMenu(false)}>
        <div className="cell elev-sm" style={{ position: "relative" }}>
          {canSelfServe && (
            <button
              onClick={() => setShowNutritionOptions(true)}
              aria-label="Nutrition options"
              style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", cursor: "pointer", color: "var(--color-neutral-500)", display: "flex", padding: 4 }}
            >
              <i className="ph ph-dots-three-vertical" style={{ fontSize: 16 }} />
            </button>
          )}
          <div className="row" style={{ alignItems: "baseline", marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div className="scr">Calories left</div>
              <div className="num" style={{ fontSize: 21, lineHeight: 1.1, marginTop: 3 }}>{left}</div>
            </div>
            <div style={{ textAlign: "right", paddingRight: canSelfServe ? 20 : 0 }}>
              <div className="mu"><span className="num">{totals.kcal.toLocaleString()}</span> of <span className="num">{kcalTarget.toLocaleString()}</span></div>
              <div className="mu" style={{ marginTop: 2 }}>{canSelfServe ? "Your target" : `${state.program.coachName}'s target`}</div>
            </div>
          </div>
          <Meter pct={(totals.kcal / kcalTarget) * 100} large />
          {/* The arithmetic behind the target, in one line. Shown whenever both numbers exist, including to
              a coached client: it explains a figure they are already being held to rather than handing them
              a control over it. */}
          {working && (
            <div className="mu" style={{ marginTop: 10 }}>
              <span className="num">{working.maintenance.toLocaleString()}</span> maintenance
              {working.delta === 0
                ? " · holding steady"
                : ` · ${working.label.toLowerCase()} ${working.delta > 0 ? "+" : ""}${working.delta.toLocaleString()}/day (${working.lbPerWeek > 0 ? "+" : ""}${working.lbPerWeek} lb a week)`}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <MacroCol label="Protein" value={totals.p} target={target.protein} color="var(--color-accent)" valueColor="var(--color-accent-300)" />
            <MacroCol label="Carbs" value={totals.c} target={target.carbs + target.trainingDayCarbBonus} color="var(--color-neutral-500)" />
            <MacroCol label="Fat" value={totals.f} target={target.fat} color="var(--color-neutral-500)" />
          </div>
        </div>

        <AutoNutritionToggle />

        {/* On the tab, not behind the ⋮ menu. Once tracking is set up there was no visible way back to the
            numbers — you had to know the options sheet existed. */}
        {canSelfServe && (
          <button className="link-row" style={{ padding: "11px 12px" }} onClick={() => setEditingTargets(true)}>
            <i className="ph ph-sliders-horizontal" style={{ fontSize: 16, color: "var(--color-accent-300)" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5 }}>Change macros</div>
              <div className="mu" style={{ marginTop: 1 }}>Calories, protein, carbs and fat, your rate, and weigh-in days.</div>
            </div>
            <i className="ph ph-caret-right" style={{ fontSize: 14, color: "var(--color-neutral-600)" }} />
          </button>
        )}

        {dayMeals.map((meal) => {
          const eaten = eatenItems(meal);
          const mealTotals = totalsFor(eaten);
          const submitted = !!meal.submittedAt;
          return (
            <div key={meal.id}>
              <div className="row" style={{ marginBottom: 6 }}>
                <div className="sh" style={{ flex: 1, margin: 0 }}>{meal.name}</div>
                {meal.items.length > 0 && (
                  <span className="mu">
                    <span className="num" style={{ fontWeight: 700, color: "var(--color-neutral-300)" }}>{mealTotals.kcal}</span> kcal
                  </span>
                )}
                <button
                  onClick={() => dispatch({ type: "REMOVE_MEAL", mealId: meal.id })}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-neutral-600)", display: "flex", padding: 2, marginLeft: 6 }}
                  aria-label={`Remove ${meal.name}`}
                >
                  <i className="ph ph-x" style={{ fontSize: 12 }} />
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {meal.items.map((item) => {
                  const ticked = item.eaten !== false;
                  return (
                  <div key={item.id} className="cell row" style={{ background: ticked ? "var(--color-accent-tint)" : undefined }}>
                    {/* Same gesture as checking off a set, and the same control, so it reads as the same
                        act rather than a new one to learn. */}
                    <TickButton
                      checked={ticked}
                      size={22}
                      onClick={() => dispatch({ type: "TOGGLE_FOOD_EATEN", mealId: meal.id, itemId: item.id })}
                      label={ticked ? `Mark ${item.name} as not eaten` : `Mark ${item.name} as eaten`}
                    />
                    <div style={{ flex: 1, minWidth: 0, opacity: ticked ? 1 : 0.62 }}>
                      <div className="trunc" style={{ fontSize: "var(--text-base)", fontWeight: 500 }}>{item.name}</div>
                      <div className="mu trunc" style={{ marginTop: 2 }}>
                        {/* Rounded at display as well as at write, because anything logged before the
                            write-side fix is still carrying its full float. */}
                        <span className="num">{Math.round(item.servings * 100) / 100}×</span> {item.servingLabel} ·{" "}
                        <span className="num">
                          {item.protein}p · {item.carbs}c · {item.fat}f
                        </span>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flex: "none", display: "flex", alignItems: "center", gap: 10 }}>
                      <div className="num" style={{ fontWeight: 700, fontSize: 13 }}>{item.kcal}</div>
                      <button
                        onClick={() => dispatch({ type: "REMOVE_FOOD_ITEM", mealId: meal.id, itemId: item.id })}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-neutral-600)", display: "flex" }}
                        aria-label={`Remove ${item.name}`}
                      >
                        <i className="ph ph-x" style={{ fontSize: 14 }} />
                      </button>
                    </div>
                  </div>
                  );
                })}
                {!submitted && (
                  <button
                    onClick={() => setAddingTo(meal.id)}
                    className="add-row"
                  >
                    + Add food to {meal.name.toLowerCase()}
                  </button>
                )}

                {/* The finishing act, the way an exercise is finished rather than merely started. Nothing
                    is hidden behind it -- the ticked items already count -- but a coach can tell the
                    difference between a meal someone is midway through and one they are done with, which
                    is the whole point of asking for it. */}
                {/* Set apart from "add food" above it. They are opposite acts -- one keeps the meal open,
                    one closes it -- and sitting them 7px apart in the same stack read as a pair of
                    equally-weighted choices. */}
                {meal.items.length > 0 && (
                  submitted ? (
                    <div className="row" style={{ gap: 8, marginTop: 5 }}>
                      <span className="mu row" style={{ flex: 1, gap: 6, width: "auto" }}>
                        <i className="ph-fill ph-check-circle" style={{ fontSize: 14, color: "var(--color-accent)" }} />
                        Logged · {eaten.length} of {meal.items.length}
                      </span>
                      <button className="btn btn-ghost" style={{ fontSize: 12.5 }} onClick={() => dispatch({ type: "REOPEN_MEAL", mealId: meal.id })}>
                        Edit
                      </button>
                    </div>
                  ) : (
                    <button
                      // btn-primary, matching "Add to Meal 1" on the food sheet: this is the same class
                      // of act -- the one green thing that finishes what you came here to do -- and it
                      // was rendering in btn-solid's grey, which reads as secondary.
                      className="btn btn-primary btn-block"
                      style={{ height: 48, fontSize: 14, marginTop: 5, opacity: eaten.length ? 1 : 0.45 }}
                      disabled={!eaten.length}
                      onClick={() => submitMeal(meal.id)}
                    >
                      {eaten.length ? `Log ${meal.name.toLowerCase()} · ${mealTotals.kcal} kcal` : "Tick what you ate"}
                    </button>
                  )
                )}
              </div>
            </div>
          );
        })}

        <WeekStrip meals={state.meals} viewDate={viewDate} kcalTarget={kcalTarget} />
      </div>
      <TabBar />

      {addingTo && (
        <FoodSearchSheet
          mealName={dayMeals.find((m) => m.id === addingTo)?.name ?? "meal"}
          onAdd={(food, servings) => addFoodTo(addingTo, food, servings)}
          onClose={() => setAddingTo(null)}
        />
      )}

      {showNutritionOptions && (
        <div className="sheet-backdrop" onClick={() => setShowNutritionOptions(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="row" style={{ marginBottom: 4 }}>
              <div style={{ flex: 1 }}>
                <div className="scr">Nutrition</div>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>Options</div>
              </div>
              <button onClick={() => setShowNutritionOptions(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-neutral-500)" }}>
                <i className="ph ph-x" style={{ fontSize: 16 }} />
              </button>
            </div>
            <button className="link-row" style={{ padding: "11px 12px" }} onClick={() => { setShowNutritionOptions(false); setEditingTargets(true); }}>
              <i className="ph ph-sliders-horizontal" style={{ fontSize: 16, color: "var(--color-accent-300)" }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5 }}>Nutrition settings</div>
                <div className="mu" style={{ marginTop: 1 }}>Auto programming, maintenance and rate, and your calorie/macro goals.</div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function fmtPortionQty(unit: string, qty: number) {
  if (unit === "plate") {
    const map: Record<number, string> = { 0.25: "1/4", 0.33: "1/3", 0.5: "1/2", 1: "whole" };
    return `${map[qty] ?? qty} plate`;
  }
  return `${qty} ${unit}${qty === 1 ? "" : "s"}`;
}

function PortionsNutrition({
  canSelfServe,
  onEditTargets,
  viewDate,
  // Aliased to the setter name the macros screen uses, so both render the same day-nav line.
  onChangeDate: setViewDate,
  dayMeals,
}: {
  canSelfServe: boolean;
  onEditTargets: () => void;
  viewDate: string;
  onChangeDate: (d: string) => void;
  dayMeals: MealSection[];
}) {
  const { state, dispatch } = useStore();
  const profile = useEffectiveProfile();
  const targets = profile.portionTargets;
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showNutritionOptions, setShowNutritionOptions] = useState(false);

  function addSection(kind: "Meal" | "Snack") {
    // Counted within the DAY. Numbering off the whole list made a fresh Tuesday's first meal "Meal 4",
    // because Monday's three were still sitting in there.
    const count = dayMeals.filter((m) => m.name.startsWith(kind)).length;
    dispatch({ type: "ADD_MEAL", name: `${kind} ${count + 1}`, date: viewDate });
    setShowAddMenu(false);
  }

  const totalSlots = dayMeals.length * targets.length;
  const hitSlots = dayMeals.reduce((sum, m) => sum + (m.portionsHit?.length ?? 0), 0);

  // Both read off the day being VIEWED. Matched on the session's real date rather than its derived
  // "today" status, so arrowing to another day says whether that day trains, not whether this one does.
  const todayLabel = weekdayOf(viewDate);
  const hasTrainingToday = state.program.weeks.some((w) => w.days.some((d) => d.date === viewDate));

  return (
    <div className="screen">
      <HeroHeader
        kicker={`${todayLabel} · ${hasTrainingToday ? "training day" : "rest day"}`}
        title="Nutrition"
        right={
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowAddMenu((v) => !v)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex" }} aria-label="Add a meal or snack">
              <i className="ph ph-plus-circle" style={{ fontSize: 20, color: "var(--color-accent)" }} />
            </button>
            {showAddMenu && (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{ position: "absolute", top: 32, right: 0, zIndex: 10, width: 150, background: "var(--color-surface-raised)", border: "1px solid var(--color-divider)", borderRadius: 8, boxShadow: "var(--shadow-md)", overflow: "hidden" }}
              >
                <button className="link-row" style={{ padding: "9px 11px", borderRadius: 0 }} onClick={() => addSection("Meal")}>
                  <i className="ph ph-fork-knife" style={{ fontSize: 14, color: "var(--color-accent)" }} />
                  <span style={{ fontSize: 12.5 }}>Add a meal</span>
                </button>
                <button className="link-row" style={{ padding: "9px 11px", borderRadius: 0 }} onClick={() => addSection("Snack")}>
                  <i className="ph ph-cookie" style={{ fontSize: 14, color: "var(--color-accent)" }} />
                  <span style={{ fontSize: 12.5 }}>Add a snack</span>
                </button>
              </div>
            )}
          </div>
        }
      >
        <NutritionDayNav date={viewDate} onChange={setViewDate} />
      </HeroHeader>
      <div className="screen-scroll" onClick={() => showAddMenu && setShowAddMenu(false)}>
        <InfoBanner icon="ph-hand-palm">
          No calorie counting — just hit your portions each meal. {canSelfServe ? "You set these targets." : `${state.program.coachName} set these targets for you.`}
        </InfoBanner>

        <AutoNutritionToggle />

        {canSelfServe && (
          <button className="link-row" style={{ padding: "11px 12px" }} onClick={onEditTargets}>
            <i className="ph ph-sliders-horizontal" style={{ fontSize: 16, color: "var(--color-accent-300)" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5 }}>Change portions</div>
              <div className="mu" style={{ marginTop: 1 }}>Portion sizes, how you track, and weigh-in days.</div>
            </div>
            <i className="ph ph-caret-right" style={{ fontSize: 14, color: "var(--color-neutral-600)" }} />
          </button>
        )}

        <div className="cell elev-sm" style={{ position: "relative" }}>
          {canSelfServe && (
            <button
              onClick={() => setShowNutritionOptions(true)}
              aria-label="Nutrition options"
              style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", cursor: "pointer", color: "var(--color-neutral-500)", display: "flex", padding: 4 }}
            >
              <i className="ph ph-dots-three-vertical" style={{ fontSize: 16 }} />
            </button>
          )}
          <div className="row" style={{ alignItems: "baseline", marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <div className="scr">Portions today</div>
              <div className="num" style={{ fontWeight: 700, fontSize: 21, lineHeight: 1.1, marginTop: 3 }}>
                {hitSlots} <span style={{ fontSize: 14, color: "var(--color-neutral-500)" }}>of {totalSlots || targets.length}</span>
              </div>
            </div>
          </div>
          <Meter pct={totalSlots ? (hitSlots / totalSlots) * 100 : 0} large />
        </div>

        {dayMeals.map((meal) => {
          const hit = meal.portionsHit ?? [];
          return (
            <div key={meal.id}>
              <div className="row" style={{ marginBottom: 6 }}>
                <div className="sh" style={{ flex: 1, margin: 0 }}>{meal.name}</div>
                <span className="mu">
                  <span className="num" style={{ fontWeight: 700, color: "var(--color-neutral-300)" }}>{hit.length}</span> of{" "}
                  <span className="num" style={{ fontWeight: 700, color: "var(--color-neutral-300)" }}>{targets.length}</span>
                </span>
                <button
                  onClick={() => dispatch({ type: "REMOVE_MEAL", mealId: meal.id })}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-neutral-600)", display: "flex", padding: 2, marginLeft: 6 }}
                  aria-label={`Remove ${meal.name}`}
                >
                  <i className="ph ph-x" style={{ fontSize: 12 }} />
                </button>
              </div>
              <div className="cell">
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {targets.map((t) => {
                    const on = hit.includes(t.category);
                    return (
                      <button
                        key={t.category}
                        onClick={() => dispatch({ type: "TOGGLE_PORTION", mealId: meal.id, category: t.category })}
                        className="row"
                        style={{
                          padding: "10px 12px",
                          borderRadius: "var(--radius-md)",
                          border: `1px solid ${on ? "var(--color-accent)" : "var(--color-divider)"}`,
                          background: on ? "var(--color-accent-900)" : "transparent",
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        {/* Non-interactive on purpose: the whole row is the button, and nesting one button
                            inside another is invalid HTML. */}
                        <TickButton checked={on} size={22} style={{ marginRight: 10 }} />
                        <i className={`ph ${PORTION_ICON[t.category]}`} style={{ fontSize: 16, color: on ? "var(--color-accent-300)" : "var(--color-neutral-500)", marginRight: 10 }} />
                        <div style={{ flex: 1, opacity: on ? 1 : 0.62 }}>
                          <div style={{ fontSize: 12.5, color: on ? "var(--color-accent-200)" : "var(--color-neutral-200)" }}>{t.category}</div>
                          <div className="mu" style={{ marginTop: 1 }}>{fmtPortionQty(t.unit, t.qty)}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Same finishing act as a macros meal, so both modes close a meal the same way. */}
              {hit.length > 0 && (
                meal.submittedAt ? (
                  <div className="row" style={{ gap: 8, marginTop: 8 }}>
                    <span className="mu row" style={{ flex: 1, gap: 6, width: "auto" }}>
                      <i className="ph-fill ph-check-circle" style={{ fontSize: 14, color: "var(--color-accent)" }} />
                      Logged · {hit.length} of {targets.length}
                    </span>
                    <button className="btn btn-ghost" style={{ fontSize: 12.5 }} onClick={() => dispatch({ type: "REOPEN_MEAL", mealId: meal.id })}>
                      Edit
                    </button>
                  </div>
                ) : (
                  <button
                    className="btn btn-primary btn-block"
                    style={{ height: 48, fontSize: 14, marginTop: 8 }}
                    onClick={() => dispatch({ type: "SUBMIT_MEAL", mealId: meal.id })}
                  >
                    Log {meal.name.toLowerCase()} · {hit.length} of {targets.length}
                  </button>
                )
              )}
            </div>
          );
        })}
      </div>
      <TabBar />

      {showNutritionOptions && (
        <div className="sheet-backdrop" onClick={() => setShowNutritionOptions(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="row" style={{ marginBottom: 4 }}>
              <div style={{ flex: 1 }}>
                <div className="scr">Nutrition</div>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>Options</div>
              </div>
              <button onClick={() => setShowNutritionOptions(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-neutral-500)" }}>
                <i className="ph ph-x" style={{ fontSize: 16 }} />
              </button>
            </div>
            <button className="link-row" style={{ padding: "11px 12px" }} onClick={() => { setShowNutritionOptions(false); onEditTargets(); }}>
              <i className="ph ph-sliders-horizontal" style={{ fontSize: 16, color: "var(--color-accent-300)" }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5 }}>Nutrition settings</div>
                <div className="mu" style={{ marginTop: 1 }}>Auto programming, and how you track and your portion goals.</div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MacroCol({ label, value, target, color, valueColor }: { label: string; value: number; target: number; color: string; valueColor?: string }) {
  return (
    <div style={{ flex: 1 }}>
      <div className="row" style={{ fontSize: 11, marginBottom: 5 }}>
        <span style={{ flex: 1, color: "var(--color-neutral-400)" }}>{label}</span>
        <span className="num" style={{ fontWeight: 700, color: valueColor ?? "var(--color-neutral-200)" }}>{value}</span>
      </div>
      <Meter pct={(value / target) * 100} color={color} />
      <div className="mu" style={{ marginTop: 4, fontSize: 11 }}>of <span className="num">{target}</span> g</div>
    </div>
  );
}
