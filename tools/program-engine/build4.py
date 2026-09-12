"""Build the four-program page with engine v4: Jack's review of the v3 programs, applied.

Assembly runs in the order the rules depend on each other:
  1. G97 names carry their implement, then substitutions from intake
  2. G90 no physician clearance -> the exercises that load the bad joint come out entirely
  3. G69 beginners get two sets on everything
  4. G88 a beginner's leg day is a squat OR a leg press, never both, and never a leg extension
  5. G93 an RDL and a leg curl in one session is intermediate-plus
  6. G60/G66/G67/G79/G95 exercise order within each day -- rear delts after the arms
  7. G69 the first two compound leg movements share six sets; G76 a third is kept, at bodybuilding reps
  8. G75 hip-thrust work and pull-through work each capped at six sets a session
  9. G77/G82 each session's volume sized to the gap before that muscle is trained again
 10. G78 opening effort, G70 guards, then the week-by-week simulation (progress4.py)

Gone from v3: the slow track (G85 -- change the implement, not the progression), and any held week (G91).
"""
import json
import html
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from people4 import PEOPLE, REASON
import meta
from meta import LOWER
from progress4 import (simulate, parse_reps, targets, aim_label, fmt_w, track, KIND, ren, orig,
                       THRUST_TARGET, REP_CEILING, EFFORT_FLOOR)

HERE = pathlib.Path(__file__).parent
BASE = json.load(open(HERE / "templates.json"))
E = html.escape

# meta.py is keyed on the pre-G97 names, so every lookup goes back through orig().
muscle = lambda n: meta.muscle(orig(n))
cost = lambda n: meta.cost(orig(n))
region = lambda n: meta.region(orig(n))
# A client whose priorities are not the sex default sets PRI_OVERRIDE (muscle -> rank) before ordering: the
# back-and-shoulders program keys off this rather than forking order_day.
PRI_OVERRIDE = {}


def rank(s, n):
    m = meta.muscle(orig(n))
    return PRI_OVERRIDE.get(m, meta.PRIORITY[s].get(m, 4))


def top_tier(s, n):
    return rank(s, n) == 1
LEG_COMPOUNDS = {ren(n) for n in meta.LEG_COMPOUNDS}

# G77: there is no back-to-back assumption; the week is spread so each muscle gets its recovery. These are the
# usual spreads for each frequency. Positions are days from Monday.
WEEKDAY = {3: ["Mon", "Wed", "Fri"], 4: ["Mon", "Tue", "Thu", "Fri"],
           5: ["Mon", "Tue", "Wed", "Fri", "Sat"], 6: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]}
POS = {3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 4, 5], 6: [0, 1, 2, 3, 4, 5]}

# G75: movement families that carry their own six-set ceiling per session.
FAMILIES = [("hip thrust", "Hip Thrust"), ("pull-through", "Pull-Through")]
FAMILY_CAP = 6
PAIR_CAP = 6          # G69
MAX_SETS = 4          # an exercise never takes more than this
SESSION_CEILING = 12  # G49 is ~14 per muscle and "worth flagging"; nothing is added past 12

# G88: "You have four exercises that will cook the heck out of your quads and your glutes." A beginner gets at
# most this many movements into one muscle in a session.
BEGINNER_PER_MUSCLE = 2
# G88: a beginner's leg day takes one of these, not both.
SQUAT_PATTERN = {ren("Smith Machine Squat")}
PRESS_PATTERN = {ren("Leg Press")}
# G90: what comes out when a knee or tendon problem has no physician clearance.
KNEE_LOADED = {ren(n) for n in ("Leg Press", "Leg Extension", "Bulgarian Split Squat",
                                "Smith Machine Split Lunge", "Dumbbell Reverse Lunge", "Smith Machine Squat")}
# G95: "usually rope curls and dumbbell curls are always of more importance, cosmetically, than rear delt
# exercises. So I would probably put the reverse pec deck at the end."
TAIL_MUSCLES = {"Rear delts"}


def short(dayname):
    return dayname.split(" · ")[0]


def plural(n, word):
    return f"{n} {word}{'' if n == 1 else 's'}"


def substitute(p):
    title, days = BASE[p["sex"]][str(p["days"])]
    subs = {ren(k): (ren(v[0]) if isinstance(v, tuple) else ren(v), v[1] if isinstance(v, tuple) else None)
            for k, v in p["subs"].items()}
    changes, out = [], []
    for dayname, exs in days:
        row, seen = [], set()
        for name, sets, reps in exs:
            name = ren(name)
            if name in subs:
                new, new_reps = subs[name]
                reps = new_reps or reps
                if (name, new) not in [(c[0], c[1]) for c in changes]:
                    changes.append((name, new, REASON.get((p["n"], orig(name)))))
                if new is None:
                    continue
                name = new
            if name in seen:
                continue
            seen.add(name)
            row.append([name, sets, reps])
        out.append([dayname, row])
    return title, out, changes


def clearance(p, days, notes):
    """G90: "We would not be taking on somebody to heal their patellar tendinopathy through this app -- only if
    they're cleared to be able to exercise from their physician." Without clearance the app does not program
    around the joint; the movements that load it come out."""
    if p.get("cleared") != "no":
        return
    dropped = set()
    for dayname, row in days:
        for r in list(row):
            if r[0] in KNEE_LOADED:
                row.remove(r)
                dropped.add(r[0])
    if dropped:
        notes.append(("G90", "no physician clearance on record, so heavy knee loading comes out entirely: "
                      + ", ".join(sorted(dropped)) + " — hip hinging, pull-throughs and hamstring curls stay"))
    else:
        notes.append(("G90", "no physician clearance on record — the intake note is flagged to the coach rather "
                      "than programmed around"))


def beginner_legs(p, days, notes):
    """G88: "I would either have the leg press or the Smith machine squat. I would not do all of this. This is
    way too much volume. You have four exercises that will cook the heck out of your quads and your glutes." """
    if p["level"] != "beginner":
        return
    for dayname, row in days:
        names = {r[0] for r in row}
        if names & SQUAT_PATTERN and names & PRESS_PATTERN:
            for r in list(row):
                if r[0] in PRESS_PATTERN:
                    row.remove(r)
                    notes.append(("G88", f"{short(dayname)}: {r[0]} removed — a beginner's leg day takes the "
                                  f"squat or the leg press, not both"))
        for r in list(row):
            if r[0] == ren("Leg Extension"):
                row.remove(r)
                notes.append(("G88", f"{short(dayname)}: {r[0]} removed — not on a beginner's leg day"))
        counts = {}
        for r in list(row):
            m = muscle(r[0])
            if m == "Core":
                continue
            counts[m] = counts.get(m, 0) + 1
            if counts[m] > BEGINNER_PER_MUSCLE:
                row.remove(r)
                notes.append(("G88", f"{short(dayname)}: {r[0]} removed — {counts[m]} separate movements into "
                              f"{m.lower()} in one session is too many for a beginner"))
                counts[m] -= 1


def hinge_pairs(p, days, notes):
    """G93: "I would only have both these barbell RDLs and the seated leg curls in the same day if this person
    is definitely intermediate at least." """
    if p["level"] != "beginner":
        return
    for dayname, row in days:
        names = {r[0] for r in row}
        if ren("Barbell RDL") in names and ren("Seated Leg Curl") in names:
            for r in list(row):
                if r[0] == ren("Seated Leg Curl"):
                    row.remove(r)
                    notes.append(("G93", f"{short(dayname)}: {r[0]} removed — an RDL and a leg curl in the same "
                                  f"session is intermediate-plus"))


def free_weight(name):
    """Dumbbells, and barbells not in a Smith machine."""
    return KIND.get(name) == "db" or (KIND.get(name) == "bar" and "Smith" not in name)


def order_day(sex, row):
    """G60/G67: the most expensive compound leads. G79: a top-priority lift takes the lead instead only when
    it is a free weight -- G60's incline dumbbell press can lead a chest priority, but a squat still goes before
    a machine press. The other compounds follow by cost. G66: accessories then finish muscles already opened,
    in the order they were opened, before starting new ones. G95: rear delts go after the arms. Core closes."""
    idx = list(range(len(row)))
    nm = lambda i: row[i][0]
    comps = [i for i in idx if cost(nm(i)) <= 1]
    tops = [i for i in comps if top_tier(sex, nm(i)) and free_weight(nm(i))]
    # At the same cost, a compound leg movement is the bigger lift -- a leg press before a pull-through -- which
    # is what "the biggest compound first" means where the cost scale alone calls two lifts equal.
    heavier = lambda i: 0 if nm(i) in LEG_COMPOUNDS else 1
    lead = min(tops or comps or idx, key=lambda i: (cost(nm(i)), heavier(i), i))
    seq, opened = [lead], [muscle(nm(lead))]
    rest = [i for i in comps if i != lead]
    while rest:
        i = min(rest, key=lambda i: (cost(nm(i)), heavier(i), 0 if muscle(nm(i)) in opened else 1, rank(sex, nm(i)), i))
        rest.remove(i)
        seq.append(i)
        if muscle(nm(i)) not in opened:
            opened.append(muscle(nm(i)))
    acc = [i for i in idx if i not in seq]
    first = {}
    for i in acc:
        first.setdefault(muscle(nm(i)), i)
    lead_region = region(nm(lead))

    def key(i):
        m = muscle(nm(i))
        if cost(nm(i)) == 3:
            return (3, 0, 0, first[m], i)
        if m in TAIL_MUSCLES:                       # G95: after the arms, before core
            return (2, 0, 0, first[m], i)
        if m in opened:
            return (0, opened.index(m), 0, first[m], i)
        return (1, 0 if region(nm(i)) == lead_region else 1, rank(sex, nm(i)), first[m], i)

    seq += sorted(acc, key=key)
    return [row[i] for i in seq]


def leg_compounds(days, notes):
    """G69: the first two compound leg movements in a session share six sets, trimmed from the larger.
    G76: a third is kept -- it is bodybuilding work, 8+ reps, or 10+ when the two before it were already a lot
    of volume, because what it inherits is the volume before it, not the count."""
    for dayname, row in days:
        comp = [r for r in row if r[0] in LEG_COMPOUNDS]
        pair = comp[:2]
        if len(pair) == 2:
            before = f"{pair[0][1]} + {pair[1][1]}"
            while pair[0][1] + pair[1][1] > PAIR_CAP:
                big = max(pair, key=lambda r: r[1])
                if big[1] <= 2:
                    break
                big[1] -= 1
            after = f"{pair[0][1]} + {pair[1][1]}"
            if after != before:
                notes.append(("G69", f"{short(dayname)}: {pair[0][0]} + {pair[1][0]} trimmed from {before} to {after} sets"))
        for r in comp[2:]:
            prior = sum(p[1] * parse_reps(p[2])[1] for p in pair)
            floor = 10 if prior >= 60 else 8
            lo, hi, per = parse_reps(r[2])
            if lo < floor:
                r[2] = f"{floor}–{max(hi, floor + 2)}" + ("/s" if per else "")
            notes.append(("G76", f"{short(dayname)}: {r[0]} kept as a third compound leg movement, at {floor}+ reps "
                          f"— {prior} reps of compound leg work come before it"))


def family_of(name):
    for label, key in FAMILIES:
        if key in name:
            return label, key
    return None


def cap_families(days, notes):
    """G75: hip-thrust work and pull-through work each get at most six sets in a session, on their own
    ceilings rather than G69's."""
    for dayname, row in days:
        for label, key in FAMILIES:
            fam = [r for r in row if key in r[0]]
            total = sum(r[1] for r in fam)
            if total <= FAMILY_CAP:
                continue
            while sum(r[1] for r in fam) > FAMILY_CAP:
                big = max(fam, key=lambda r: r[1])
                if big[1] <= 2:
                    break
                big[1] -= 1
            notes.append(("G75", f"{short(dayname)}: {label} work trimmed from {total} to {sum(r[1] for r in fam)} sets"))


def size_to_gaps(n_days, days, notes):
    """G77/G82: a session's volume is sized to how long the muscle has before it is trained again.

    Back-to-back, a set comes off each of that muscle's exercises. With one rest day, only a hard session --
    eight or more sets of that muscle -- loses a set. Where a muscle lost volume somewhere, the session before
    its longest gap (three or more rest days) gets a set back, because that one has the most time to heal."""
    pos = POS[n_days]
    trained = {}
    for k, (_, row) in enumerate(days):
        for r in row:
            m = muscle(r[0])
            if m != "Core":
                trained.setdefault(m, [])
                if k not in trained[m]:
                    trained[m].append(k)
    for m, ks in trained.items():
        if len(ks) < 2:
            continue
        gaps = {k: ((pos[ks[(i + 1) % len(ks)]] - pos[k]) % 7) or 7 for i, k in enumerate(ks)}
        cut_days = []
        for k in ks:
            dayname, row = days[k]
            mine = [r for r in row if muscle(r[0]) == m]
            gap = gaps[k]
            if gap == 1 or (gap == 2 and sum(r[1] for r in mine) >= 8):
                cut = [r for r in mine if r[1] > 2]
                for r in cut:
                    r[1] -= 1
                if cut:
                    cut_days.append(k)
                    rest = "no rest day" if gap == 1 else "one rest day"
                    notes.append(("G82", f"{short(dayname)}: {m.lower()} has {rest} before it is trained again, "
                                  f"so one set off {plural(len(cut), 'exercise')}"))
        if not cut_days:
            continue
        k = max(ks, key=lambda k: (gaps[k], -k))
        if k in cut_days or gaps[k] < 4:
            continue
        dayname, row = days[k]
        mine = [r for r in row if muscle(r[0]) == m]
        if sum(r[1] for r in mine) >= SESSION_CEILING:
            continue
        for r in mine:
            fam = family_of(r[0])
            fam_full = fam and sum(x[1] for x in row if fam[1] in x[0]) >= FAMILY_CAP
            if r[1] < MAX_SETS and r[0] not in LEG_COMPOUNDS and not fam_full:
                r[1] += 1
                notes.append(("G82", f"{short(dayname)}: {m.lower()} has {gaps[k] - 1} rest days before it is trained "
                              f"again, so {r[0]} gets a set back ({r[1]})"))
                break


def opening_efforts(p, days):
    """G78: some lifts open at RPE 7.5 -- the first of each day for an intermediate, the first two for an
    advanced lifter, none for a beginner -- and never more than a third of the program's lifts. Guarded lifts
    always open at 7."""
    if p["level"] == "beginner":
        return set()
    per_day = 2 if p["level"] == "advanced" else 1
    budget = sum(len(row) for _, row in days) // 3
    picks = set()
    for slot in range(per_day):
        for k, (_, row) in enumerate(days):
            if slot < len(row) and len(picks) < budget:
                if row[slot][0] not in p["guard"]:
                    picks.add((k, slot))
    return picks


def build(p):
    title, days, changes = substitute(p)
    notes = []
    beginner = p["level"] == "beginner"
    clearance(p, days, notes)
    if beginner:
        for _, row in days:
            for r in row:
                r[1] = 2
        notes.append(("G69", "beginner — two sets on every exercise for the whole block"))
    beginner_legs(p, days, notes)
    hinge_pairs(p, days, notes)
    reordered = []
    for k, (dn, row) in enumerate(days):
        new = order_day(p["sex"], row)
        if [r[0] for r in new] != [r[0] for r in row]:
            reordered.append(short(dn))
        days[k] = [dn, new]
    if reordered:
        notes.append(("G95", "exercise order changed on " + ", ".join(reordered)
                      + " — the biggest compound first unless a top-priority free weight leads, each muscle's "
                        "work kept together, and rear delts after the arms (G60, G66, G67, G79)"))
    leg_compounds(days, notes)
    cap_families(days, notes)
    size_to_gaps(p["days"], days, notes)
    picks = opening_efforts(p, days)
    total_lifts = sum(len(row) for _, row in days)
    if picks:
        notes.append(("G78", f"{plural(len(picks), 'lift')} of {total_lifts} open at RPE 7.5 — the first of each day, "
                      f"under a third of the program"))
    elif not beginner:
        notes.append(("G78", "every lift opens at RPE 7"))
    if p["days"] >= 5:
        notes.append(("C7a", f"{p['days']} days a week — week {p['weeks']} is the deload, not an extra week after the block"))

    plan, weekly = [], {}
    guards = {ren(g) for g in p["guard"]}
    flag = (ren(p["flag"][0]), ren(p["flag"][1])) if p["flag"] else None
    for k, (dn, row) in enumerate(days):
        exs = []
        for slot, (name, sets, reps) in enumerate(row):
            lo, hi, per = parse_reps(reps)
            guard = name in guards
            if guard:
                lo, hi = max(lo, 10), max(hi, max(lo, 10) + 2)
            swap_to = flag[1] if flag and flag[0] == name else None
            rpe = 7.5 if (k, slot) in picks else 7
            ex = dict(seed=f"{p['n']}-{k}-{name}", name=name, sex=p["sex"], sets=sets, lo=lo, hi=hi, per=per,
                      weeks=p["weeks"], days=p["days"], beginner=beginner, guard=guard,
                      swap_to=swap_to, rpe=rpe)
            exs.append((ex, simulate(ex)))
            weekly[muscle(name)] = weekly.get(muscle(name), 0) + sets
        plan.append((WEEKDAY[p["days"]][k], dn, exs))

    fired, held, viol, near, far = {}, 0, [], 0, 0
    for _, _, exs in plan:
        for _, sim in exs:
            viol += sim["violations"]
            # G86, split in two: finishing a point under the aim is close, finishing two or more under is the
            # cable-curl complaint — "her exertion is not hard enough by the end of the block".
            if sim["aimed"] is not None:
                gap = sim["aimed"] - sim["landed"]
                if gap > 1:
                    far += 1
                elif gap > 0.5:
                    near += 1
            for r in sim["rows"]:
                if r["code"] == "hold":
                    held += 1
                for tag in set(re.findall(r"\bG\d+\b", r["why"])):
                    fired[tag] = fired.get(tag, 0) + 1
    checks = dict(held=held, viol=viol, near=near, far=far,
                  moves=sum(len(s["rows"]) for _, _, exs in plan for _, s in exs))
    return title, plan, changes, notes, weekly, fired, checks


CSS = """
:root{--bg:#0b0c11;--surface:#131419;--raise:#171a20;--acc:#4ce08f;--acc3:#a5f4c7;--warn:#ffb84d;--danger:#ff6b6b;
--caution:#ffe066;--blue:#8fd0ff;--violet:#c4a8ff;--n200:#e4e7f5;--n300:#cfd3e5;--n400:#b2b6ca;--n500:#9397ab;
--n600:#75798c;--n700:#595d6c;--n800:#3f424d;--divider:rgba(233,233,237,.07);
--font:"Inter",system-ui,-apple-system,sans-serif;--mono:"JetBrains Mono",ui-monospace,Menlo,monospace}
*{box-sizing:border-box}
body{background:var(--bg);color:var(--n200);font-family:var(--font);font-size:15px;line-height:1.6;margin:0}
.wrap{max-width:1280px;margin:0 auto;padding:0 20px 100px}
header{padding:50px 0 28px;border-bottom:1px solid var(--divider)}
.k{font-family:var(--mono);font-size:10.5px;letter-spacing:.17em;text-transform:uppercase;color:var(--acc);margin-bottom:14px}
h1{font-size:clamp(28px,4.6vw,44px);font-weight:800;letter-spacing:-.028em;line-height:1.05;margin:0 0 14px;text-wrap:balance}
.lede{color:var(--n500);max-width:66ch;margin:0;font-size:16px}
h2{font-size:clamp(20px,2.8vw,26px);font-weight:800;letter-spacing:-.02em;margin:0 0 12px;text-wrap:balance}
.sec{margin:48px 0 0;padding-top:24px;border-top:1px solid var(--divider)}
.eyebrow{font-family:var(--mono);font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--n700);margin-bottom:9px}
ul.new{margin:0;padding:0;list-style:none;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
@media (max-width:860px){ul.new{grid-template-columns:1fr}}
ul.new li{background:var(--surface);border:1px solid var(--divider);border-radius:6px;padding:12px 14px;font-size:13.5px;color:var(--n400)}
ul.new li b{color:var(--n200);display:block;font-size:14px;margin-bottom:2px}
ul.new li q{color:var(--n500);font-style:italic;display:block;margin-top:5px;font-size:12.5px}
.rule{font-family:var(--mono);font-size:10px;color:var(--acc);border:1px solid rgba(76,224,143,.3);border-radius:3px;padding:0 5px;margin-right:6px;white-space:nowrap}
ol.ask{margin:0;padding-left:22px;max-width:80ch}
ol.ask li{margin:0 0 9px;color:var(--n400);font-size:14px}
ol.ask li b{color:var(--n200)}
.legend{display:flex;flex-wrap:wrap;gap:6px 18px;margin:16px 0 0;font-size:12.5px;color:var(--n500)}
.legend b{font-family:var(--mono);font-size:11px;font-weight:600}
nav.jump{position:sticky;top:0;background:rgba(11,12,17,.95);backdrop-filter:blur(8px);border-bottom:1px solid var(--divider);padding:9px 0;z-index:10}
nav.jump .inner{max-width:1280px;margin:0 auto;padding:0 20px;display:flex;gap:6px;overflow-x:auto}
nav.jump a{font-family:var(--mono);font-size:11px;color:var(--n500);text-decoration:none;padding:4px 9px;border:1px solid var(--divider);border-radius:3px;white-space:nowrap}
nav.jump a:hover,nav.jump a:focus-visible{color:var(--n200);outline:none;border-color:var(--n700)}
.person{border:1px solid var(--divider);border-radius:6px;background:var(--surface);overflow:hidden}
.p-hd{padding:16px 18px;border-bottom:1px solid var(--divider);display:flex;flex-wrap:wrap;gap:4px 14px;align-items:baseline}
.p-freq{font-family:var(--mono);font-size:20px;color:var(--acc);font-weight:700}
.p-name{font-weight:800;font-size:18px;letter-spacing:-.01em}
.p-meta{font-family:var(--mono);font-size:11px;color:var(--n500);margin-left:auto}
.p-body{padding:6px 18px 18px}
.intake{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:14px 0 4px}
@media (max-width:860px){.intake{grid-template-columns:1fr}}
.intake div{background:var(--raise);border:1px solid var(--divider);border-radius:6px;padding:10px 13px;font-size:13px;color:var(--n400)}
.intake b{display:block;font-family:var(--mono);font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--n600);margin-bottom:4px}
.flag{background:rgba(255,107,107,.07);border-left:3px solid var(--danger);padding:11px 14px;margin:14px 0 6px;border-radius:0 6px 6px 0;font-size:13.5px}
.flag b{color:var(--danger)}
.chg{background:rgba(76,224,143,.05);border-left:3px solid var(--acc);padding:11px 14px;margin:8px 0 4px;border-radius:0 6px 6px 0;font-size:13.5px;color:var(--n400)}
.chg b{color:var(--acc3)}
.swap{font-family:var(--mono);font-size:11.5px;color:var(--n400);display:block;margin-top:4px}
.swap s{color:var(--n700)} .swap em{font-style:normal;color:var(--acc3)}
.applied{margin:8px 0 4px;padding:11px 14px;border:1px solid var(--divider);border-radius:6px;font-size:13px;color:var(--n400)}
.applied div{margin:3px 0}
.applied .h{font-family:var(--mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--n600);margin-bottom:6px}
.checks{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px;padding-top:9px;border-top:1px dashed var(--divider)}
.checks span{font-family:var(--mono);font-size:11px;border-radius:3px;padding:2px 8px;background:rgba(76,224,143,.09);color:var(--acc3)}
.checks span.bad{background:rgba(255,107,107,.12);color:var(--danger)}
.vol{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.vol span{font-family:var(--mono);font-size:11px;color:var(--n400);background:var(--raise);border-radius:3px;padding:2px 7px}
.vol span b{color:var(--n200);font-weight:600}
.day{font-family:var(--mono);font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--n500);margin:22px 0 6px}
.day em{font-style:normal;color:var(--acc)}
.scroller{overflow-x:auto;border:1px solid var(--divider);border-radius:4px}
table{border-collapse:collapse;width:100%;font-size:12.5px}
th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--divider);vertical-align:top}
thead th{background:var(--raise);font-family:var(--mono);font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--n500);font-weight:400;white-space:nowrap}
thead th i{font-style:normal;color:var(--n700);text-transform:none;letter-spacing:0}
tbody tr:last-child td{border-bottom:none}
td.ex{min-width:180px;font-size:13px;font-weight:600}
.tags{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
.tag{font-family:var(--mono);font-size:9.5px;font-weight:400;padding:0 5px;border-radius:2px;border:1px solid var(--n800);color:var(--n600)}
.tag.guard{color:var(--danger);border-color:#5c2a2a}
.tag.hard{color:var(--acc);border-color:rgba(76,224,143,.35)}
td.wk{min-width:198px}
.mv{display:block;font-size:11.5px;font-weight:700}
.presc{display:block;font-family:var(--mono);font-size:11.5px;color:var(--n200);margin-top:2px;font-variant-numeric:tabular-nums}
.why{display:block;font-size:10.5px;color:var(--n600);line-height:1.35;margin-top:3px}
.lg{display:block;font-family:var(--mono);font-size:10px;color:var(--n500);margin-top:5px;padding-top:4px;border-top:1px dashed var(--divider)}
td.carry{min-width:170px;background:rgba(196,168,255,.04)}
td.carry .presc{color:var(--violet)}
.gain{display:block;font-family:var(--mono);font-size:10px;margin-top:4px;color:var(--n500)}
.gain.up{color:var(--acc)}
.m-load .mv{color:var(--acc)} .m-level .mv{color:var(--acc3)} .m-hold .mv{color:var(--warn)}
.m-rep .mv{color:var(--blue)} .m-jump .mv{color:var(--caution)} .m-reset .mv{color:var(--danger)}
.m-half .mv{color:var(--blue)} .m-deload .mv{color:var(--n400)} .m-swap .mv{color:var(--danger)}
.m-w1 .mv{color:var(--n500)}
.note{border-left:3px solid var(--warn);background:rgba(255,184,77,.07);padding:13px 17px;border-radius:0 8px 8px 0;margin:36px 0 0;max-width:78ch;font-size:14px}
.note b{color:var(--warn)}
@media (prefers-reduced-motion:reduce){*{scroll-behavior:auto}}
"""

CLS = {"load": "load", "combo": "load", "level": "level", "rep": "rep", "half": "half", "hold": "hold",
       "db": "jump", "pin": "jump", "reset": "reset", "deload": "deload", "swap": "swap"}

# Every cell is four stacked lines and nothing on the page said so, which is how a staggered prescription
# ended up unreadable. Shared by both pages.
_P = 'class="presc" style="display:inline"'
HOWTO = (
    '<div class="applied" style="margin-top:18px"><div class="h">How to read a cell</div>'
    '<div><b>Line 1 — the move.</b> What changes this week, and nothing else changes.</div>'
    f'<div><b>Line 2 — the prescription.</b> <span {_P}>4 × 10 @ 100 lb</span> is four sets of ten reps at a '
    f'hundred pounds. When the sets are not all the same, each group is named: '
    f'<span {_P}>sets 1–2: 11 reps · sets 3–4: 10 reps @ 100 lb</span> means the first two sets get eleven '
    f'reps and the last two get ten, all at a hundred pounds. If the weight differs too, each group carries '
    f'its own: <span {_P}>set 1: 11 reps @ 95 lb · sets 2–3: 11 reps @ 90 lb</span>. Set 1 is always the '
    f'heaviest.</div>'
    '<div><b>Line 3 — why,</b> and the rule it came from.</div>'
    '<div><b>Line 4 — what they logged:</b> reps on the last set, and how hard that set was out of 5.</div>'
    '</div>')


def gain_txt(sim):
    g = sim["gain"]
    if g is None:
        return ""
    if sim["kind"] == "assist":
        return f'<span class="gain{" up" if g > 0 else ""}">{"−" + fmt_w(g) + " lb assistance over the block" if g > 0 else "same assistance — reps carried it"}</span>'
    unit = "s" if sim["kind"] == "db" else " lb"
    if g > 0:
        return f'<span class="gain up">+{fmt_w(g)}{" lb" if unit == "s" else unit} over the block</span>'
    return '<span class="gain">no weight added — reps carried it</span>'


def render():
    P = []
    A = P.append
    A("<title>Four Programs, 3× to 6×</title>")
    A('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap">')
    A(f"<style>{CSS}</style>")
    A('<nav class="jump" aria-label="Jump to"><div class="inner"><a href="#new">Your review</a><a href="#ask">Still my call</a>'
      + "".join(f'<a href="#p{p["n"]}">{p["days"]}× · {E(p["name"])}</a>' for p in PEOPLE)
      + '</div></nav><div class="wrap">')
    A('<header><div class="k">Jacked · engine v4 · four programs</div>'
      '<h1>Your review of v3, built into the engine</h1>'
      '<p class="lede">Leah and Dominic rebuilt with every note you gave, and Alina and Kai built for the first '
      'time with all of it already in. Every week after the first is a decision you would approve: the move, the '
      'rep scheme it produces, why, and what they logged. Nothing is held any more except after a logged 5, '
      'where they overshot the aim; every other held week is now a half step. And no move takes away more work '
      'than it adds. Both are checked on every decision and counted under each program.</p></header>')

    A('<section class="sec" id="new"><div class="eyebrow">What you said, and what changed</div>'
      '<h2>Fifteen rules out of your review</h2><ul class="new">'
      '<li><b><span class="rule">G91</span>No held weeks</b>Week two used to be held almost everywhere, because the log already matched the aim and the engine had nothing smaller than a full step.<q>“I don\'t understand why every week two of every block is being held. You have to add stress every week.”</q></li>'
      '<li><b><span class="rule">G92</span>The half step</b>Reps are now per set, so half the sets can move. That is what replaced holding.<q>“If you add a rep to half the sets, it\'s essentially half of a progression.”</q></li>'
      '<li><b><span class="rule">G91</span>A move never costs more than it buys</b>A set gives back reps only if it took weight that week. Dominic\'s week five bug is fixed and the check runs on every move.<q>“You added five pounds on one set and dropped the total reps per session by four reps. That doesn\'t add up.”</q></li>'
      '<li><b><span class="rule">G83</span>A beginner\'s hinge creeps</b>Small plate only, and reps carry it. Leah\'s RDL went 95 → 125 in v3.<q>“Maybe a hundred and twenty or a hundred and fifteen pounds with more reps by the end of the block at the most.”</q></li>'
      '<li><b><span class="rule">G84</span>The hip thrust gets pushed</b>Weight leads, and weight and reps can move in the same week, until about 225 for eight.<q>“Hip thrust is a very safe exercise, so you can get pretty aggressive with weight jumps on it.”</q></li>'
      '<li><b><span class="rule">G85</span>A sore wrist changes the implement</b>The slow track is gone. Leah\'s press is a machine press with a wrist wrap, progressing like anything else.<q>“Why is the reps just being held? I would try to get them onto a pressing machine specifically.”</q></li>'
      '<li><b><span class="rule">G87</span>Moves priced as percentages</b>Five pounds on a 95 lb bar is 5%; a rep at ten is 10%. So the small plate is often the <em>smaller</em> step, and the engine now says so in the reason.<q>“Don\'t be afraid of little load progressions like that too.”</q></li>'
      '<li><b><span class="rule">G88</span>A beginner\'s leg day is short</b>Squat or leg press, never both, no leg extension, and at most two movements into one muscle.<q>“This is way too much volume. You have four exercises that will cook the heck out of your quads and your glutes.”</q></li>'
      '<li><b><span class="rule">G89</span>Reps stop at seventeen</b>Past sixteen the weight goes up and the reps come down, whatever the written range says.<q>“I would not let these get past the sixteen, seventeen mark, though. Pull them back down.”</q></li>'
      '<li><b><span class="rule">G90</span>Clearance first</b>Dominic has no physician sign-off, so the leg press and leg extension come out entirely rather than being programmed around.<q>“We would not be taking on somebody to heal their patellar tendinopathy through this app.”</q></li>'
      '<li><b><span class="rule">G93</span>RDL plus leg curl is intermediate-plus</b>A beginner gets one or the other in a session, not both.<q>“I would only have both these in the same day if this person is definitely intermediate at least.”</q></li>'
      '<li><b><span class="rule">G94</span>Three is the floor</b>Every aim is 3 or above, and a logged 2 is repaired in one move rather than walked back.<q>“Training at a two is not productive pretty much at all.”</q></li>'
      '<li><b><span class="rule">G95</span>Rear delts last</b>The reverse pec deck goes after the pushdowns and the curls.<q>“Rope curls and dumbbell curls are always of more importance, cosmetically, than rear delt exercises.”</q></li>'
      '<li><b><span class="rule">G96</span>The intake asks more</b>Training age, consistency and what a typical session looks like are on every profile now, because half these rules key off them.<q>“I can make implications based off of their training age, how consistent they\'ve been, what does a typical workout look like.”</q></li>'
      '<li><b><span class="rule">G97</span>Names carry the implement</b>Chest-Supported Machine Row, Plate-Loaded Leg Press, Barbell Glute Bridge.<q>“You need to specify if it\'s a chest supported dumbbell row, machine row, or whatever.”</q></li>'
      '</ul>')
    A('<div class="legend">'
      '<span class="m-load"><b class="mv" style="display:inline">+weight</b> add weight</span>'
      '<span class="m-half"><b class="mv" style="display:inline">+1 rep on half</b> the half step</span>'
      '<span class="m-rep"><b class="mv" style="display:inline">+rep</b> every set climbs</span>'
      '<span class="m-level"><b class="mv" style="display:inline">level up</b> lagging sets catch the top weight</span>'
      '<span class="m-jump"><b class="mv" style="display:inline">next weight</b> reps earned it, or the ceiling forced it</span>'
      '<span class="m-hold"><b class="mv" style="display:inline">hold</b> only after a logged 5</span>'
      '<span class="m-swap"><b class="mv" style="display:inline">swap</b> joint flagged</span>'
      '<span class="m-deload"><b class="mv" style="display:inline">deload</b> last week, 5–6 days</span>'
      '</div>' + HOWTO + '</section>')

    A('<section class="sec" id="ask"><div class="eyebrow">Still my call</div>'
      '<h2>Five calls I made putting your review into practice</h2><ol class="ask">'
      '<li><b>How big a half step is.</b> You described one set of sixteen and three of fifteen, then three of sixteen and one of fifteen. I implemented "half the sets" literally: the front half of whichever sets are still on the lower number, so four sets take three weeks to all gain a rep. That is the slowest honest pace, which is what a six-week block wants.</li>'
      f'<li><b>The one case where nothing rises.</b> A logged 5 against a lower aim means they overshot, so the load holds. That is the only hold left in the engine — every other former hold is now a half step. If you want stress added even after a 5, say so and it goes too.</li>'
      f'<li><b>Where the rep ceiling bites.</b> {REP_CEILING} reps is the hard stop and {REP_CEILING - 1} forces the jump — unless the written range already sits higher, in which case the range wins, since a 15–18 hip abduction is a prescription rather than reps that crept up. G80 still wants reps past 15 before a 20% jump, so the window where a big jump gets earned is 16–17 reps.</li>'
      f'<li><b>When the hip thrust stops leading with weight.</b> {THRUST_TARGET} lb for eight, from your number. After that it goes back to the normal rules.</li>'
      '<li><b>Your 12.5s rule on cables and machines.</b> Once the reps are past 15, a jump that would still be 40% or more of the weight uses the small add-on plate instead. You said this about dumbbells; I carried it over.</li>'
      '</ol></section>')

    all_checks = dict(held=0, viol=[], near=0, far=0, moves=0)
    body = []
    for p in PEOPLE:
        title, plan, changes, notes, weekly, fired, checks = build(p)
        all_checks["held"] += checks["held"]
        all_checks["viol"] += checks["viol"]
        all_checks["near"] += checks["near"]
        all_checks["far"] += checks["far"]
        all_checks["moves"] += checks["moves"]
        B = body.append
        T = targets(p["weeks"], p["days"])
        B(f'<section class="sec" id="p{p["n"]}"><div class="person"><div class="p-hd">'
          f'<span class="p-freq">{p["days"]}×</span><span class="p-name">{E(p["name"])}</span>'
          f'<span class="p-meta">{p["sex"]} · {p["age"]} · {p["level"]} · {p["weeks"]}-week block · {E(title)}</span></div>'
          f'<div class="p-body">')
        B('<div class="intake">'
          f'<div><b>Training age</b>{E(p["training_age"])}</div>'
          f'<div><b>Consistency</b>{E(p["consistency"])}</div>'
          f'<div><b>A typical session</b>{E(p["typical"])}</div></div>')
        B(f'<div class="flag"><b>Noted on intake.</b> {E(p["note"])} <b>Cleared?</b> {E(p["cleared_note"])}</div>')
        B(f'<div class="chg"><b>What that changed.</b> {E(p["changed"])}')
        for old, new, why in changes:
            B(f'<span class="swap"><s>{E(old)}</s> → <em>{E(new) if new else "removed"}</em>{" — " + E(why) if why else ""}</span>')
        B('</div>')
        B('<div class="applied"><div class="h">Rules that shaped the program</div>')
        for rule, text in notes:
            B(f'<div><span class="rule">{rule}</span>{E(text)}</div>')
        if fired:
            B('<div><span class="rule">weekly</span>decisions citing '
              + ", ".join(f"{k} ×{v}" for k, v in sorted(fired.items(), key=lambda kv: (-kv[1], kv[0]))) + '</div>')
        bad = "" if not checks["viol"] else " bad"
        B(f'<div class="checks"><span>{checks["moves"]} weekly decisions</span>'
          f'<span class="{"bad" if checks["held"] else ""}">{checks["held"]} held weeks</span>'
          f'<span class="{bad}">{len(checks["viol"])} moves that cost more work than they added</span>'
          f'<span>{checks["near"]} lifts finishing one under their aim</span>'
          f'<span class="{"bad" if checks["far"] else ""}">{checks["far"]} finishing two or more under</span></div>')
        order = ["Chest", "Back", "Side delts", "Front delts", "Rear delts", "Biceps", "Triceps", "Forearms",
                 "Glutes", "Quads", "Hamstrings", "Calves", "Core"]
        B('<div class="vol">' + "".join(f'<span>{m} <b>{weekly[m]}</b></span>' for m in order if m in weekly)
          + '<span style="background:none;color:var(--n600)">sets a week, before any deload</span></div></div>')

        head = "".join(f'<th>Week {w} <i>aim {aim_label(T[w - 1])}</i></th>' for w in range(2, p["weeks"] + 1))
        for weekday, dn, exs in plan:
            B(f'<div class="day"><em>{weekday}</em> · {E(dn)}</div><div class="scroller"><table><thead><tr>'
              f'<th>Exercise</th><th>Week 1 <i>aim {aim_label(T[0])}</i></th>{head}<th>Carries forward</th></tr></thead><tbody>')
            for ex, sim in exs:
                rep_first = track(ex["name"], ex["beginner"]) == "rep"
                rng_txt = f'{ex["lo"]}–{ex["hi"]}' if (rep_first or ex["guard"]) else f'{ex["hi"]}'
                tags = [f'<span class="tag">{rng_txt}{" ea." if ex["per"] else ""}</span>',
                        f'<span class="tag">{"rep-first" if rep_first else "load-first"}</span>']
                if ex["rpe"] == 7.5:
                    tags.append('<span class="tag hard">opens 7.5</span>')
                if ex["guard"]:
                    tags.append('<span class="tag guard">guarded</span>')
                w1 = sim["week1"]
                cells = (f'<td class="wk m-w1"><span class="mv">they pick the weight</span>'
                         f'<span class="presc">{E(w1["presc"])}</span><span class="why">{E(w1["picked"])}</span>'
                         f'<span class="lg">{E(w1["logged"])}</span></td>')
                for r in sim["rows"]:
                    cells += (f'<td class="wk m-{CLS[r["code"]]}"><span class="mv">{E(r["label"])}</span>'
                              f'<span class="presc">{E(r["presc"])}</span><span class="why">{E(r["why"])}</span>'
                              f'<span class="lg">{E(r["logged"])}</span></td>')
                B(f'<tr><td class="ex">{E(ex["name"])}<div class="tags">{"".join(tags)}</div></td>{cells}'
                  f'<td class="carry"><span class="presc">{E(sim["carry"])}</span>{gain_txt(sim)}</td></tr>')
            B('</tbody></table></div>')
        B('</div></div></section>')

    A(f'<section class="sec"><div class="eyebrow">Checked across all four programs</div>'
      f'<h2>{all_checks["moves"]} weekly decisions, {all_checks["held"]} of them held</h2>'
      f'<p class="lede">Every decision below is re-derived after it is made: did the session end up with fewer '
      f'total reps than the week before, and if so, did every set that lost reps gain weight? '
      f'{len(all_checks["viol"])} moves failed that check. On where the blocks land: '
      f'{all_checks["near"]} lifts finish one point under the effort they were aimed at, and '
      f'{all_checks["far"]} finish two or more under — the second number is your cable curl, where the block '
      f'ends easier than it was supposed to.</p>')
    if all_checks["viol"]:
        A('<div class="applied" style="margin-top:14px">' + "".join(f'<div>{E(v)}</div>' for v in all_checks["viol"]) + '</div>')
    A('</section>')
    P += body

    A('<div class="note"><b>How to give feedback.</b> The logs are simulated so every decision has something '
      'to act on — ignore whether a number is realistic. Judge the move on each cell given what was logged '
      'the week before and which week of the block it is. Where you would have done something else, say the '
      'person, the exercise, the week, and what you would have done.</div>')
    A('</div>')
    out = HERE / "four-programs.html"
    out.write_text("\n".join(P), encoding="utf-8")
    print(f"{out}  {out.stat().st_size / 1024:.0f} KB")
    print(f"moves={all_checks['moves']} held={all_checks['held']} "
          f"stress_violations={len(all_checks['viol'])} "
          f"one_under={all_checks['near']} two_or_more_under={all_checks['far']}")
    for v in all_checks["viol"]:
        print("  !", v)


if __name__ == "__main__":
    render()
