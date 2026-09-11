"""Build the four-program page with engine v3: Jack's answers to the nine prototype guesses, applied.

Assembly runs in the order the rules depend on each other:
  1. substitutions from intake
  2. G69 beginners get two sets on everything
  3. G60/G66/G67/G79 exercise order within each day
  4. G69 the first two compound leg movements share six sets; G76 a third is kept, at bodybuilding reps
  5. G75 hip-thrust work and pull-through work each capped at six sets a session
  6. G77/G82 each session's volume sized to the gap before that muscle is trained again
  7. G78 opening effort, G70 guards, then the week-by-week simulation (progress3.py)

Gone from v2, because Jack's answers overturned them: dropping a third leg compound; assuming four-to-six-day
programs run on back-to-back days; reordering or trimming the week to spread heavy leg days (G72's old
reading); and opening at 7.5 by slot or muscle priority alone.
"""
import json
import html
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from people4 import PEOPLE, REASON
from meta import muscle, cost, region, rank, top_tier, LOWER, LEG_COMPOUNDS
from progress3 import simulate, parse_reps, targets, aim_label, fmt_w, track, KIND

HERE = pathlib.Path(__file__).parent
BASE = json.load(open(HERE / "templates.json"))
E = html.escape

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


def short(dayname):
    return dayname.split(" · ")[0]


def plural(n, word):
    return f"{n} {word}{'' if n == 1 else 's'}"


def substitute(p):
    title, days = BASE[p["sex"]][str(p["days"])]
    changes, out = [], []
    for dayname, exs in days:
        row, seen = [], set()
        for name, sets, reps in exs:
            if name in p["subs"]:
                new = p["subs"][name]
                new, reps = new if isinstance(new, tuple) else (new, reps)
                if (name, new) not in [(c[0], c[1]) for c in changes]:
                    changes.append((name, new, REASON.get((p["n"], name))))
                if new is None:
                    continue
                name = new
            if name in seen:
                continue
            seen.add(name)
            row.append([name, sets, reps])
        out.append([dayname, row])
    return title, out, changes


def free_weight(name):
    """Dumbbells, and barbells not in a Smith machine."""
    return KIND.get(name) == "db" or (KIND.get(name) == "bar" and "Smith" not in name)


def order_day(sex, row):
    """G60/G67: the most expensive compound leads. G79: a top-priority lift takes the lead instead only when
    it is a free weight -- G60's incline dumbbell press can lead a chest priority, but a squat still goes before
    a machine press. The other compounds follow by cost. G66: accessories then finish muscles already opened,
    in the order they were opened, before starting new ones; core closes."""
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
    advanced lifter, none for a beginner -- and never more than a third of the program's lifts. Guarded and
    slow-track lifts always open at 7."""
    if p["level"] == "beginner":
        return set()
    per_day = 2 if p["level"] == "advanced" else 1
    budget = sum(len(row) for _, row in days) // 3
    picks = set()
    for slot in range(per_day):
        for k, (_, row) in enumerate(days):
            if slot < len(row) and len(picks) < budget:
                name = row[slot][0]
                if name not in p["guard"] and name != p["slow"]:
                    picks.add((k, slot))
    return picks


def build(p):
    title, days, changes = substitute(p)
    notes = []
    beginner = p["level"] == "beginner"
    if beginner:
        for _, row in days:
            for r in row:
                r[1] = 2
        notes.append(("G69", "beginner — two sets on every exercise for the whole block"))
    reordered = []
    for k, (dn, row) in enumerate(days):
        new = order_day(p["sex"], row)
        if [r[0] for r in new] != [r[0] for r in row]:
            reordered.append(short(dn))
        days[k] = [dn, new]
    if reordered:
        notes.append(("G79", "exercise order changed on " + ", ".join(reordered)
                      + " — the biggest compound first unless a top-priority free weight leads, then each "
                        "muscle's work kept together (G60, G66, G67)"))
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
    for k, (dn, row) in enumerate(days):
        exs = []
        for slot, (name, sets, reps) in enumerate(row):
            lo, hi, per = parse_reps(reps)
            guard = name in p["guard"]
            if guard:
                lo, hi = max(lo, 10), max(hi, max(lo, 10) + 2)
            slow = name == p["slow"]
            swap_to = p["flag"][1] if p["flag"] and p["flag"][0] == name else None
            rpe = 7.5 if (k, slot) in picks else 7
            ex = dict(seed=f"{p['n']}-{k}-{name}", name=name, sex=p["sex"], sets=sets, lo=lo, hi=hi, per=per,
                      weeks=p["weeks"], days=p["days"], beginner=beginner, slow=slow, guard=guard,
                      swap_to=swap_to, rpe=rpe)
            exs.append((ex, simulate(ex)))
            weekly[muscle(name)] = weekly.get(muscle(name), 0) + sets
        plan.append((WEEKDAY[p["days"]][k], dn, exs))

    fired = {}
    for _, _, exs in plan:
        for _, sim in exs:
            for r in sim["rows"]:
                for tag in set(re.findall(r"\bG\d+\b", r["why"])):
                    fired[tag] = fired.get(tag, 0) + 1
    return title, plan, changes, notes, weekly, fired


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
.flag{background:rgba(255,107,107,.07);border-left:3px solid var(--danger);padding:11px 14px;margin:14px 0 6px;border-radius:0 6px 6px 0;font-size:13.5px}
.flag b{color:var(--danger)}
.chg{background:rgba(76,224,143,.05);border-left:3px solid var(--acc);padding:11px 14px;margin:8px 0 4px;border-radius:0 6px 6px 0;font-size:13.5px;color:var(--n400)}
.chg b{color:var(--acc3)}
.swap{font-family:var(--mono);font-size:11.5px;color:var(--n400);display:block;margin-top:4px}
.swap s{color:var(--n700)} .swap em{font-style:normal;color:var(--acc3)}
.applied{margin:8px 0 4px;padding:11px 14px;border:1px solid var(--divider);border-radius:6px;font-size:13px;color:var(--n400)}
.applied div{margin:3px 0}
.applied .h{font-family:var(--mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--n600);margin-bottom:6px}
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
.tag.slow{color:var(--warn);border-color:#5c4524}
.tag.guard{color:var(--danger);border-color:#5c2a2a}
.tag.hard{color:var(--acc);border-color:rgba(76,224,143,.35)}
td.wk{min-width:188px}
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
.m-deload .mv{color:var(--n400)} .m-swap .mv{color:var(--danger)} .m-w1 .mv{color:var(--n500)}
.note{border-left:3px solid var(--warn);background:rgba(255,184,77,.07);padding:13px 17px;border-radius:0 8px 8px 0;margin:36px 0 0;max-width:78ch;font-size:14px}
.note b{color:var(--warn)}
@media (prefers-reduced-motion:reduce){*{scroll-behavior:auto}}
"""

CLS = {"load": "load", "combo": "load", "level": "level", "rep": "rep", "hold": "hold", "db": "jump",
       "pin": "jump", "reset": "reset", "deload": "deload", "swap": "swap"}


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
    A('<nav class="jump" aria-label="Jump to"><div class="inner"><a href="#new">Your answers</a><a href="#ask">Still my call</a>'
      + "".join(f'<a href="#p{p["n"]}">{p["days"]}× · {E(p["name"])}</a>' for p in PEOPLE)
      + '</div></nav><div class="wrap">')
    A('<header><div class="k">Jacked · engine v3 · four programs</div>'
      '<h1>Three, four, five and six days a week — rebuilt on your answers</h1>'
      '<p class="lede">The same four people, rebuilt with your nine answers. Every week after the first is a '
      'decision you would approve: the move, the rep scheme it produces, why, and what they logged — including '
      'how hard the last set was. The last column is where each lift finished and what it gained.</p></header>')

    A('<section class="sec" id="new"><div class="eyebrow">Your nine answers</div>'
      '<h2>What changed in the engine</h2><ul class="new">'
      '<li><b><span class="rule">G75</span>Pull-throughs and hip thrusts</b>Six sets each per session, on their own limit — not the squat and leg press limit.</li>'
      '<li><b><span class="rule">G76</span>A third leg compound stays</b>It moves to 8+ reps, or 10+ when the two before it were a lot of volume. The leg press is back on Dominic\'s and Kai\'s leg days.</li>'
      '<li><b><span class="rule">G77</span>The week is spread out</b>Four days is Mon/Tue/Thu/Fri, five is Mon/Tue/Wed/Fri/Sat — not back-to-back — and volume follows the gaps.</li>'
      '<li><b><span class="rule">G82</span>Short gaps cost a set</b>A session with a short gap before that muscle comes back loses a set; the one before the longest gap gets one back.</li>'
      '<li><b><span class="rule">G78</span>RPE 7.5 on a few lifts</b>The first lift of each day for intermediates, never more than a third of the program. Beginners stay at 7.</li>'
      '<li><b><span class="rule">G79</span>Squat before a machine press</b>A priority lift only leads if it is a free weight. Otherwise the biggest compound goes first.</li>'
      '<li><b><span class="rule">G80</span>A 20% jump needs 15+ reps</b>Light cables and dumbbells keep adding reps past 15 before the weight moves. No more quietly taking a smaller jump.</li>'
      '<li><b><span class="rule">G81</span>No weight cap</b>The planned finish is gone. The last column shows what each lift actually gained over the block.</li>'
      '<li><b><span class="rule">G64</span>Every move aims at the end</b>Each week still has a how-hard target that builds to the peak, so the same log means different moves in different weeks.</li>'
      '</ul>')
    A('<div class="legend">'
      '<span class="m-load"><b class="mv" style="display:inline">+weight</b> add weight</span>'
      '<span class="m-level"><b class="mv" style="display:inline">level up</b> lagging sets catch the top weight</span>'
      '<span class="m-rep"><b class="mv" style="display:inline">+rep</b> climb the range</span>'
      '<span class="m-jump"><b class="mv" style="display:inline">next weight</b> reps earned it, or too light</span>'
      '<span class="m-hold"><b class="mv" style="display:inline">hold</b> effort is spent</span>'
      '<span class="m-swap"><b class="mv" style="display:inline">swap</b> joint flagged</span>'
      '<span class="m-deload"><b class="mv" style="display:inline">deload</b> last week, 5–6 days</span>'
      '</div></section>')

    A('<section class="sec" id="ask"><div class="eyebrow">Still my call</div>'
      '<h2>Four calls I made to put your answers into practice</h2><ol class="ask">'
      '<li><b>How much a short gap costs.</b> Back-to-back days take a set off each exercise for that muscle. One rest day only does if that session has 8+ sets of it. The session before a gap of three or more rest days gets a set back.</li>'
      '<li><b>"On occasion" for RPE 7.5.</b> The first lift of each day for an intermediate, the first two for an advanced lifter, and never more than a third of the lifts.</li>'
      '<li><b>When a third leg compound goes to 10+ reps.</b> When the two before it add up to 60 reps or more — 3 × 10 plus 3 × 10. Otherwise 8+.</li>'
      '<li><b>Your 12.5s rule on cables and machines.</b> Once the reps are past 15, a jump that would still be 40% or more of the weight uses the small add-on plate instead — a 10 lb cable goes to 12.5, not 15. You said this about dumbbells; I carried it over.</li>'
      '</ol></section>')

    for p in PEOPLE:
        title, plan, changes, notes, weekly, fired = build(p)
        T = targets(p["weeks"], p["days"])
        A(f'<section class="sec" id="p{p["n"]}"><div class="person"><div class="p-hd">'
          f'<span class="p-freq">{p["days"]}×</span><span class="p-name">{E(p["name"])}</span>'
          f'<span class="p-meta">{p["sex"]} · {p["age"]} · {p["level"]} · {p["weeks"]}-week block · {E(title)}</span></div>'
          f'<div class="p-body">')
        A(f'<div class="flag"><b>Noted on intake.</b> {E(p["note"])}</div>')
        A(f'<div class="chg"><b>What that changed.</b> {E(p["changed"])}')
        for old, new, why in changes:
            A(f'<span class="swap"><s>{E(old)}</s> → <em>{E(new) if new else "removed"}</em>{" — " + E(why) if why else ""}</span>')
        A('</div>')
        A('<div class="applied"><div class="h">Rules that shaped the program</div>')
        for rule, text in notes:
            A(f'<div><span class="rule">{rule}</span>{E(text)}</div>')
        if fired:
            A('<div><span class="rule">weekly</span>decisions citing '
              + ", ".join(f"{k} ×{v}" for k, v in sorted(fired.items(), key=lambda kv: (-kv[1], kv[0]))) + '</div>')
        order = ["Chest", "Back", "Side delts", "Front delts", "Rear delts", "Biceps", "Triceps", "Forearms",
                 "Glutes", "Quads", "Hamstrings", "Calves", "Core"]
        A('<div class="vol">' + "".join(f'<span>{m} <b>{weekly[m]}</b></span>' for m in order if m in weekly)
          + '<span style="background:none;color:var(--n600)">sets a week, before any deload</span></div></div>')

        head = "".join(f'<th>Week {w} <i>aim {aim_label(T[w - 1])}</i></th>' for w in range(2, p["weeks"] + 1))
        for weekday, dn, exs in plan:
            A(f'<div class="day"><em>{weekday}</em> · {E(dn)}</div><div class="scroller"><table><thead><tr>'
              f'<th>Exercise</th><th>Week 1 <i>aim 3</i></th>{head}<th>Carries forward</th></tr></thead><tbody>')
            for ex, sim in exs:
                rng_txt = f'{ex["lo"]}–{ex["hi"]}' if (track(ex["name"]) == "rep" or ex["guard"]) else f'{ex["hi"]}'
                tags = [f'<span class="tag">{rng_txt}{" ea." if ex["per"] else ""}</span>',
                        f'<span class="tag">{"rep-first" if track(ex["name"]) == "rep" else "load-first"}</span>']
                if ex["rpe"] == 7.5:
                    tags.append('<span class="tag hard">opens 7.5</span>')
                if ex["slow"]:
                    tags.append('<span class="tag slow">slow track</span>')
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

    A('<div class="note"><b>How to give feedback.</b> The logs are simulated so every decision has something '
      'to act on — ignore whether a number is realistic. Judge the move on each cell given what was logged '
      'the week before and which week of the block it is. Where you would have done something else, say the '
      'person, the exercise, the week, and what you would have done.</div>')
    A('</div>')
    out = HERE / "four-programs.html"
    out.write_text("\n".join(P), encoding="utf-8")
    print(f"{out}  {out.stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    render()
