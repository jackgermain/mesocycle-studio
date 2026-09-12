"""Progression engine, v4 -- v3 with Jack's review of the v3 programs applied (G83-G97).

Two of his notes forced a change to the shape of the state itself, so this is not a patch on v3:

  G91  No week is ever held. v3 held week two of nearly every exercise, because the logged rating already
       matched that week's aim and v3 had nothing smaller than a full step to offer. Matching the aim is not
       a reason to stand still.
  G92  So there is now something smaller: the half step -- a rep added to half the sets. That needs reps to be
       per-set, the way loads already were, which is the one structural change here. `st["reps"]` is a list.

And per-set reps fix the bug Jack caught in Dominic's week five, where v3 added 5 lb to the top set and took a
rep off all four:

  G91  A set gives back reps only if it took weight, and only the reps it borrowed above the top of its written
       range. v3 reset every set's reps to base whenever any set took weight, so a top-set-only jump cost four
       reps across the session to buy five pounds on one set. `check_stress` now re-derives that after every
       move and the page reports the count.

The rest of his review, in the order the rules fire:

  G83  A beginner's hinge takes the small plate and lets reps carry -- v3 took Leah 95 -> 125 in four weeks.
  G84  A hip thrust is the safe lift: weight leads, and weight and reps may move in the same week, to ~225x8.
  G86  A block landing under its aim was under-prescribed; the last training week escalates rather than coasts.
  G87  Moves are priced as percentages, so a small plate is correctly seen as the *smaller* step at 10 reps.
  G89  Reps stop at 17. Past 16 the weight goes up and the reps come down, whatever the written range says.
  G94  Three is the floor. A logged 2 is repaired in one move.

Gone: v3's "slow track", which froze Leah's press for a whole block. G85 says change the implement, not the
progression.

Logs are simulated and seeded, so the same page comes back every build and Jack's notes stay attached to the
right rows. The decisions are what to review, not the logs.
"""
import math
import random
import zlib

# G97: an exercise name that does not say what it is loaded with cannot be progressed correctly -- the
# increment, the percentage and the rep range all follow from the implement.
RENAME = {
  "Chest Supported Row": "Chest-Supported Machine Row",
  "Leg Press": "Plate-Loaded Leg Press",
  "Glute Bridge": "Barbell Glute Bridge",
  "Standing Calf Raise": "Standing Calf Raise Machine",
  "Seated Calf Raise": "Seated Calf Raise Machine",
}
UNRENAME = {v: k for k, v in RENAME.items()}


def ren(n):
    return RENAME.get(n, n) if n else n


def orig(n):
    return UNRENAME.get(n, n) if n else n


# Load-first holds reps and adds weight. Rep-first climbs reps to the top of the range, then changes the
# weight -- because on a lateral raise the next dumbbell is a 25% jump and costs two or three reps.
REP_FIRST = {
  "Incline Dumbbell Press", "Dumbbell Fly", "Cable Fly — Mid", "Reverse Pec Deck", "Freemotion Y Raise",
  "Dumbbell Lateral Raise", "Front Raise — Cable", "Straight-Arm Pulldown", "Dumbbell Skullcrusher",
  "Rope Pushdown", "Overhead Cable Triceps Ext.", "Cable Curl", "Dumbbell Curl", "Hammer Curl",
  "Incline Dumbbell Curl", "Spider Curl", "Barbell Reverse Curl", "Dumbbell Reverse Curl",
  "Cable Glute Kickback", "Glute Bridge", "Bulgarian Split Squat", "Smith Machine Split Lunge",
  "Dumbbell Reverse Lunge", "Captain's Chair Leg Raise", "Hanging Leg Raise", "V-Up", "Starfish Crunch",
  "Cable Rotation", "Plank Alternating Limb Touch", "Landmine Press", "Cable Pull-Through",
  "45° Back Extension", "Dead Bug",
  # G98: the erector work and the rows climb the rep range rather than chase a plate.
  "Reverse Hyperextension", "Single-Arm Dumbbell Row",
}

# What the weight is made of decides what one step looks like: (full jump, smallest jump) in lb.
# "plate" is a plate-loaded leg press: a 10 per side is the full step, a 5 per side the small one -- which is
# G87's answer to "there's nothing wrong with adding ten pounds... I would say two ninety five".
STEP = {"bar": (10, 5), "plate": (20, 10), "stack": (10, 5), "cable": (5, 2.5), "assist": (10, 5)}
KIND = {}
for _n in ("Smith Machine Squat", "Barbell RDL", "Incline Smith Press", "Barbell Hip Thrust",
           "Smith Machine Hip Thrust", "Smith Machine Split Lunge", "Barbell Reverse Curl",
           "Weighted / Assisted Pull-Up", "Landmine Press", "Glute Bridge"):
    KIND[_n] = "bar"
KIND["Leg Press"] = "plate"
for _n in ("Chest Press Machine", "Chest Supported Row", "Lat Pulldown", "Seated Cable Row", "Seated Leg Curl",
           "Leg Extension", "Hip Abduction Machine", "Standing Calf Raise", "Seated Calf Raise",
           "Reverse Pec Deck", "Cybex Lateral Raise Machine", "Seated Shoulder Press Machine",
           "Reverse Hyperextension"):
    KIND[_n] = "stack"
for _n in ("Cable Curl", "Rope Pushdown", "Overhead Cable Triceps Ext.", "Cable Fly — Mid", "Front Raise — Cable",
           "Straight-Arm Pulldown", "Cable Pull-Through", "Cable Glute Kickback", "Cable Rotation",
           "Freemotion Y Raise"):
    KIND[_n] = "cable"
KIND["Assisted Pull-Up"] = "assist"
for _n in ("Dumbbell Lateral Raise", "Dumbbell Curl", "Hammer Curl", "Incline Dumbbell Curl", "Spider Curl",
           "Dumbbell Fly", "Dumbbell Skullcrusher", "Dumbbell Reverse Curl", "Incline Dumbbell Press",
           "Dumbbell Reverse Lunge", "Bulgarian Split Squat", "Single-Arm Dumbbell Row"):
    KIND[_n] = "db"
for _n in ("Captain's Chair Leg Raise", "Hanging Leg Raise", "V-Up", "Starfish Crunch",
           "Plank Alternating Limb Touch", "45° Back Extension", "Dead Bug"):
    KIND[_n] = "bw"

# What a simulated client picks in week one, (men, women). Illustrative only -- in the app the client
# picks, and nothing is prescribed in pounds until they have.
START = {
  "Smith Machine Squat": (135, 85), "Barbell RDL": (155, 95), "Incline Smith Press": (115, 55),
  "Barbell Hip Thrust": (185, 135), "Smith Machine Hip Thrust": (165, 115), "Smith Machine Split Lunge": (65, 45),
  "Barbell Reverse Curl": (45, 30), "Weighted / Assisted Pull-Up": (10, 0), "Leg Press": (270, 180),
  "Chest Press Machine": (120, 60), "Chest Supported Row": (90, 50), "Lat Pulldown": (130, 80),
  "Seated Cable Row": (130, 80), "Seated Leg Curl": (90, 60), "Leg Extension": (100, 60),
  "Hip Abduction Machine": (130, 100), "Standing Calf Raise": (150, 100), "Reverse Pec Deck": (70, 40),
  "Seated Shoulder Press Machine": (110, 55), "Seated Calf Raise": (90, 55), "Landmine Press": (50, 25),
  "Reverse Hyperextension": (90, 50), "Single-Arm Dumbbell Row": (70, 35),
  "Cybex Lateral Raise Machine": (40, 25), "Cable Curl": (50, 30), "Rope Pushdown": (50, 30),
  "Overhead Cable Triceps Ext.": (40, 25), "Cable Fly — Mid": (30, 15), "Front Raise — Cable": (20, 12.5),
  "Straight-Arm Pulldown": (50, 30), "Cable Pull-Through": (60, 40), "Cable Glute Kickback": (25, 15),
  "Cable Rotation": (30, 20), "Freemotion Y Raise": (15, 10), "Assisted Pull-Up": (40, 60),
  "Dumbbell Lateral Raise": (15, 10), "Dumbbell Curl": (25, 15), "Hammer Curl": (30, 17.5),
  "Incline Dumbbell Curl": (20, 12.5), "Spider Curl": (20, 12.5), "Dumbbell Fly": (25, 15),
  "Dumbbell Skullcrusher": (25, 15), "Dumbbell Reverse Curl": (20, 12.5), "Incline Dumbbell Press": (60, 30),
  "Dumbbell Reverse Lunge": (40, 25), "Bulgarian Split Squat": (40, 25), "Glute Bridge": (95, 65),
}

# G61's heaviest tier: the most absolute load through connective tissue.
HEAVY = {"Barbell RDL", "Smith Machine Squat", "Barbell Hip Thrust", "Smith Machine Hip Thrust",
         "Incline Smith Press", "Leg Press", "Weighted / Assisted Pull-Up"}

# G63's split move only where the smallest increment is small relative to the load. G84 adds the hip thrusts:
# it is the safe lift, so weight and reps may move in the same week even for a beginner.
COMBO_OK = {"Chest Press Machine", "Chest Supported Row", "Seated Cable Row", "Lat Pulldown", "Seated Leg Curl",
            "Leg Extension", "Hip Abduction Machine", "Assisted Pull-Up", "Standing Calf Raise",
            "Seated Calf Raise", "Cybex Lateral Raise Machine", "Barbell Hip Thrust", "Smith Machine Hip Thrust"}

# G83: a first block barely moves the bar on a hinge -- the hamstrings and the lower back are meeting load for
# the first time. Small plate, and reps carry the rest.
HINGE = {"Barbell RDL"}

# G84: weight leads on a hip thrust until they can do about this, for eight.
AGGRESSIVE = {"Barbell Hip Thrust", "Smith Machine Hip Thrust"}
THRUST_TARGET = 225

# G80: a jump of this share of the load or more is "big", and waits for reps past this many.
BIG_JUMP = 0.2
PAST_REPS = 15
# G89: "I would not let these get past the sixteen, seventeen mark, though. Pull them back down." Past 16 the
# weight goes up and the reps come down, whatever the written range says.
REP_CEILING = 17
FORCE_JUMP = 16
# G73 carried to stacks and cables: once a big jump has been earned, a step that would still be 40% or more of
# the load takes the smallest plate instead -- a 10 lb cable goes to 12.5, not 15, the way the 10s go to the
# 12.5s. This extension to cables is my call, not Jack's; the page lists it.
HUGE_JUMP = 0.4
# A weighted pull-up's added plate is not its load -- the body is most of it. Assumed bodyweights, by sex.
BODYWEIGHT = {"M": 180, "F": 140}

# G94: "The goal is that we get them to at least a minimum of three, pretty much at all times... training at a
# two is not productive pretty much at all."
EFFORT_FLOOR = 3

# How much each move pushes next week's effort, before a week of adaptation takes some back.
EFFECT = {("load", "all"): 1.5, ("load", "top2"): 0.9, ("load", "top1"): 0.6, ("load", "drop8"): 0.9,
          ("load", "small"): 0.9,
          ("combo", None): 0.9, ("level", None): 0.6, ("rep", 1): 0.5, ("rep", 2): 1.0, ("hold", None): 0.0,
          ("half", None): 0.25, ("db", None): 1.0, ("pin", None): 1.0, ("reset", None): -1.5}
ADAPTATION = 0.4

# Apply the G97 renames to every table above, so the rest of the engine only ever sees the new names.
REP_FIRST = {ren(n) for n in REP_FIRST}
KIND = {ren(k): v for k, v in KIND.items()}
START = {ren(k): v for k, v in START.items()}
HEAVY = {ren(n) for n in HEAVY}
COMBO_OK = {ren(n) for n in COMBO_OK}
HINGE = {ren(n) for n in HINGE}
AGGRESSIVE = {ren(n) for n in AGGRESSIVE}


def track(name, beginner=False):
    # G83: a beginner's hinge is rep-first even though a barbell lift normally is not, because reps are what
    # carries a first block on a hinge.
    if beginner and name in HINGE:
        return "rep"
    return "rep" if name in REP_FIRST else "load"


def targets(weeks, days):
    """G64's aimed effort curve, with C7/C7a deciding whether the last week is a deload (None).

    G94 is the floor: every training week aims at 3 or above, including the first."""
    deload = days >= 5
    if weeks == 4:
        curve = [3, 4, 5, None] if deload else [3, 3.5, 4.5, 5]
    else:
        curve = [3, 3.5, 4, 4.5, 5, None] if deload else [3, 3, 3.5, 4, 4.5, 5]
    return [t if t is None else max(EFFORT_FLOOR, t) for t in curve]


def aim_label(t):
    if t is None:
        return "deload"
    return str(int(t)) if t == int(t) else f"{int(t)}–{int(t) + 1}"


def parse_reps(s):
    """(lo, hi, per_side) from a written rep target. A single number becomes a range ending at it."""
    s = s.strip()
    per = s.endswith("/s")
    core = s[:-2] if per else s
    if "–" in core:
        a, b = core.split("–")
        return int(a), int(b), per
    n = int(core)
    return (n - 3 if n >= 12 else n - 2), n, per


def fmt_w(w):
    return str(int(w)) if w == int(w) else f"{w:g}"


def next_db(w):
    for r in (5, 7.5, 10, 12.5, 15, 17.5, 20):
        if r > w:
            return r
    return w + 5


def prev_db(w):
    if w > 20:
        return w - 5
    for r in (17.5, 15, 12.5, 10, 7.5, 5):
        if r < w:
            return r
    return w


def landing(done, w, w2):
    """Reps expected on the next dumbbell. Calibrated to Jack's anchor: sixteen reps with the tens is about
    eleven or twelve with the 12.5s."""
    return max(1, round(done * (w / w2) ** 1.5))


def full_step(kind, w, small=False):
    """The next weight up, as an amount. Always the real next step -- G80 earns a big one rather than
    swapping it for a smaller one. G83's beginner hinge is the exception: small plate, always."""
    if kind == "db":
        return next_db(w) - w
    return STEP[kind][1] if small else STEP[kind][0]


def is_big(kind, w, amt):
    """G80: a jump of a fifth of the load or more. Assistance comes off rather than going on, and bodyweight has
    no load, so neither is a percentage of anything."""
    return kind not in ("assist", "bw") and w > 0 and amt / w >= BIG_JUMP


def earned_step(st):
    """The step a jump takes once it is due: the full step, unless even that is 40% or more of the load on
    equipment that has a smaller plate. Dumbbells already move one rung at a time, so they are left alone."""
    k = st["kind"]
    full = full_step(k, max(st["loads"]), st["small_steps"])
    load = max(st["loads"]) + st["bw_add"]
    if k in ("cable", "stack", "bar", "plate") and load > 0 and full / load >= HUGE_JUMP:
        return STEP[k][1]
    return full


def pct_of_load(st, amt):
    """G87: what a plate is worth, as a share of the whole load."""
    load = max(st["loads"]) + st["bw_add"]
    return round(100 * amt / load) if load > 0 else 0


def pct_of_set(reps):
    """G87: what one rep is worth, as a share of the set."""
    return round(100 / reps) if reps else 0


def load_txt(kind, loads, name):
    if kind == "bw":
        return "BW"
    body = fmt_w(loads[0]) if len(set(loads)) == 1 else "·".join(fmt_w(x) for x in loads)
    if name == "Weighted / Assisted Pull-Up":
        return f"BW+{body}"
    if kind == "db":
        return f"{body}s"
    if kind == "assist":
        return f"{body} lb assist"
    return f"{body} lb"


def set_txt(reps, loads, kind, name, ea=""):
    """One line saying exactly which sets get which reps at which weight.

    Two goes at this failed. "2 × 11 + 2 × 10 @ 100 lb" reads as arithmetic -- Jack: "no clue what this means".
    "2 sets of 11 + 2 sets of 10" fixed the arithmetic but still did not say WHICH sets -- Jack: "need a more
    clear way to read rep jumps on certain sets". So the sets are named outright, and a group carries its own
    weight whenever the weights differ. Identical sets keep the notation everyone reads at a glance.
    """
    groups = []
    for i, (r, w) in enumerate(zip(reps, loads)):
        if groups and groups[-1][2] == r and groups[-1][3] == w:
            groups[-1][1] = i
        else:
            groups.append([i, i, r, w])
    if len(groups) == 1:
        return f"{len(reps)} × {reps[0]}{ea} @ {load_txt(kind, loads, name)}"
    one_load = len(set(loads)) == 1
    out = []
    for a, b, r, w in groups:
        where = f"set {a + 1}" if a == b else f"sets {a + 1}–{b + 1}"
        piece = f"{where}: {r} rep{'s' if r != 1 else ''}{ea}"
        if not one_load:
            piece += f" @ {load_txt(kind, [w], name)}"
        out.append(piece)
    line = " · ".join(out)
    return line + (f" @ {load_txt(kind, loads, name)}" if one_load else "")


def fresh(name, sex, sets, lo, hi, beginner, guard):
    kind = KIND[name]
    start = 0 if kind == "bw" else START[name][0 if sex == "M" else 1]
    if beginner:
        reps = hi          # G69's beginner starts at the top of the range: lighter, same effort
    elif track(name) == "rep" or guard:
        reps = lo          # G70: a guarded lift sits at its floor of 10 and earns its way from there
    else:
        reps = hi
    bw_add = BODYWEIGHT[sex] if name == "Weighted / Assisted Pull-Up" else 0
    # G83/G87: a beginner takes the small plate on the heaviest lifts -- the hinge above all, but the squat and
    # the presses too, where "going from ninety five pounds on the bar to a hundred pounds is a five percent
    # increase in stress... don't be afraid of little load progressions" beats ten pounds every week. The hip
    # thrusts are the exception (G84): that one is safe enough to push hard even in a first block.
    small = beginner and (name in HINGE or (name in HEAVY and name not in AGGRESSIVE))
    return dict(name=name, kind=kind, sets=sets, loads=[start] * sets, reps=[reps] * sets, base=reps,
                harder=0, bw_add=bw_add, small_steps=small)


def snapshot(st):
    return dict(loads=list(st["loads"]), reps=list(st["reps"]), harder=st["harder"])


def check_stress(before, after, name, week):
    """G91: "You just took away stress... you added five pounds on one set and dropped the total reps per
    session by four reps. That doesn't add up."

    A set may give back reps only if it took weight that week. Anything else is a move that costs more work
    than it buys, and the page reports it rather than hiding it."""
    if sum(after["reps"]) >= sum(before["reps"]):
        return None
    if after["harder"] > before["harder"]:
        # A bodyweight lift has no plate to add, so the added stress is a slower lowering. That buys the reps
        # it costs the same way a heavier set does.
        return None
    bad = [i for i in range(len(before["reps"]))
           if after["reps"][i] < before["reps"][i] and after["loads"][i] <= before["loads"][i]]
    if not bad:
        # every set that lost reps gained load -- that is double progression, not a loss
        return None
    return (f"{name} week {week}: {len(bad)} set(s) lost reps without gaining load "
            f"({sum(before['reps'])} → {sum(after['reps'])} reps)")


def half_targets(reps, room):
    """G92: "If you add a rep to half the sets, it's essentially half of a progression."

    The sets still on the lower number, front half first, so the top set leads the way Jack writes it:
    four of fifteen → two of sixteen and two of fifteen → all four of sixteen."""
    m = min(reps)
    if m >= room:
        return []
    at = [i for i, r in enumerate(reps) if r == m]
    return at[:max(1, math.ceil(len(at) / 2))]


def describe(st, code, var, lo, hi, done):
    k, L = st["kind"], st["loads"]
    sign, unit = ("−", " lb assist") if k == "assist" else ("+", " lb")
    if code == "load":
        if var == "drop8":
            nxt = f"{fmt_w(next_db(max(L)))}s" if k == "db" else f"{sign}{fmt_w(STEP[k][0])}{unit}"
            return f"clean block — 8 reps, {nxt}"
        if var == "top1":
            return f"{sign}{fmt_w(STEP[k][1])}{unit} on set 1"
        if var == "small":
            # G87's little load progression: the small plate on every set, not the full step.
            return f"{sign}{fmt_w(STEP[k][1])}{unit} on every set"
        amt = fmt_w(earned_step(st))
        return (f"{sign}{amt}{unit} on every set" if (var == "all" or len(L) <= 2)
                else f"{sign}{amt}{unit} on sets 1–2")
    if code == "combo":
        return f"{sign}{fmt_w(STEP[k][1])}{unit} and +1 rep on every set"
    if code == "level":
        return f"level up — every set to {fmt_w(min(L) if k == 'assist' else max(L))}"
    if code == "rep":
        return f"+{var} rep{'s' if var > 1 else ''} on every set"
    if code == "half":
        # Name the sets the half step lands on. They are contiguous: the reps are held in descending order, so
        # the sets still on the lower number sit together at the end.
        idx = half_targets(st["reps"], 99)
        where = f"set {idx[0] + 1}" if len(idx) == 1 else f"sets {idx[0] + 1}–{idx[-1] + 1}"
        return f"+1 rep on {where}"
    if code == "hold":
        return "hold — overshot the aim"
    if code == "db":
        new = next_db(L[0])
        return f"{fmt_w(L[0])}s → {fmt_w(new)}s, expect ~{landing(done, L[0], new)} reps"
    if code == "pin":
        if k == "bw":
            return f"harder version — slower lowering, back to {lo}"
        return f"{sign}{fmt_w(earned_step(st))}{unit}, reps back down"
    if code == "reset":
        return "drop ~10%, rebuild"
    return code


def apply(st, code, var, lo, hi, done):
    k, L, R = st["kind"], st["loads"], st["reps"]
    sg = -1 if k == "assist" else 1

    def bump(idxs, amt):
        """Add weight to these sets. G91: a set gives back only the reps it borrowed ABOVE the top of its
        written range -- reps inside the range are real work, and taking them to buy one set's plate is the
        arithmetic Jack caught in Dominic's week five.

        G87 prices the exception. On the lat pulldown going 130 -> 140 he said: "that is a big jump... I would
        do nine reps instead of ten." Ten pounds on 130 is 7.7%, and a rep at eleven is 9.1% -- so that step is
        most of a rep's worth, and it is paid for with the rep. Five pounds on a 95 lb bar (5.3% against 10%)
        is not, which is the little load progression he said not to be afraid of."""
        for i in idxs:
            base_load = max(1e-9, L[i] + st["bw_add"])
            L[i] = max(0, L[i] + sg * amt)
            if sg > 0 and (amt / base_load) >= 0.75 * (1 / max(1, R[i])):
                R[i] = max(lo, min(R[i], st["base"] - 1))
            elif R[i] > hi:
                R[i] = st["base"]

    if code == "load":
        if var == "drop8":
            L[:] = [next_db(max(L))] * len(L) if k == "db" else [max(L) + sg * STEP[k][0]] * len(L)
            R[:] = [8] * len(R)
        elif var == "top1":
            bump([0], STEP[k][1])
        elif var == "small":
            bump(range(len(L)), STEP[k][1])
        else:
            amt = earned_step(st)
            bump(range(len(L) if var == "all" else min(2, len(L))), amt)
    elif code == "combo":
        for i in range(len(L)):
            L[i] = max(0, L[i] + sg * STEP[k][1])
            R[i] += 1
    elif code == "level":
        L[:] = [min(L) if k == "assist" else max(L)] * len(L)
    elif code == "rep":
        R[:] = [r + var for r in R]
    elif code == "half":
        for i in half_targets(R, 99):
            R[i] += 1
    elif code == "db":
        new = next_db(L[0])
        R[:] = [landing(done, L[0], new)] * len(R)
        L[:] = [new] * len(L)
    elif code == "pin":
        if k == "bw":
            st["harder"] += 1
        else:
            amt = earned_step(st)
            for i in range(len(L)):
                L[i] = max(0, L[i] + sg * amt)
        R[:] = [lo] * len(R)
    elif code == "reset":
        if k == "db":
            L[:] = [prev_db(max(L))] * len(L)
        elif k != "bw":
            small = STEP[k][1]
            base = max(L) * (1.1 if k == "assist" else 0.9)
            L[:] = [round(base / small) * small] * len(L)
        if track(st["name"]) == "rep":
            R[:] = [lo] * len(R)

    # Sets are written top-first: the heaviest set leads, and at equal load the most reps lead. Load and reps
    # have to be reordered TOGETHER or the pairing breaks -- sorting the reps on their own put ten reps on the
    # heavy set and nine on a lighter one, which reads like a mistake and trips check_stress for a set that
    # never lost anything. Assistance is the other way round: less assistance is the harder set.
    order = sorted(range(len(L)), key=lambda i: (L[i] if k == "assist" else -L[i], -R[i]))
    L[:], R[:] = [L[i] for i in order], [R[i] for i in order]


def simulate(ex):
    """Run one exercise through a block: week one, one row per later week, and what carries forward.

    ex: seed, name, sex, sets, lo, hi, per, weeks, days, beginner, guard, swap_to, rpe
    """
    rng = random.Random(zlib.crc32(ex["seed"].encode()))
    weeks, sex = ex["weeks"], ex["sex"]
    T = targets(weeks, ex["days"])
    last_training = weeks if T[-1] is not None else weeks - 1
    lo, hi = ex["lo"], ex["hi"]
    ea = " ea." if ex["per"] else ""
    st = fresh(ex["name"], sex, ex["sets"], lo, hi, ex["beginner"], ex["guard"])
    start_name, start_top = st["name"], max(st["loads"])
    violations = []

    def presc(sets=None):
        n = sets or st["sets"]
        harder = " · harder version" if st["harder"] else ""
        return set_txt(st["reps"][:n], st["loads"][:n], st["kind"], st["name"], ea) + harder

    def log_reps(target, e):
        if e <= 2:
            return target + 2
        if e == 3:
            return target + (1 if rng.random() < 0.5 else 0)
        if e == 4:
            return target
        return target - (1 if rng.random() < 0.35 else 0)

    ec = rng.choice([2.5, 3.0, 3.0, 3.0, 3.5]) + (0.3 if ex["rpe"] == 7.5 else -0.2)
    e = min(5, max(1, int(round(ec))))
    top = max(st["reps"])
    d = log_reps(top, e)
    week1 = dict(presc=f"{st['sets']} × {top}{ea} @ RPE {fmt_w(ex['rpe'])}",
                 picked=f"picked {load_txt(st['kind'], st['loads'], st['name'])}",
                 logged=f"did {d} · how hard {e}" + (" · joint flagged" if ex["swap_to"] else ""))
    E, D, TG = {1: e}, {1: d}, {1: top}
    fresh_from, last = 1, None
    clean = not ex["swap_to"]
    rows = []

    for w in range(2, weeks + 1):
        target = T[w - 1]
        e_prev, d_prev, t_prev = E[w - 1], D[w - 1], TG[w - 1]
        e_pp = E.get(w - 2) if (w - 2) >= fresh_from else None
        if T[w - 2] is not None and e_prev > T[w - 2] + 0.5:
            clean = False
        L, R = st["loads"], st["reps"]
        staggered = len(set(L)) > 1
        rep_first = track(st["name"], ex["beginner"]) == "rep"
        thrust = st["name"] in AGGRESSIVE and max(L) < THRUST_TARGET
        # Measured on the step that would actually be taken, against the whole load -- bodyweight included for a
        # weighted pull-up, where +10 lb on BW+10 is about 5%, not 100%.
        step_now = earned_step(st) if st["kind"] not in ("bw", "assist") else 0
        load_now = max(L) + st["bw_add"]
        big = is_big(st["kind"], load_now, step_now)
        pct = pct_of_load(st, step_now)
        # G80: when the next weight is a big jump, reps have to get past fifteen first, so they may climb past
        # the written range to get there. G89 caps that climb at seventeen.
        gate = max(hi, PAST_REPS) if big else hi
        if rep_first:
            room = gate + 1 if big else hi
        else:
            room = hi if ex["guard"] else hi + 2
            if big:
                room = max(room, PAST_REPS + 1)
        # G89 caps a rep CLIMB at seventeen. It does not overrule a written range that already sits higher --
        # a 15-18 hip abduction is a legitimate prescription, not reps that crept up.
        ceiling, force = max(REP_CEILING, hi), max(FORCE_JUMP, hi)
        room = min(room, ceiling)
        # G86: a block that lands under its aim was under-prescribed, so the last training week may push past
        # the usual rep room -- but ONLY where the weight cannot move instead. Where a jump is legal, the jump
        # IS the added stress, and widening the room first steals it: this left the main chest press on the
        # same dumbbells for a whole block while its reps drifted two past the top of its range.
        if (w == last_training and target is not None and target - e_prev >= 0.75
                and (big or st["kind"] == "bw")):
            room = min(ceiling, room + 2)
        if st["kind"] == "db" and L[0] >= 20 and not big:
            beat_top = d_prev >= hi and e_prev <= 3
        else:
            beat_top = d_prev > gate
        # G89: past sixteen the weight goes up and the reps come down, whatever the written range says.
        ceiling_hit = max(R) >= force and st["kind"] != "bw"
        var, sets_shown, label = None, None, None

        def least_move(why_tail):
            """G91: "You have to add stress every week... you wanna have progression every week no matter
            what." The smallest honest step available, which is what replaces holding."""
            if min(R) < room:
                return "half", None, (f"G92: {why_tail} — so the smallest real step there is: one rep on half "
                                      f"the sets, which is half a progression")
            if staggered:
                return "level", None, f"G91: {why_tail} — the lagging sets catch the top weight"
            if st["kind"] == "bw":
                return "pin", None, f"G91: {why_tail} — a harder version, since there is no weight to add"
            if st["kind"] == "db":
                # A dumbbell has no smaller plate: the rungs are the increment, so the next one up is the
                # smallest move that exists once the reps are capped.
                return "db", None, f"G91: {why_tail} — the next dumbbell, the smallest step a dumbbell has"
            amt = STEP[st["kind"]][1]
            return "load", "top1", (f"G91/G87: {why_tail} — {fmt_w(amt)} lb on the top set is "
                                    f"{pct_of_load(st, amt)}%, the smallest step there is")

        if target is None:
            code, sets_shown = "deload", (st["sets"] + 1) // 2
            label = f"deload — {sets_shown} set{'s' if sets_shown != 1 else ''}, same load"
            why = "C7a: five or more days a week, so the block's last week is the deload"
        elif ex["swap_to"] and w == 2:
            code = "swap"
            label = f"swap to {ex['swap_to']} — they pick the weight"
            why = "G70: joint flagged in week 1 — week one was the test, so the exercise changes, not the load"
        elif d_prev <= t_prev - 2:
            code, why = "reset", "missed the target by two or more — the load is wrong, not the day"
        elif e_prev >= 5:
            # The one case where nothing rises, and it is not a planned held week: they overshot the aim, so
            # G62's "effort is spent" outranks G91's "add stress every week".
            code = "hold"
            if d_prev < t_prev:
                why = "G62: a 5 and a missed rep — nothing moves until the reps are made"
            else:
                why = f"G62: logged a 5 against an aim of {aim_label(target)} — they overshot, so effort is spent"
        elif ceiling_hit and not rep_first:
            code, var = "pin", None
            why = f"G89: {max(R)} reps is past the sixteen-seventeen mark — the weight goes up and the reps come down"
        else:
            req = target - e_prev
            adds_reps = last is not None and last[0] in ("rep", "combo", "half")
            step_reps = (last[1] if last and last[0] == "rep" else 1) if adds_reps else 0
            # G71 reads the pair. A 3 or 4 that held or fell after an increase is adaptation; a 2 is G62's
            # "too light", which wants a bigger move than repeating last week's.
            # G86 caps "keep the rate": only while the rate is actually keeping up. A lift three quarters of a
            # point or more under its aim needs the move sized to the gap instead of last week's move repeated,
            # which is what left Dominic's incline Smith press on 115 lb for a whole block.
            if (last and e_pp is not None and 3 <= e_prev <= e_pp and 0 <= req < 0.75
                    and max(R) + step_reps <= room):
                code, var = last
                if code == "load" and var in ("top2", "top1") and staggered:
                    code, var = "level", None   # once the sets are split, the same-size step is closing the split
                why = f"G71: how hard went {e_pp} → {e_prev} after last week's increase — a net gain, keep the rate"
            elif rep_first:
                if beat_top or ceiling_hit:
                    if st["kind"] == "db":
                        code = "db"
                        if ceiling_hit:
                            why = f"G89: {max(R)} reps — past the sixteen-seventeen mark, so the next dumbbell"
                        elif big:
                            why = f"G80: past {gate} reps — the next dumbbell is a {pct}% jump, and now it's earned"
                        elif L[0] < 20:
                            why = "G73: beat the top of the range — under 20 lb, one rung only"
                        else:
                            why = "G73: top of the range, and above 20 lb the gate relaxes"
                    else:
                        code = "pin"
                        if ceiling_hit:
                            why = f"G89: {max(R)} reps — past the sixteen-seventeen mark, so the weight goes up"
                        elif big:
                            why = f"G80: past {gate} reps — the next weight is a {pct}% jump, and now it's earned"
                        else:
                            why = "beat the top of the range"
                elif e_prev <= 2:
                    code, var = "rep", min(2, max(1, room - max(R)))
                    why = (f"G94: a {e_prev} is not productive training — one move puts it back over "
                           f"{EFFORT_FLOOR}, it is not walked back gradually")
                elif max(R) >= room and req >= 0.75 and st["kind"] != "bw":
                    # G86: at the top of the rep range and still under the aim, the weight is where the stress
                    # comes from. least_move would offer a half step here because one set still sits below the
                    # room -- and that drifts reps past the range while the block gains no load at all, which
                    # is how the main chest press finished a whole block on the dumbbells it started on.
                    # G80's check below still overrides this if the jump is a big one that is not yet earned.
                    code, var = ("db", None) if st["kind"] == "db" else ("pin", None)
                    why = (f"G86: {max(R)} reps is the top of this lift's range and it is still under an aim "
                           f"of {aim_label(target)} — the weight is the stress, not more reps")
                elif max(R) >= room:
                    code, var, why = least_move(f"at {max(R)} reps, the top of what this lift is allowed")
                elif req >= 0.25:
                    # G86: size the step to the gap. "Her exertion is not hard enough by the end of the block,
                    # so more stress needs to be added... maybe instead of eleven reps, you do twelve reps."
                    code, var = "rep", min(2 if req >= 1.0 else 1, room - max(R))
                    why = (f"G80: reps climb past {gate} before a {pct}% jump" if big and max(R) >= hi
                           else f"G64: logged {e_prev}, aiming at {aim_label(target)} — "
                                + ("a full point under, so two reps" if var == 2 else "climb the range"))
                else:
                    code, var, why = least_move(f"rated it {e_prev} last week, and this week aims at "
                                                f"{aim_label(target)} — already there")
            else:
                rep_pct = pct_of_set(max(R))
                small_pct = pct_of_load(st, STEP[st["kind"]][1])
                if e_prev <= 2:
                    code, var = "load", "all"
                    why = (f"G94: a {e_prev} is not productive training — a full increment on every set, "
                           f"in one move")
                elif thrust and req >= 0.5 and st["name"] in COMBO_OK and max(R) < room:
                    code, why = "combo", (f"G84: the hip thrust is the safe lift — weight and reps together, "
                                          f"and weight leads until about {THRUST_TARGET} for eight")
                elif thrust and req >= 0.25:
                    code, var = "load", "all"
                    why = (f"G84: weight leads on a hip thrust — {fmt_w(max(L))} lb now, "
                           f"aiming at {THRUST_TARGET} for eight")
                elif req >= 1.5:
                    code, var = "load", "all"
                    why = (f"G86: logged {e_prev} against an aim of {aim_label(target)} — a point and a half "
                           f"under, so every set steps up, not just the top ones")
                elif req >= 0.75 and staggered:
                    code, why = "level", "close the gap already opened before opening a new one"
                elif req >= 1.0 and st["name"] in COMBO_OK and max(R) < room:
                    code, why = "combo", "G63: one recovery budget, spent as two small moves"
                elif req >= 0.75 and st["name"] in HEAVY and weeks >= 6:
                    code, var, why = "load", "top1", "G61: six-week block — the smallest jump on a heavy lift"
                elif req >= 0.75:
                    code, var = "load", "top2"
                    why = f"G64: logged {e_prev}, aiming at {aim_label(target)} — stagger the jump"
                elif req >= 0.25 and staggered:
                    code, why = "level", "a small step: close the gap already opened"
                # G87: "going from ninety five pounds on the bar to a hundred pounds is a five percent increase
                # in stress. And going from ten reps or eleven reps to twelve reps is a little bit less than a
                # ten percent increase. Don't be afraid of little load progressions like that too."
                elif req >= 0.25 and 0 < small_pct < rep_pct and not st["small_steps"]:
                    code, var = "load", "small"
                    # The percentage is of the WHOLE load, so the number quoted has to be the whole load too --
                    # on a weighted pull-up that is bodyweight plus the plate, not the plate on its own.
                    why = (f"G87: {fmt_w(STEP[st['kind']][1])} lb on {fmt_w(max(L) + st['bw_add'])} is "
                           f"{small_pct}%, where a rep at {max(R)} is {rep_pct}% — the plate is the smaller step")
                elif req >= 0.25 and max(R) < room:
                    code, var, why = "rep", 1, f"G64: logged {e_prev}, aiming at {aim_label(target)} — nearly there"
                else:
                    code, var, why = least_move(f"rated it {e_prev} last week, and this week aims at "
                                                f"{aim_label(target)} — already there or past it")

            # G80, after whichever branch chose the move: a full jump that is a big share of the load is only
            # taken once the reps are past fifteen. The smallest-increment moves (G61's top set, G63's combo)
            # are small by definition and are left alone. G89's forced jump overrides it -- at seventeen reps
            # there is nowhere left to climb.
            if (code in ("load", "db", "pin") and var not in ("top1", "drop8", "small") and big
                    and d_prev <= PAST_REPS and not ceiling_hit):
                if max(R) < room:
                    # G86: the climb to G80's gate is still a progression, so it is sized to the gap like any
                    # other rep move. Hardcoding one rep here left a lateral raise logging 3 against a rising
                    # aim for the back half of a block -- the same "not hard enough by the end" Jack flagged.
                    code, var = "rep", min(2 if req >= 1.0 else 1, room - max(R))
                    why = f"G80: the next weight is a {pct}% jump — reps climb past {PAST_REPS} first"
                else:
                    code, var, why = least_move(f"a {pct}% jump still waits for reps past {PAST_REPS}")

        if code == "swap":
            st = fresh(ex["swap_to"], sex, st["sets"], lo, hi, ex["beginner"], ex["guard"])
            fresh_from = 2
        elif code != "deload":
            label = describe(st, code, var, lo, hi, d_prev)
            if why.startswith("G71") and code != "level":
                label = "same again — " + label
            before = snapshot(st)
            apply(st, code, var, lo, hi, d_prev)
            v = check_stress(before, snapshot(st), ex["name"], w)
            if v:
                violations.append(v)

        # How the simulated client responds.
        if code == "swap":
            ec = 3.0 + rng.choice([-0.4, 0.0, 0.3])
        elif code == "deload":
            ec = max(1.0, ec - 2.5)
        else:
            ec = ec + EFFECT[(code, var)] - ADAPTATION + rng.choice([-0.6, 0.0, 0.0, 0.0, 0.6])
        ec = min(5.0, max(1.0, ec))
        e = int(round(ec))
        top = max(st["reps"])
        d = log_reps(top, e)
        E[w], D[w], TG[w] = e, d, top
        last = (code, var) if code in ("load", "combo", "rep", "half") else None

        rows.append(dict(week=w, aim=target, code=code, var=var, label=label, why=why,
                         presc=(f"{st['sets']} × {max(st['reps'])}{ea} @ RPE 7 · picked "
                                f"{load_txt(st['kind'], st['loads'], st['name'])}" if code == "swap" else presc(sets_shown)),
                         logged=f"did {d} · how hard {E[w]}"))

    lw = last_training
    renamed = st["name"] != start_name
    carry = (f"{st['name'] + ' · ' if renamed else ''}"
             f"{load_txt(st['kind'], [min(st['loads']) if st['kind'] == 'assist' else max(st['loads'])], st['name'])}"
             f" × {D[lw]} · how hard {E[lw]}")
    # G81: no planned finish to measure against -- report what the block actually added to the top set.
    gain = None
    if not renamed and st["kind"] != "bw":
        gain = (start_top - min(st["loads"])) if st["kind"] == "assist" else (max(st["loads"]) - start_top)
    # G86: did the block actually land on its aim, or did it coast in under it?
    landed = E[lw]
    aimed = T[lw - 1]
    return dict(week1=week1, rows=rows, carry=carry, gain=gain, kind=st["kind"], final_name=st["name"],
                violations=violations, landed=landed, aimed=aimed,
                under=(aimed is not None and landed < aimed - 0.5))
