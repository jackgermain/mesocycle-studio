"""A five-day program for an upper-back-and-shoulder priority, built around low back pain.

Everything here runs on engine v4 (progress4.py) and the same rule functions as the four-program page
(build4.py). What is new is three things, and all three are mine to propose rather than doctrine Jack has
ruled on -- the page says so:

  1. A back-safe exercise filter. The loaded hinge and the axially loaded squat come out, along with loaded
     spinal flexion and loaded rotation. What replaces them trains the same muscles with the spine supported
     or unloaded.
  2. A priority override. Jack asked for upper back and shoulders and nothing else prioritised, so Back,
     side delts and rear delts are rank 1 and every other muscle is level.
  3. G95 suspended. "Rear delts after the arms" was a cosmetic-priority ruling; here the rear delts ARE the
     priority, so they are not pushed to the end of the day.

G90 is why this program exists at all: he is cleared. Without a physician's sign-off this intake would be
declined, the same ruling Jack made on Dominic's patellar tendinopathy.
"""
import html
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import build4
from build4 import (order_day, leg_compounds, cap_families, size_to_gaps, opening_efforts,
                    WEEKDAY, CSS, CLS, HOWTO, gain_txt, plural, short, muscle)
from progress4 import simulate, parse_reps, targets, aim_label, fmt_w, track

HERE = pathlib.Path(__file__).parent
E = html.escape

PERSON = dict(
    name="Marcus", sex="M", age="30–40", days=5, weeks=6, level="intermediate",
    title="Pull / Lower / Push / Pull / Hips and arms",
    training_age="Four years in a gym, the last two of it structured.",
    consistency="Five days a week for the past year; loses about a week a quarter to travel.",
    typical="Machines and cables, 8–15 reps, the last set of each exercise close to failure. Stopped "
            "deadlifting and barbell squatting eighteen months ago when the back started hurting.",
    cleared="yes",
    cleared_note="Yes — physician and physiotherapist have both cleared him for full gym training. No red "
                 "flags: no pain down the leg, no numbness, no weakness.",
    note="Low back pain for about two years — a deep ache after loaded hinging and after a long day sitting, "
         "worst the morning after. Barbell squats and deadlifts reliably set it off.",
    changed="The two lifts that reliably hurt come out: the loaded hinge and the bar on the back. What "
            "replaces them trains the same muscles with the spine either supported or unloaded — a leg press "
            "for the squat, a bodyweight 45° extension for the RDL. Loaded spinal flexion and loaded rotation "
            "come out of the core work, and anti-extension goes in. G98 then sets the shape of the back work "
            "itself: the erectors get trained, they just never get loaded heavily. A 45° extension on Day 2 "
            "and a reverse hyper on Day 5 are the main stimulus, and every row climbs the rep range instead of "
            "the weight. A row does not have to be chest-supported to be safe — the cap is on load, not on the "
            "pad — so a light single-arm dumbbell row is in.",
    # G98: the rows and the erector work carry a rep floor so they cannot drift into heavy territory.
    guard=["Barbell Hip Thrust", "Plate-Loaded Leg Press", "Chest-Supported Machine Row",
           "Seated Cable Row", "Single-Arm Dumbbell Row", "Reverse Hyperextension"],
    flag=None,
)

# Upper back and shoulders, and nothing else prioritised. Front delts sit a tier below side and rear because
# they take a share of every press already.
PRI = {"Back": 1, "Side delts": 1, "Rear delts": 1, "Front delts": 2,
       "Chest": 3, "Biceps": 3, "Triceps": 3, "Forearms": 3, "Core": 3,
       "Quads": 3, "Hamstrings": 3, "Glutes": 3, "Calves": 3, "Lower back": 3}

# The program as it would read for the same person with a healthy back. The substitutions below are what the
# back pain changes, so the page can show the swap rather than just the result.
DAYS = [
    ["Day 1 · back, vertical pull", [
        ["Weighted / Assisted Pull-Up", 4, "6–8"],
        ["Chest-Supported Machine Row", 4, "10–12"],
        ["Straight-Arm Pulldown", 3, "15"],
        ["Reverse Pec Deck", 3, "15"],
        ["Dumbbell Lateral Raise", 4, "15"],
        ["Dumbbell Curl", 3, "10"],
    ]],
    ["Day 2 · lower", [
        ["Smith Machine Squat", 4, "10"],
        ["Barbell RDL", 3, "10"],
        ["Seated Leg Curl", 3, "12"],
        ["Leg Extension", 3, "15"],
        ["Standing Calf Raise Machine", 3, "15"],
        ["Cable Rotation", 3, "15/s"],
    ]],
    ["Day 3 · shoulders and chest", [
        ["Seated Shoulder Press Machine", 4, "10"],
        ["Chest Press Machine", 3, "12"],
        ["Cybex Lateral Raise Machine", 4, "15"],
        ["Cable Fly — Mid", 3, "15"],
        ["Freemotion Y Raise", 3, "15"],
        ["Rope Pushdown", 3, "15"],
    ]],
    ["Day 4 · back, horizontal pull", [
        ["Seated Cable Row", 4, "10–12"],
        ["Lat Pulldown", 4, "10"],
        ["Reverse Pec Deck", 3, "15"],
        ["Dumbbell Lateral Raise", 3, "15"],
        ["Single-Arm Dumbbell Row", 3, "12–15"],
        ["Plank Alternating Limb Touch", 3, "12"],
    ]],
    ["Day 5 · hips, arms and lower back", [
        ["Barbell Hip Thrust", 4, "10"],
        ["Cable Pull-Through", 3, "15"],
        ["Seated Leg Curl", 3, "15"],
        ["Seated Calf Raise Machine", 3, "15"],
        ["Overhead Cable Triceps Ext.", 3, "12"],
        ["Incline Dumbbell Curl", 3, "12"],
    ]],
]

SUBS = {
    "Smith Machine Squat": ("Plate-Loaded Leg Press", "12"),
    "Barbell RDL": ("45° Back Extension", "12"),
    "Cable Rotation": ("Dead Bug", "10"),
    "Cable Pull-Through": ("Reverse Hyperextension", "15"),
}
REASON = {
    "Smith Machine Squat": "the bar comes off the spine — a leg press loads the quads without stacking "
                           "load down through the lumbar",
    "Barbell RDL": "the loaded hinge is the movement that reliably sets it off; a bodyweight extension "
                   "trains the same muscles under control, and load waits for the next block",
    "Cable Rotation": "loaded rotation out, anti-extension in — a dead bug trains the trunk to resist "
                      "movement rather than produce it",
    "Cable Pull-Through": "G98: a reverse hyper is one of the two movements that should carry the erector "
                          "work, and it extends the hips without a long-lever loaded hinge",
}


def build():
    p = PERSON
    notes, changes, days = [], [], []
    for dn, rows in DAYS:
        out, seen = [], set()
        for name, sets, reps in rows:
            if name in SUBS:
                new, nreps = SUBS[name]
                if not any(c[0] == name for c in changes):
                    changes.append((name, new, REASON.get(name)))
                if new is None:
                    continue
                name, reps = new, (nreps or reps)
            if name in seen:
                continue
            seen.add(name)
            out.append([name, sets, reps])
        days.append([dn, out])

    notes.append(("G90", "physician and physiotherapist clearance is on record, which is the only reason this "
                  "intake is taken on at all — without it the answer is a referral, not a program"))
    notes.append(("G98", "the erectors get trained but never heavily — a 45° extension and a reverse hyper are "
                  "the main stimulus, every row carries a ten-rep floor so it cannot drift into heavy "
                  "territory, and a light row does not have to be chest-supported"))
    notes.append(("back", "the rest of the filter is still my proposal rather than something you have ruled "
                  "on: the loaded hinge, the bar on the back, loaded spinal flexion and loaded rotation all "
                  "come out"))

    # Upper back and shoulders lead, and rear delts stop being tail-sorted because here they are the point.
    build4.PRI_OVERRIDE = PRI
    build4.TAIL_MUSCLES = set()
    notes.append(("G95", "suspended for this client — rear delts are a priority here, so the reverse pec deck "
                  "is ordered on its merits instead of being pushed to the end of the day"))

    reordered = []
    for k, (dn, row) in enumerate(days):
        new = order_day(p["sex"], row)
        if [r[0] for r in new] != [r[0] for r in row]:
            reordered.append(short(dn))
        days[k] = [dn, new]
    if reordered:
        notes.append(("G60", "exercise order changed on " + ", ".join(reordered)
                      + " — the biggest compound first unless a top-priority free weight leads, then each "
                        "muscle's work kept together (G66, G67, G79)"))

    leg_compounds(days, notes)
    cap_families(days, notes)
    size_to_gaps(p["days"], days, notes)
    picks = opening_efforts(p, days)
    total = sum(len(row) for _, row in days)
    if picks:
        notes.append(("G78", f"{plural(len(picks), 'lift')} of {total} open at RPE 7.5 — the first of each day, "
                      f"under a third of the program"))
    notes.append(("C7a", f"{p['days']} days a week — week {p['weeks']} is the deload, not an extra week after "
                  f"the block"))

    plan, weekly = [], {}
    guards = set(p["guard"])
    for k, (dn, row) in enumerate(days):
        exs = []
        for slot, (name, sets, reps) in enumerate(row):
            lo, hi, per = parse_reps(reps)
            guard = name in guards
            if guard:
                lo, hi = max(lo, 10), max(hi, max(lo, 10) + 2)
            ex = dict(seed=f"back-{k}-{name}", name=name, sex=p["sex"], sets=sets, lo=lo, hi=hi, per=per,
                      weeks=p["weeks"], days=p["days"], beginner=False, guard=guard, swap_to=None,
                      rpe=7.5 if (k, slot) in picks else 7)
            exs.append((ex, simulate(ex)))
            weekly[muscle(name)] = weekly.get(muscle(name), 0) + sets
        plan.append((WEEKDAY[p["days"]][k], dn, exs))

    fired, held, viol, near, far = {}, 0, [], 0, 0
    for _, _, exs in plan:
        for _, sim in exs:
            viol += sim["violations"]
            if sim["aimed"] is not None:
                gap = sim["aimed"] - sim["landed"]
                far += 1 if gap > 1 else 0
                near += 1 if 0.5 < gap <= 1 else 0
            for r in sim["rows"]:
                held += 1 if r["code"] == "hold" else 0
                for tag in set(re.findall(r"\bG\d+\b", r["why"])):
                    fired[tag] = fired.get(tag, 0) + 1
    checks = dict(held=held, viol=viol, near=near, far=far,
                  moves=sum(len(s["rows"]) for _, _, exs in plan for _, s in exs))
    return plan, changes, notes, weekly, fired, checks


ORDER = ["Back", "Rear delts", "Side delts", "Front delts", "Chest", "Biceps", "Triceps", "Forearms",
         "Lower back", "Glutes", "Quads", "Hamstrings", "Calves", "Core"]


def render():
    p = PERSON
    plan, changes, notes, weekly, fired, checks = build()
    T = targets(p["weeks"], p["days"])
    P = []
    A = P.append
    A("<title>The Back-Safe Five</title>")
    A('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap">')
    A(f"<style>{CSS}</style>")
    A('<div class="wrap">')
    A('<header><div class="k">Jacked · engine v4 · upper back and shoulders</div>'
      '<h1>Five days a week, built around a bad lower back</h1>'
      '<p class="lede">Upper back and shoulders prioritised and nothing else, for someone whose lower back '
      'hurts after a loaded hinge. Every week after the first is a decision you would approve: the move, the '
      'rep scheme it produces, why, and what he logged. The back-safety rules are a proposal — you have not '
      'ruled on any of them, and they are listed separately at the bottom.</p></header>')
    A(f'<section class="sec">{HOWTO}</section>')

    A(f'<section class="sec"><div class="person"><div class="p-hd">'
      f'<span class="p-freq">5×</span><span class="p-name">{E(p["name"])}</span>'
      f'<span class="p-meta">{p["sex"]} · {p["age"]} · {p["level"]} · {p["weeks"]}-week block · '
      f'{E(p["title"])}</span></div><div class="p-body">')
    A('<div class="intake">'
      f'<div><b>Training age</b>{E(p["training_age"])}</div>'
      f'<div><b>Consistency</b>{E(p["consistency"])}</div>'
      f'<div><b>A typical session</b>{E(p["typical"])}</div></div>')
    A(f'<div class="flag"><b>Noted on intake.</b> {E(p["note"])} <b>Cleared?</b> {E(p["cleared_note"])}</div>')
    A(f'<div class="chg"><b>What that changed.</b> {E(p["changed"])}')
    for old, new, why in changes:
        A(f'<span class="swap"><s>{E(old)}</s> → <em>{E(new) if new else "removed"}</em>'
          f'{" — " + E(why) if why else ""}</span>')
    A('</div>')
    A('<div class="applied"><div class="h">Rules that shaped the program</div>')
    for rule, text in notes:
        A(f'<div><span class="rule">{rule}</span>{E(text)}</div>')
    if fired:
        A('<div><span class="rule">weekly</span>decisions citing '
          + ", ".join(f"{k} ×{v}" for k, v in sorted(fired.items(), key=lambda kv: (-kv[1], kv[0]))) + '</div>')
    bad = "" if not checks["viol"] else " bad"
    A(f'<div class="checks"><span>{checks["moves"]} weekly decisions</span>'
      f'<span class="{"bad" if checks["held"] else ""}">{checks["held"]} weeks held after a logged 5</span>'
      f'<span class="{bad}">{len(checks["viol"])} moves that cost more work than they added</span>'
      f'<span>{checks["near"]} lifts finishing one under their aim</span>'
      f'<span class="{"bad" if checks["far"] else ""}">{checks["far"]} finishing two or more under</span></div>')
    A('<div class="vol">' + "".join(f'<span>{m} <b>{weekly[m]}</b></span>' for m in ORDER if m in weekly)
      + '<span style="background:none;color:var(--n600)">sets a week, before the deload</span></div></div>')

    head = "".join(f'<th>Week {w} <i>aim {aim_label(T[w - 1])}</i></th>' for w in range(2, p["weeks"] + 1))
    for weekday, dn, exs in plan:
        A(f'<div class="day"><em>{weekday}</em> · {E(dn)}</div><div class="scroller"><table><thead><tr>'
          f'<th>Exercise</th><th>Week 1 <i>aim {aim_label(T[0])}</i></th>{head}'
          f'<th>Carries forward</th></tr></thead><tbody>')
        for ex, sim in exs:
            rep_first = track(ex["name"]) == "rep"
            rng = f'{ex["lo"]}–{ex["hi"]}' if (rep_first or ex["guard"]) else f'{ex["hi"]}'
            tags = [f'<span class="tag">{rng}{" ea." if ex["per"] else ""}</span>',
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
            A(f'<tr><td class="ex">{E(ex["name"])}<div class="tags">{"".join(tags)}</div></td>{cells}'
              f'<td class="carry"><span class="presc">{E(sim["carry"])}</span>{gain_txt(sim)}</td></tr>')
        A('</tbody></table></div>')
    A('</div></div></section>')

    A('<section class="sec"><div class="eyebrow">Still my call</div>'
      '<h2>Six decisions you have not ruled on</h2><ol class="ask">'
      '<li><b>What "back-safe" means beyond G98.</b> You have now ruled on the erector work and the rows. The '
      'rest is still mine: out go the loaded hinge, the bar on the back, loaded spinal flexion (v-ups, '
      'crunches) and loaded rotation; in come a leg press instead of a squat, and anti-extension core. '
      'Everything else in the library stayed.</li>'
      '<li><b>The 45° extension is bodyweight for the whole block.</b> He is meant to be strengthening the '
      'back, so the case for loading it is real — but block one on a two-year-old pain seemed like the wrong '
      'place to add a plate. Reps and tempo only, load next block. Say the word and it holds a dumbbell.</li>'
      '<li><b>G95 suspended.</b> You said rear delts go after the arms because curls matter more cosmetically. '
      'Here the rear delts are the priority, so I stopped tail-sorting them. That may be wrong — the cosmetic '
      'argument might hold regardless of what the client asked for.</li>'
      '<li><b>Front delts are a tier below side and rear.</b> You said "shoulders", and I read that as side and '
      'rear leading, with front delts getting their share from pressing anyway.</li>'
      '<li><b>Hamstrings are light on purpose — six sets.</b> The RDL is the best hamstring builder he has and '
      'it is the exact thing that hurts. Leg curls carry it instead. If six is too few, the fix is a third leg '
      'curl slot, not putting the hinge back.</li>'
      '<li><b>The hip thrust and the leg press are both guarded at ten-plus reps.</b> G84 says push a hip '
      'thrust hard, but heavy low-rep hip thrusting and a deep heavy leg press are two places a lumbar spine '
      'gets loaded by accident. Guarding costs him some progress on the one lift you said to be aggressive '
      'with.</li>'
      '</ol></section>')

    A('<div class="note"><b>How to give feedback.</b> The logs are simulated so every decision has something '
      'to act on — ignore whether a number is realistic. Judge the move on each cell given what was logged the '
      'week before and which week of the block it is. Where you would have done something else, say the '
      'exercise, the week, and what you would have done.</div>')
    A('</div>')
    out = HERE / "back-safe-five.html"
    out.write_text("\n".join(P), encoding="utf-8")
    print(f"{out}  {out.stat().st_size / 1024:.0f} KB")
    print(f"moves={checks['moves']} held={checks['held']} stress_violations={len(checks['viol'])} "
          f"one_under={checks['near']} two_or_more_under={checks['far']}")
    for v in checks["viol"]:
        print("  !", v)
    for weekday, dn, exs in plan:
        print(f"  {weekday:4} {dn[:38]:38} {len(exs)}: " + ", ".join(e[0]["name"] for e in exs))
    print("  volume:", {m: weekly[m] for m in ORDER if m in weekly})


if __name__ == "__main__":
    render()
