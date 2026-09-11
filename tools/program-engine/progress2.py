"""Progression engine, v2.

v1 reacted: it took last week's log and moved the next week by whatever the log implied, so the effort
curve across a block was whatever the client's own choices happened to produce. Jack aims the curve
(G64): the peak lands at 4-5 on the how-hard scale, and every earlier week is reverse-engineered from
that. So v2 carries a target effort per week and picks each move from the GAP between what the client
logged last week and what this week is aiming for.

v2 also carries real weights, so every week reads as a rep scheme ("4 x 10 @ 145-145-135-135 lb") rather
than "+1 increment" -- Jack approves a week by reading the scheme and the how-hard rating side by side.

Where each rule lives:
  G61  six-week blocks take the smallest jump on the heaviest lifts
  G62  a 5 means effort is spent -- the load holds
  G63  one recovery budget: a minimum increment and a rep can be spent together
  G64  a target effort per week; the peak lands at 4-5
  G65  a planned finish on Smith and barbell lifts caps the load; reps carry the block past it
  G70  guarded movements: reps held at 10+, week one is a test, a clean block earns the drop to 8
  G71  effort flat or falling after an increase is a net gain -- keep the same move
  G73  jumps are percentages: dumbbells under 20 lb go one rung at a time, light stacks take the small step
  C7 / C7a  five or more days a week ends the block with a deload week; below that there is none

Everything a client logs is simulated, seeded so the same page comes back every build and Jack's notes
stay attached to the right rows. The decisions are the part to review, not the simulated logs.
"""
import random
import zlib

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
}

# What the weight is made of decides what one step looks like: (full jump, smallest jump) in lb.
STEP = {"bar": (10, 5), "plate": (20, 10), "stack": (10, 5), "cable": (5, 2.5), "assist": (10, 5)}
KIND = {}
for _n in ("Smith Machine Squat", "Barbell RDL", "Incline Smith Press", "Barbell Hip Thrust",
           "Smith Machine Hip Thrust", "Smith Machine Split Lunge", "Barbell Reverse Curl",
           "Weighted / Assisted Pull-Up", "Landmine Press"):
    KIND[_n] = "bar"
KIND["Leg Press"] = "plate"
for _n in ("Chest Press Machine", "Chest Supported Row", "Lat Pulldown", "Seated Cable Row", "Seated Leg Curl",
           "Leg Extension", "Hip Abduction Machine", "Standing Calf Raise", "Seated Calf Raise",
           "Reverse Pec Deck", "Cybex Lateral Raise Machine"):
    KIND[_n] = "stack"
for _n in ("Cable Curl", "Rope Pushdown", "Overhead Cable Triceps Ext.", "Cable Fly — Mid", "Front Raise — Cable",
           "Straight-Arm Pulldown", "Cable Pull-Through", "Cable Glute Kickback", "Cable Rotation",
           "Freemotion Y Raise"):
    KIND[_n] = "cable"
KIND["Assisted Pull-Up"] = "assist"
for _n in ("Dumbbell Lateral Raise", "Dumbbell Curl", "Hammer Curl", "Incline Dumbbell Curl", "Spider Curl",
           "Dumbbell Fly", "Dumbbell Skullcrusher", "Dumbbell Reverse Curl", "Incline Dumbbell Press",
           "Dumbbell Reverse Lunge", "Bulgarian Split Squat", "Glute Bridge"):
    KIND[_n] = "db"
for _n in ("Captain's Chair Leg Raise", "Hanging Leg Raise", "V-Up", "Starfish Crunch",
           "Plank Alternating Limb Touch"):
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
  "Cybex Lateral Raise Machine": (40, 25), "Cable Curl": (50, 30), "Rope Pushdown": (50, 30),
  "Overhead Cable Triceps Ext.": (40, 25), "Cable Fly — Mid": (30, 15), "Front Raise — Cable": (20, 12.5),
  "Straight-Arm Pulldown": (50, 30), "Cable Pull-Through": (60, 40), "Cable Glute Kickback": (25, 15),
  "Cable Rotation": (30, 20), "Freemotion Y Raise": (15, 10), "Assisted Pull-Up": (40, 60),
  "Dumbbell Lateral Raise": (15, 10), "Dumbbell Curl": (25, 15), "Hammer Curl": (30, 17.5),
  "Incline Dumbbell Curl": (20, 12.5), "Spider Curl": (20, 12.5), "Dumbbell Fly": (25, 15),
  "Dumbbell Skullcrusher": (25, 15), "Dumbbell Reverse Curl": (20, 12.5), "Incline Dumbbell Press": (60, 30),
  "Dumbbell Reverse Lunge": (40, 25), "Bulgarian Split Squat": (40, 25), "Glute Bridge": (50, 35),
}

# G61's heaviest tier: the most absolute load through connective tissue.
HEAVY = {"Barbell RDL", "Smith Machine Squat", "Barbell Hip Thrust", "Smith Machine Hip Thrust",
         "Incline Smith Press", "Leg Press", "Weighted / Assisted Pull-Up"}

# G65: lifts where a planned finish in pounds means the same thing from gym to gym.
AIM_LIFTS = {"Barbell RDL", "Smith Machine Squat", "Barbell Hip Thrust", "Smith Machine Hip Thrust",
             "Incline Smith Press"}

# G63's split move only where the smallest increment is small relative to the load.
COMBO_OK = {"Chest Press Machine", "Chest Supported Row", "Seated Cable Row", "Lat Pulldown", "Seated Leg Curl",
            "Leg Extension", "Hip Abduction Machine", "Assisted Pull-Up", "Standing Calf Raise",
            "Seated Calf Raise", "Cybex Lateral Raise Machine"}

# How much each move pushes next week's effort, before a week of adaptation takes some back.
EFFECT = {("load", "all"): 1.5, ("load", "top2"): 0.9, ("load", "top1"): 0.6, ("load", "drop8"): 0.9,
          ("combo", None): 0.9, ("level", None): 0.6, ("rep", 1): 0.5, ("rep", 2): 1.0, ("hold", None): 0.0,
          ("hold", "rep"): 0.3, ("db", None): 1.0, ("pin", None): 1.0, ("reset", None): -1.5}
ADAPTATION = 0.4


def track(name):
    return "rep" if name in REP_FIRST else "load"


def targets(weeks, days):
    """G64's aimed effort curve, with C7/C7a deciding whether the last week is a deload (None)."""
    deload = days >= 5
    if weeks == 4:
        return [3, 4, 5, None] if deload else [3, 3.5, 4.5, 5]
    return [3, 3.5, 4, 4.5, 5, None] if deload else [3, 3, 3.5, 4, 4.5, 5]


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


def jump_amt(kind, w):
    """G73 generalised: a jump is a percentage. Where the full step is more than an eighth of the load, the
    small step is taken instead -- 10 lb on a 60 lb stack is the lateral-raise problem in a different
    machine. Assistance is excluded; less help is not a percentage of anything."""
    full, small = STEP[kind]
    if kind == "assist":
        return full
    return small if w <= 0 or full / w > 0.125 else full


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


def fresh(name, sex, sets, lo, hi, beginner, guard):
    kind = KIND[name]
    start = 0 if kind == "bw" else START[name][0 if sex == "M" else 1]
    if beginner:
        reps = hi          # G69's beginner starts at the top of the range: lighter, same effort
    elif track(name) == "rep" or guard:
        reps = lo          # G70: a guarded lift sits at its floor of 10 and earns its way from there
    else:
        reps = hi
    return dict(name=name, kind=kind, sets=sets, loads=[start] * sets, reps=reps, base=reps, harder=0)


def describe(st, code, var, lo, done):
    k, L = st["kind"], st["loads"]
    sign, unit = ("−", " lb assist") if k == "assist" else ("+", " lb")
    if code == "load":
        if var == "drop8":
            nxt = f"{fmt_w(next_db(max(L)))}s" if k == "db" else f"{sign}{fmt_w(jump_amt(k, max(L)))}{unit}"
            return f"clean block — 8 reps, {nxt}"
        if var == "top1":
            return f"{sign}{fmt_w(STEP[k][1])}{unit}, top set only"
        amt = fmt_w(jump_amt(k, max(L)))
        return f"{sign}{amt}{unit}, every set" if (var == "all" or len(L) <= 2) else f"{sign}{amt}{unit}, top 2 sets"
    if code == "combo":
        return f"{sign}{fmt_w(STEP[k][1])}{unit} and +1 rep"
    if code == "level":
        return f"level up — every set to {fmt_w(min(L) if k == 'assist' else max(L))}"
    if code == "rep":
        return f"+{var} rep{'s' if var > 1 else ''}"
    if code == "hold":
        return "hold load, +1 rep" if var == "rep" else "hold"
    if code == "db":
        new = next_db(L[0])
        return f"{fmt_w(L[0])}s → {fmt_w(new)}s, expect ~{landing(done, L[0], new)} reps"
    if code == "pin":
        if k == "bw":
            return f"harder version — slower lowering, back to {lo}"
        return f"{sign}{fmt_w(jump_amt(k, L[0]))}{unit}, back to {lo} reps"
    if code == "reset":
        return "drop ~10%, rebuild"
    return code


def apply(st, code, var, lo, done):
    k, L = st["kind"], st["loads"]
    sg = -1 if k == "assist" else 1

    def add(i, amt):
        L[i] = max(0, L[i] + sg * amt)

    if code == "load":
        if var == "drop8":
            if k == "db":
                L[:] = [next_db(max(L))] * len(L)
            else:
                amt = jump_amt(k, max(L))
                L[:] = [max(L) + sg * amt] * len(L)
            st["reps"] = 8
        elif var == "top1":
            add(0, STEP[k][1])
        else:
            amt = jump_amt(k, max(L))
            for i in range(len(L) if var == "all" else min(2, len(L))):
                add(i, amt)
        # Double progression: the reps climbed to earn the weight, so the new weight starts back at the reps
        # the block opened on. Without this a 12-15 calf raise was prescribed 3 x 17 and kept climbing.
        if var in ("all", "top2", "top1"):
            st["reps"] = st["base"]
    elif code == "combo":
        for i in range(len(L)):
            add(i, STEP[k][1])
        st["reps"] += 1
    elif code == "level":
        L[:] = [min(L) if k == "assist" else max(L)] * len(L)
    elif code == "rep":
        st["reps"] += var
    elif code == "hold" and var == "rep":
        st["reps"] += 1
    elif code == "db":
        new = next_db(L[0])
        st["reps"] = landing(done, L[0], new)
        L[:] = [new] * len(L)
    elif code == "pin":
        if k == "bw":
            st["harder"] += 1
        else:
            amt = jump_amt(k, L[0])
            for i in range(len(L)):
                add(i, amt)
        st["reps"] = lo
    elif code == "reset":
        if k == "db":
            L[:] = [prev_db(max(L))] * len(L)
        elif k != "bw":
            small = STEP[k][1]
            base = max(L) * (1.1 if k == "assist" else 0.9)
            L[:] = [round(base / small) * small] * len(L)
        if track(st["name"]) == "rep":
            st["reps"] = lo


def simulate(ex):
    """Run one exercise through a block: week one, one row per later week, and what carries forward.

    ex: seed, name, sex, sets, lo, hi, per, weeks, days, beginner, slow, guard, swap_to, rpe
    """
    rng = random.Random(zlib.crc32(ex["seed"].encode()))
    weeks, sex = ex["weeks"], ex["sex"]
    T = targets(weeks, ex["days"])
    last_training = weeks if T[-1] is not None else weeks - 1
    lo, hi = ex["lo"], ex["hi"]
    ea = " ea." if ex["per"] else ""
    st = fresh(ex["name"], sex, ex["sets"], lo, hi, ex["beginner"], ex["guard"])
    start_name, start_top = st["name"], max(st["loads"])
    # G65: the planned finish. It caps load on the lifts it applies to -- once the top set is there, reps
    # carry the rest of the block -- so one block cannot overshoot and leave the next nowhere to go.
    goal = start_top + (10 if weeks == 4 else 15) if start_name in AIM_LIFTS else None

    def presc(sets=None):
        n = sets or st["sets"]
        harder = " · harder version" if st["harder"] else ""
        return f"{n} × {st['reps']}{ea} @ {load_txt(st['kind'], st['loads'][:n], st['name'])}{harder}"

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
    d = log_reps(st["reps"], e)
    week1 = dict(presc=f"{st['sets']} × {st['reps']}{ea} @ RPE {fmt_w(ex['rpe'])}",
                 picked=f"picked {load_txt(st['kind'], st['loads'], st['name'])}",
                 logged=f"did {d} · how hard {e}" + (" · joint flagged" if ex["swap_to"] else ""))
    E, D, TG = {1: e}, {1: d}, {1: st["reps"]}
    fresh_from, last = 1, None
    clean = not ex["swap_to"]
    rows = []

    for w in range(2, weeks + 1):
        target = T[w - 1]
        e_prev, d_prev, t_prev = E[w - 1], D[w - 1], TG[w - 1]
        e_pp = E.get(w - 2) if (w - 2) >= fresh_from else None
        if T[w - 2] is not None and e_prev > T[w - 2] + 0.5:
            clean = False
        L = st["loads"]
        staggered = len(set(L)) > 1
        rep_first = track(st["name"]) == "rep"
        # A load-first lift may earn two reps over its written number before the weight moves. A guarded one
        # may not: its range is the protection (G70), so at the top of it the load moves instead.
        room = hi if (rep_first or ex["guard"]) else hi + 2
        if st["kind"] == "db" and L[0] >= 20:
            beat_top = d_prev >= hi and e_prev <= 3
        else:
            beat_top = d_prev > hi
        var, sets_shown, label = None, None, None

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
            code = "hold"
            if d_prev < t_prev:
                why = "G62: a 5 and a missed rep — nothing moves until the reps are made"
            elif st["reps"] >= room:
                why = "G62: a 5 at the top of the range — nothing moves"
            else:
                var, why = "rep", "G62: a 5 means effort is spent — the load holds"
        else:
            req = target - e_prev
            adds_reps = last is not None and last[0] in ("rep", "combo")
            step_reps = (last[1] if last and last[0] == "rep" else 1) if adds_reps else 0
            # G71 reads the pair. A 3 or 4 that held or fell after an increase is adaptation; a 2 is G62's
            # "too light", which wants a bigger move than repeating last week's.
            if (last and e_pp is not None and 3 <= e_prev <= e_pp and req >= 0 and not ex["slow"]
                    and st["reps"] + step_reps <= room):
                code, var = last
                if code == "load" and var in ("top2", "top1") and staggered:
                    code, var = "level", None   # once the sets are split, the same-size step is closing the split
                why = f"G71: how hard went {e_pp} → {e_prev} after last week's increase — a net gain, keep the rate"
            elif ex["slow"]:
                if e_prev >= 4:
                    code, why = "hold", "slow track: at 4 or above, nothing rises"
                # G70's "ten down to eight" is a step from a 10-rep floor. A 12-15 range dropping to 8 is a
                # different, much bigger change, so it only fires where the range actually starts at 10.
                elif w == last_training and ex["guard"] and lo == 10 and clean and not ex["beginner"]:
                    code, var, why = "load", "drop8", "G70: a clean block earns the drop from 10 reps to 8"
                elif st["reps"] >= hi:
                    code, why = "hold", "slow track: top of the range — holds until the block ends"
                else:
                    code, var, why = "rep", 1, "slow track: reps before load, every week"
            elif rep_first:
                if beat_top:
                    if st["kind"] == "db":
                        code = "db"
                        why = ("G73: beat the top of the range — under 20 lb, one rung only" if L[0] < 20
                               else "G73: top of the range, and above 20 lb the gate relaxes")
                    else:
                        code, why = "pin", "beat the top of the range"
                elif st["reps"] >= hi:
                    code, why = "hold", "top of the range — beat it to earn the next weight"
                elif e_prev <= 2:
                    code, var = "rep", min(2, hi - st["reps"])
                    why = f"G62: a {e_prev} means it was too light — the rep target moves faster"
                elif req >= 0.25:
                    code, var = "rep", 1
                    why = f"G64: logged {e_prev}, aiming at {aim_label(target)} — climb the range"
                else:
                    code, why = "hold", f"G64: logged {e_prev}, already at {aim_label(target)}"
            else:
                if e_prev <= 2:
                    code, var = "load", "all"
                    why = f"G62: a {e_prev} means it was too light — a full increment on every set"
                elif req >= 0.75 and staggered:
                    code, why = "level", "close the gap already opened before opening a new one"
                elif req >= 1.0 and st["name"] in COMBO_OK and st["reps"] < room:
                    code, why = "combo", "G63: one recovery budget, spent as two small moves"
                elif req >= 0.75 and st["name"] in HEAVY and weeks >= 6:
                    code, var, why = "load", "top1", "G61: six-week block — the smallest jump on a heavy lift"
                elif req >= 0.75:
                    code, var = "load", "top2"
                    why = f"G64: logged {e_prev}, aiming at {aim_label(target)} — stagger the jump"
                elif req >= 0.25 and staggered:
                    code, why = "level", "a small step: close the gap already opened"
                elif req >= 0.25 and st["reps"] < room:
                    code, var, why = "rep", 1, f"G64: logged {e_prev}, aiming at {aim_label(target)} — nearly there"
                else:
                    code, why = "hold", f"G64: logged {e_prev}, already at or past {aim_label(target)}"

        if code == "swap":
            st = fresh(ex["swap_to"], sex, st["sets"], lo, hi, ex["beginner"], ex["guard"])
            fresh_from, goal = 2, None
        elif code != "deload":
            if goal is not None and code in ("load", "combo") and var != "drop8":
                amt = STEP[st["kind"]][1] if (code == "combo" or var == "top1") else jump_amt(st["kind"], max(L))
                if max(L) + amt > goal:
                    if st["reps"] < room:
                        code, var = "rep", 1
                        why = f"G65: the top set is at the planned finish ({fmt_w(goal)} lb) — reps carry the rest of the block"
                    else:
                        code, var = "hold", None
                        why = f"G65: at the planned finish ({fmt_w(goal)} lb) and the top of the range — hold"
            label = describe(st, code, var, lo, d_prev)
            if why.startswith("G71") and code != "level":
                label = "same again — " + label
            apply(st, code, var, lo, d_prev)

        # How the simulated client responds.
        if code == "swap":
            ec = 3.0 + rng.choice([-0.4, 0.0, 0.3])
        elif code == "deload":
            ec = max(1.0, ec - 2.5)
        else:
            ec = ec + EFFECT[(code, var)] - ADAPTATION + rng.choice([-0.6, 0.0, 0.0, 0.0, 0.6])
        ec = min(5.0, max(1.0, ec))
        e = int(round(ec))
        d = log_reps(st["reps"], e)
        E[w], D[w], TG[w] = e, d, st["reps"]
        last = (code, var) if code in ("load", "combo", "rep") else None

        rows.append(dict(week=w, aim=target, code=code, var=var, label=label, why=why,
                         presc=(f"{st['sets']} × {st['reps']}{ea} @ RPE 7 · picked "
                                f"{load_txt(st['kind'], st['loads'], st['name'])}" if code == "swap" else presc(sets_shown)),
                         logged=f"did {d} · how hard {E[w]}"))

    lw = last_training
    renamed = st["name"] != start_name
    carry = (f"{st['name'] + ' · ' if renamed else ''}"
             f"{load_txt(st['kind'], [min(st['loads']) if st['kind'] == 'assist' else max(st['loads'])], st['name'])}"
             f" × {D[lw]} · how hard {E[lw]}")
    aim = None
    if start_name in AIM_LIFTS and not renamed:
        aim = dict(start=start_top, goal=start_top + (10 if weeks == 4 else 15), reached=max(st["loads"]))
    return dict(week1=week1, rows=rows, carry=carry, aim=aim, final_name=st["name"])
