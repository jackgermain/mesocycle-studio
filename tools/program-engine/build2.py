"""Build the four-program page with engine v2.

Assembly runs in the order the rules depend on each other:
  1. substitutions from intake
  2. G69 beginner sets, then the leg-compound ceiling  (volume first, so G72 sees the real day)
  3. G72 heavy leg days spread across the week, or trimmed where they cannot be spread
  4. G60/G66/G67 exercise order within each day
  5. G68 opening effort per exercise, G70 guards, then the week-by-week simulation
"""
import itertools
import json
import html
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from people4 import PEOPLE, REASON
from meta import muscle, cost, region, rank, top_tier, LOWER, LEG_COMPOUNDS
from progress2 import simulate, parse_reps, targets, aim_label, fmt_w, track

HERE = pathlib.Path(__file__).parent
BASE = json.load(open(HERE / "templates.json"))
E = html.escape

# 3x a week is assumed Mon/Wed/Fri. 4-6x are assumed consecutive from Monday -- Jack's own example read
# Day 2 and Day 4 as one day apart, which only holds if the days run back to back.
WEEKDAY = {3: ["Mon", "Wed", "Fri"], 4: ["Mon", "Tue", "Wed", "Thu"],
           5: ["Mon", "Tue", "Wed", "Thu", "Fri"], 6: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]}
POS = {3: [0, 2, 4], 4: [0, 1, 2, 3], 5: [0, 1, 2, 3, 4], 6: [0, 1, 2, 3, 4, 5]}


def short(dayname):
    return dayname.split(" · ")[0]


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


def cap_leg_compounds(days, notes):
    """G69: a third compound leg movement goes; two share a six-set ceiling, trimmed from the larger."""
    for dayname, row in days:
        comp = [r for r in row if r[0] in LEG_COMPOUNDS]
        for r in comp[2:]:
            row.remove(r)
            notes.append(("G69", f"{short(dayname)}: {r[0]} removed — a third compound leg movement in one session"))
        comp = comp[:2]
        if len(comp) == 2:
            before = f"{comp[0][1]} + {comp[1][1]}"
            while comp[0][1] + comp[1][1] > 6:
                big = max(comp, key=lambda r: r[1])
                if big[1] <= 2:
                    break
                big[1] -= 1
            after = f"{comp[0][1]} + {comp[1][1]}"
            if after != before:
                notes.append(("G69", f"{short(dayname)}: {comp[0][0]} + {comp[1][0]} trimmed from {before} to {after} sets"))


def heavy_lower(row):
    compounds = sum(1 for r in row if r[0] in LEG_COMPOUNDS)
    lower_sets = sum(r[1] for r in row if muscle(r[0]) in LOWER)
    return compounds >= 2 or lower_sets >= 12


def gap(a, b):
    d = abs(b - a)
    return min(d, 7 - d)


def spread_legs(p, days, notes):
    """G72, in Jack's order: move the days apart; failing that, a set off each lower exercise on the second
    session and the leg extensions out of it."""
    n = len(days)
    pos = POS[n]
    heavy = [heavy_lower(row) for _, row in days]

    def ok(order):
        hs = [pos[k] for k, i in enumerate(order) if heavy[i]]
        return all(gap(a, b) >= 3 for a, b in itertools.combinations(hs, 2))

    if ok(tuple(range(n))):
        return days
    fits = [o for o in itertools.permutations(range(n)) if ok(o)]
    if fits:
        best = min(fits, key=lambda o: (sum(abs(k - i) for k, i in enumerate(o)), o))
        moved = []
        for k, i in enumerate(best):
            dayname, row = days[i]
            rest = dayname.split(" · ", 1)[1] if " · " in dayname else dayname
            moved.append([f"Day {k + 1} · {rest}" + (f" (was Day {i + 1})" if i != k else ""), row])
        notes.append(("G72", "heavy leg days had one day between them — the week is reordered so they fall on "
                      + " and ".join(WEEKDAY[n][k] for k, i in enumerate(best) if heavy[i])))
        return moved
    hs = [k for k in range(n) if heavy[k]]
    trimmed = []
    lower_sets = lambda k: sum(r[1] for r in days[k][1] if muscle(r[0]) in LOWER)
    for a, b in itertools.combinations(hs, 2):
        if gap(pos[a], pos[b]) >= 3 or a in trimmed or b in trimmed:
            continue
        # The heavier of the two gives up the volume. Always trimming the second one took a woman's only quad
        # day down to four quad sets a week while both of her glute days kept all of theirs.
        k = max((b, a), key=lower_sets)
        trimmed.append(k)
        dayname, row = days[k]
        dropped = [r for r in row if r[0] == "Leg Extension"]
        for r in dropped:
            row.remove(r)
        cut = [r for r in row if muscle(r[0]) in LOWER and r[1] > 2]
        for r in cut:
            r[1] -= 1
        notes.append(("G72", f"{short(dayname)} is too close to another heavy leg day and the week cannot spread "
                      f"them — one set off {len(cut)} lower-body exercises" + (", leg extensions removed" if dropped else "")))
    return days


def order_day(sex, row):
    """G60/G67: the most expensive top-priority compound leads, else the most expensive compound; the other
    compounds follow by cost. G66: accessories then finish muscles already opened, in the order they were
    opened, before starting new ones; core closes."""
    idx = list(range(len(row)))
    nm = lambda i: row[i][0]
    comps = [i for i in idx if cost(nm(i)) <= 1]
    tops = [i for i in comps if top_tier(sex, nm(i))]
    lead = min(tops or comps or idx, key=lambda i: (cost(nm(i)), i))
    seq, opened = [lead], [muscle(nm(lead))]
    rest = [i for i in comps if i != lead]
    while rest:
        i = min(rest, key=lambda i: (cost(nm(i)), 0 if muscle(nm(i)) in opened else 1, rank(sex, nm(i)), i))
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


def build(p):
    title, days, changes = substitute(p)
    notes = []
    beginner = p["level"] == "beginner"
    if beginner:
        for _, row in days:
            for r in row:
                r[1] = 2
        notes.append(("G69", "beginner — two sets on every exercise for the whole block"))
    cap_leg_compounds(days, notes)
    days = spread_legs(p, days, notes)
    reordered = []
    for k, (dn, row) in enumerate(days):
        new = order_day(p["sex"], row)
        if [r[0] for r in new] != [r[0] for r in row]:
            reordered.append(short(dn))
        days[k] = [dn, new]
    if reordered:
        notes.append(("G67", "exercise order changed on " + ", ".join(reordered)
                      + " — the most expensive compound first, then each muscle's work kept together (G60, G66)"))
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
            if beginner or slow or guard:
                rpe = 7
            else:
                rpe = 7.5 if (slot < 2 or top_tier(p["sex"], name)) else 7
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
td.wk{min-width:188px}
.mv{display:block;font-size:11.5px;font-weight:700}
.presc{display:block;font-family:var(--mono);font-size:11.5px;color:var(--n200);margin-top:2px;font-variant-numeric:tabular-nums}
.why{display:block;font-size:10.5px;color:var(--n600);line-height:1.35;margin-top:3px}
.lg{display:block;font-family:var(--mono);font-size:10px;color:var(--n500);margin-top:5px;padding-top:4px;border-top:1px dashed var(--divider)}
td.carry{min-width:170px;background:rgba(196,168,255,.04)}
td.carry .presc{color:var(--violet)}
.aim{display:block;font-family:var(--mono);font-size:10px;margin-top:4px}
.aim.hit{color:var(--acc)} .aim.short{color:var(--warn)}
.m-load .mv{color:var(--acc)} .m-level .mv{color:var(--acc3)} .m-hold .mv{color:var(--warn)}
.m-rep .mv{color:var(--blue)} .m-jump .mv{color:var(--caution)} .m-reset .mv{color:var(--danger)}
.m-deload .mv{color:var(--n400)} .m-swap .mv{color:var(--danger)} .m-w1 .mv{color:var(--n500)}
.note{border-left:3px solid var(--warn);background:rgba(255,184,77,.07);padding:13px 17px;border-radius:0 8px 8px 0;margin:36px 0 0;max-width:78ch;font-size:14px}
.note b{color:var(--warn)}
@media (prefers-reduced-motion:reduce){*{scroll-behavior:auto}}
"""

CLS = {"load": "load", "combo": "load", "level": "level", "rep": "rep", "hold": "hold", "db": "jump",
       "pin": "jump", "reset": "reset", "deload": "deload", "swap": "swap"}


def render():
    P = []
    A = P.append
    A("<title>Four Programs, 3× to 6×</title>")
    A('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap">')
    A(f"<style>{CSS}</style>")
    A('<nav class="jump" aria-label="Jump to"><div class="inner"><a href="#new">What changed</a><a href="#ask">Questions</a>'
      + "".join(f'<a href="#p{p["n"]}">{p["days"]}× · {E(p["name"])}</a>' for p in PEOPLE)
      + '</div></nav><div class="wrap">')
    A('<header><div class="k">Jacked · engine v2 · four programs</div>'
      '<h1>Three, four, five and six days a week — built on your feedback</h1>'
      '<p class="lede">Every week after the first is a decision you would approve. Each cell shows the move, the '
      'rep scheme it produces, why, and what they logged — including how hard the last set was. The last '
      'column is what the app would remember for their next block.</p></header>')

    A('<section class="sec" id="new"><div class="eyebrow">What changed from the twenty</div>'
      '<h2>Your critique, now in the engine</h2><ul class="new">'
      '<li><b><span class="rule">G64</span>Effort is aimed</b>Each week has a how-hard target, peaking at 4–5. The move is picked from the gap between last week and this week\'s target.</li>'
      '<li><b><span class="rule">G63</span>More than one thing can move</b>A small weight jump and a rep together, where the smallest plate is small enough.</li>'
      '<li><b><span class="rule">G71</span>Flat effort after a jump means keep going</b>Same move again, until the rating actually rises.</li>'
      '<li><b><span class="rule">C7a</span>Deload is the last week</b>Five or six days a week: week 4 or week 6 is the deload. Three or four days: no deload.</li>'
      '<li><b><span class="rule">G67</span>Order</b>The biggest compound leads, then each muscle\'s work stays together, core last.</li>'
      '<li><b><span class="rule">G69</span>Leg compounds share six sets</b>Beginners get two sets on everything.</li>'
      '<li><b><span class="rule">G72</span>Heavy leg days spaced</b>Moved apart in the week, or trimmed where they cannot be.</li>'
      '<li><b><span class="rule">G73</span>Jumps are percentages</b>12.5s between the 10s and 15s, and only after beating the top of the range.</li>'
      '<li><b><span class="rule">G65</span>Block memory</b>The last column is where they finished, which is where the next block starts from. On Smith and barbell lifts the planned finish caps the weight.</li>'
      '</ul>')
    A('<div class="legend">'
      '<span class="m-load"><b class="mv" style="display:inline">+weight</b> add weight</span>'
      '<span class="m-level"><b class="mv" style="display:inline">level up</b> lagging sets catch the top weight</span>'
      '<span class="m-rep"><b class="mv" style="display:inline">+rep</b> climb the range</span>'
      '<span class="m-jump"><b class="mv" style="display:inline">next weight</b> beat the range, or too light</span>'
      '<span class="m-hold"><b class="mv" style="display:inline">hold</b> effort is spent</span>'
      '<span class="m-swap"><b class="mv" style="display:inline">swap</b> joint flagged</span>'
      '<span class="m-deload"><b class="mv" style="display:inline">deload</b> last week, 5–6 days</span>'
      '</div></section>')

    A('<section class="sec" id="ask"><div class="eyebrow">Assumptions to confirm</div>'
      '<h2>Places I had to guess</h2><ol class="ask">'
      '<li><b>Hip thrusts and pull-throughs don\'t count toward the six-set leg ceiling.</b> Your example was squat + leg press. I counted RDLs and split squats/lunges, not thrusts.</li>'
      '<li><b>Three compound leg movements in one day: the third one comes out</b>, then the other two share six sets.</li>'
      '<li><b>4–6 day programs run on back-to-back days.</b> That\'s how Day 2 and Day 4 had one day between them in your example. So heavy leg days need two rest days between. 3-day programs are Mon/Wed/Fri.</li>'
      '<li><b>Starting at 7.5:</b> the first two exercises of the day, or a top-priority muscle. I haven\'t used your "higher rep count" part yet. What rep count counts as higher?</li>'
      '<li><b>A chest-priority man presses before he squats</b> when both are on the same day. A woman squats or hinges first.</li>'
      '<li><b>Light machines and cables take the small step.</b> When the normal jump is more than an eighth of the weight, it uses the small one. Same idea as your 12.5s.</li>'
      '<li><b>The planned finish caps the weight</b> on Smith and barbell lifts: +10 lb over week one in a 4-week block, +15 lb in a 6-week block. Once the top set gets there, reps carry the rest of the block.</li>'
      '<li><b>A full jump on every set only follows a 1 or 2.</b> A 3 that is aiming for 4–5 gets a jump on the top sets only.</li>'
      '<li><b>When heavy leg days can\'t be spread out</b> (Alina, 5 days), the day with more leg volume loses a set per exercise, not just the later day.</li>'
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
        A('<div class="applied"><div class="h">Rules that changed the program</div>')
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
                # A load-first lift is prescribed at its written number and can earn two reps over it before the
                # weight moves, so its tag is that number -- a range would look broken by the reps it allows.
                rng_txt = f'{ex["lo"]}–{ex["hi"]}' if (track(ex["name"]) == "rep" or ex["guard"]) else f'{ex["hi"]}'
                tags = [f'<span class="tag">{rng_txt}{" ea." if ex["per"] else ""}</span>',
                        f'<span class="tag">{"rep-first" if track(ex["name"]) == "rep" else "load-first"}</span>']
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
                aim = ""
                if sim["aim"]:
                    a = sim["aim"]
                    diff = a["reached"] - a["goal"]
                    aim = (f'<span class="aim {"hit" if diff == 0 else "short"}">planned finish {fmt_w(a["goal"])} lb · '
                           + ("reached" if diff == 0 else f'ended {fmt_w(abs(diff))} lb {"over" if diff > 0 else "short"}')
                           + '</span>')
                A(f'<tr><td class="ex">{E(ex["name"])}<div class="tags">{"".join(tags)}</div></td>{cells}'
                  f'<td class="carry"><span class="presc">{E(sim["carry"])}</span>{aim}</td></tr>')
            A('</tbody></table></div>')
        A('</div></div></section>')

    A('<div class="note"><b>How to give feedback.</b> The logs are simulated so every decision has something '
      'to act on — ignore whether a number is realistic. Judge the move on each cell given what was logged '
      'the week before. Where you would have done something else, say the person, the exercise, the week, and '
      'what you would have done.</div>')
    A('</div>')
    out = HERE / "four-programs.html"
    out.write_text("\n".join(P), encoding="utf-8")
    print(f"{out}  {out.stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    render()
