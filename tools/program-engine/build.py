import json, html, random, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from people import PEOPLE
from subs import SUBS, REASON
from progress import decide, track, tier, week_one, stagger_after

HERE = pathlib.Path(__file__).parent
BASE = json.load(open(HERE / "templates.json"))
E = html.escape
rng = random.Random(20260910)

def program_for(p):
    """Base template for their sex and day-count, with the constraint's swaps applied."""
    title, days = BASE[p["sex"]][str(p["days"])]
    swaps = SUBS.get(p["n"], {})
    out, changes = [], []
    for dayname, exs in days:
        row = []
        for name, sets, reps in exs:
            if name in swaps:
                new = swaps[name]
                if new is None:
                    changes.append((name, None, REASON.get((p["n"], name))))
                    continue
                if new != name:
                    changes.append((name, new, REASON.get((p["n"], name))))
                name = new
            # A deconditioned or returning client starts at the top of the range and caps sets at three.
            if p["n"] in (5, 15):
                sets = min(sets, 3)
            row.append((name, sets, reps))
        # A swap can leave the same movement twice in a day; the second one goes.
        seen, dedup = set(), []
        for r in row:
            if r[0] in seen: continue
            seen.add(r[0]); dedup.append(r)
        out.append((dayname, dedup))
    return title, out, changes

def simulate(p, name, sets, reps):
    """A plausible logged week for this exercise, so the decision has something to act on.

    Deliberately not all-on-target: the interesting rows are the ones where somebody rated it a 5, or
    found it easy, or missed the range. Seeded, so the same table comes back every time it is built and
    Jack's notes stay attached to the right rows.
    """
    weeks = p["weeks"]
    slow = (p["slow"] == name)
    rows, effort, staggered = [], 3, False
    for w in range(2, weeks + 1):
        # A realistic block sits mostly at 3, dips to 2 when a prescription was light, and touches 4 or 5
        # near the end. Drifting monotonically upward gave every exercise the same shape and buried the
        # interesting cases, which are the ones worth arguing about.
        effort = max(1, min(5, effort + rng.choice([-1, 0, 0, 0, 1, 1] if tier(name) == "H" else [-1, -1, 0, 0, 0, 1])))
        if slow: effort = min(effort, 4)
        hit = "under" if (effort == 5 and rng.random() < 0.4) else ("over" if effort <= 2 and rng.random() < 0.45 else "on")
        code, move, why = decide(name, w, weeks, effort, hit, slow, staggered)
        rows.append((w, effort, hit, code, move, why))
        staggered = stagger_after(code, staggered)
        # A hold or a reset takes the pressure off the following week; a full jump adds to it.
        if code in ("hold", "reset"): effort = max(2, effort - 2)
        elif code == "jump": effort = min(5, effort + 1)
    return rows

CSS = """
:root{--bg:#0b0c11;--surface:#131419;--acc:#4ce08f;--acc3:#a5f4c7;--warn:#ffb84d;--danger:#ff6b6b;--caution:#ffe066;
--n200:#e4e7f5;--n300:#cfd3e5;--n400:#b2b6ca;--n500:#9397ab;--n600:#75798c;--n700:#595d6c;--n800:#3f424d;--n900:#292b31;
--divider:rgba(233,233,237,.07);--font:"Inter",system-ui,sans-serif;--mono:"JetBrains Mono",ui-monospace,monospace}
*{box-sizing:border-box}
body{background:var(--bg);color:var(--n200);font-family:var(--font);font-size:15px;line-height:1.6;margin:0}
.wrap{max-width:1220px;margin:0 auto;padding:0 20px 100px}
.mono,.num{font-family:var(--mono);font-variant-numeric:tabular-nums}
header{padding:50px 0 28px;border-bottom:1px solid var(--divider);margin-bottom:10px}
.k{font-family:var(--mono);font-size:10.5px;letter-spacing:.17em;text-transform:uppercase;color:var(--acc);margin-bottom:14px}
h1{font-size:clamp(28px,4.6vw,46px);font-weight:800;letter-spacing:-.028em;line-height:1.03;margin:0 0 14px;text-wrap:balance}
.lede{color:var(--n500);max-width:64ch;margin:0;font-size:16px}
h2{font-size:clamp(20px,2.8vw,27px);font-weight:800;letter-spacing:-.02em;margin:0 0 12px}
h3{font-size:16px;margin:26px 0 8px}
p{max-width:70ch}
.sec{margin:54px 0 0;padding-top:26px;border-top:1px solid var(--divider)}
.sec-no{font-family:var(--mono);font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--n700);margin-bottom:9px}
blockquote{margin:18px 0;padding:14px 18px;border-left:3px solid var(--acc);background:var(--surface);max-width:72ch}
blockquote p{margin:0}
.note{border-left:3px solid var(--warn);background:rgba(255,184,77,.07);padding:13px 17px;border-radius:0 8px 8px 0;margin:20px 0;max-width:74ch}
.note b{color:var(--warn)}
nav.jump{position:sticky;top:0;background:rgba(11,12,17,.95);backdrop-filter:blur(8px);border-bottom:1px solid var(--divider);padding:9px 0;z-index:10}
nav.jump .inner{max-width:1220px;margin:0 auto;padding:0 20px;display:flex;gap:5px;overflow-x:auto}
nav.jump a{font-family:var(--mono);font-size:11px;color:var(--n500);text-decoration:none;padding:4px 8px;border:1px solid var(--divider);border-radius:3px;white-space:nowrap}
nav.jump a:hover{color:var(--n200)}
.person{border:1px solid var(--divider);border-radius:4px;margin:26px 0;background:var(--surface);overflow:hidden}
.p-hd{padding:15px 18px;border-bottom:1px solid var(--divider);display:flex;flex-wrap:wrap;gap:5px 14px;align-items:baseline}
.p-no{font-family:var(--mono);font-size:19px;color:var(--acc);font-weight:700}
.p-name{font-weight:800;font-size:17px;letter-spacing:-.01em}
.p-meta{font-family:var(--mono);font-size:11px;color:var(--n500);margin-left:auto}
.p-body{padding:4px 18px 16px}
.flag{background:rgba(255,107,107,.07);border-left:3px solid var(--danger);padding:11px 14px;margin:14px 0 6px;border-radius:0 6px 6px 0;font-size:13.5px}
.flag b{color:var(--danger)}
.chg{background:rgba(76,224,143,.05);border-left:3px solid var(--acc);padding:11px 14px;margin:8px 0 4px;border-radius:0 6px 6px 0;font-size:13.5px;color:var(--n400)}
.chg b{color:var(--acc3)}
.swap{font-family:var(--mono);font-size:11.5px;color:var(--n400);display:block;margin-top:4px}
.swap s{color:var(--n700)}
.swap em{font-style:normal;color:var(--acc3)}
.day{font-family:var(--mono);font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--n500);margin:20px 0 6px}
.scroller{overflow-x:auto;border:1px solid var(--divider);border-radius:3px}
table{border-collapse:collapse;width:100%;font-size:12.5px}
th,td{text-align:left;padding:7px 10px;border-bottom:1px solid var(--divider);white-space:nowrap;vertical-align:top}
table.model td{white-space:normal}
table.model td:last-child{min-width:340px}
thead th{background:#171a20;font-family:var(--mono);font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--n500);font-weight:400}
tbody tr:last-child td{border-bottom:none}
td.ex{white-space:normal;min-width:190px;font-size:13px}
td.w1{font-family:var(--mono);color:var(--n400);min-width:150px}
td.wk{min-width:172px;white-space:normal}
.mv{display:block;font-size:11.5px;font-weight:600}
.why{display:block;font-size:10.5px;color:var(--n600);line-height:1.35;margin-top:1px}
.inp{font-family:var(--mono);font-size:10px;color:var(--n700);display:block}
.m-load .mv{color:var(--acc)} .m-level .mv{color:var(--acc3)} .m-hold .mv{color:var(--warn)}
.m-rep .mv{color:#8fd0ff} .m-jump .mv{color:var(--caution)} .m-reset .mv{color:var(--danger)}
.tag{font-family:var(--mono);font-size:9.5px;padding:1px 5px;border-radius:2px;border:1px solid var(--n800);color:var(--n600);margin-left:5px}
.tag.slow{color:var(--warn);border-color:#5c4524}
.legend{display:flex;flex-wrap:wrap;gap:6px 18px;margin:14px 0;font-size:12.5px;color:var(--n500)}
.legend b{font-family:var(--mono);font-size:11px;font-weight:600}
"""

def render():
    P=[]; A=P.append
    A("<title>Twenty Programs, With Decisions</title>")
    A('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap">')
    A(f"<style>{CSS}</style>")
    A('<nav class="jump"><div class="inner"><a href="#mind">The model</a>'
      + "".join(f'<a href="#p{p["n"]}">{p["n"]:02d} {E(p["name"])}</a>' for p in PEOPLE)
      + '</div></nav><div class="wrap">')
    A('<header><div class="k">Jacked · training set · 20 people</div>'
      '<h1>Twenty programs, and every decision that follows</h1>'
      '<p class="lede">Three to six days a week, both sexes, both age bands, each with a real constraint to '
      'train around. Week one is logged by them. Every week after that is a decision, and every decision '
      'is on this page with the reasoning attached — which is the part to argue with.</p></header>')

    A('<section class="sec" id="mind"><div class="sec-no">The model</div>'
      '<h2>What a progression actually is here</h2>'
      '<p>Not a number written in advance. A decision taken from three inputs, once a week, per exercise.</p>')
    A('<div class="scroller"><table class="model"><thead><tr><th>Input</th><th>What it is</th><th>Why it is in here</th></tr></thead><tbody>'
      '<tr><td><b>Effort</b></td><td>1–5 on the last set. 1 easy, 5 could not have done another rep.</td>'
      '<td><b>The primary input.</b> Two people both hitting 4×10 did the same work on paper; one rated it 2 and one rated it 5, and they need opposite decisions. Reps alone cannot tell them apart.</td></tr>'
      '<tr><td><b>Reps</b></td><td>Under the target, on it, or over it.</td><td>Says whether the prescription was completed at all. A miss overrides everything else.</td></tr>'
      '<tr><td><b>Context</b></td><td>Week, block length, and whether the movement is on the slow track.</td>'
      '<td>Six-week blocks take smaller jumps than four-week ones (G61), and an injury history puts one movement on a deliberately slower ramp.</td></tr>'
      '</tbody></table></div>')
    A('<div class="note"><b>One thing moves per week.</b> Reps, load, or sets — never two. Volume and load '
      'draw on the same recovery budget, and pushing both is how a block that looks reasonable on paper '
      'buries someone by week four.</div>')
    A('<div class="note"><b>No load is ever prescribed in week one.</b> The client is given sets, a rep '
      'target and an effort ceiling, and picks the weight themselves. The engine does not know what anyone '
      'can lift until they tell it, and a guess lands as either a warm-up or an injury.</div>')
    A('<div class="legend">'
      '<span class="m-load"><b class="mv" style="display:inline">+load</b> add an increment, top sets</span>'
      '<span class="m-level"><b class="mv" style="display:inline">level up</b> lagging sets catch the top weight</span>'
      '<span class="m-rep"><b class="mv" style="display:inline">+rep</b> climb inside the range</span>'
      '<span class="m-jump"><b class="mv" style="display:inline">jump</b> it was too light — take the whole increment</span>'
      '<span class="m-hold"><b class="mv" style="display:inline">hold</b> effort is spent; load does not rise</span>'
      '<span class="m-reset"><b class="mv" style="display:inline">reset</b> missed the range — rebuild</span>'
      '</div></section>')

    for p in PEOPLE:
        title, days, changes = program_for(p)
        A(f'<section class="sec" id="p{p["n"]}"><div class="person"><div class="p-hd">'
          f'<span class="p-no">{p["n"]:02d}</span><span class="p-name">{E(p["name"])}</span>'
          f'<span class="p-meta">{p["sex"]} · {p["age"]} · {p["days"]}×/week · {p["weeks"]}-week block · {E(title)}</span></div>'
          f'<div class="p-body">')
        A(f'<div class="flag"><b>Noted on intake.</b> {E(p["note"])}</div>')
        A(f'<div class="chg"><b>What that changed.</b> {E(p["changed"])}')
        for old, new, why in changes:
            if new is None:
                A(f'<span class="swap"><s>{E(old)}</s> → removed{f" — {E(why)}" if why else ""}</span>')
            else:
                A(f'<span class="swap"><s>{E(old)}</s> → <em>{E(new)}</em>{f" — {E(why)}" if why else ""}</span>')
        A('</div>')

        for dayname, exs in days:
            A(f'<div class="day">{E(dayname)}</div><div class="scroller"><table><thead><tr>'
              f'<th>Exercise</th><th>Week 1 — they log it</th>'
              + "".join(f"<th>Week {w}</th>" for w in range(2, p["weeks"] + 1)) + '</tr></thead><tbody>')
            for name, sets, reps in exs:
                slow = (p["slow"] == name)
                badge = '<span class="tag slow">slow track</span>' if slow else f'<span class="tag">{tier(name)}·{track(name)}</span>'
                cells = ""
                for (w, effort, hit, code, move, why) in simulate(p, name, sets, reps):
                    cells += (f'<td class="wk m-{code}"><span class="inp">logged {hit} · effort {effort}</span>'
                              f'<span class="mv">{E(move)}</span><span class="why">{E(why)}</span></td>')
                A(f'<tr><td class="ex">{E(name)}{badge}</td>'
                  f'<td class="w1">{E(week_one(name, sets, reps))}</td>{cells}</tr>')
            A('</tbody></table></div>')
        A('</div></div></section>')

    A('<div class="note" style="margin-top:44px"><b>How to give feedback on this.</b> Ignore the simulated '
      'logs — they are only there so each decision has something to act on. What matters is whether the '
      '<i>decision</i> is right given the inputs on that cell. Anywhere you would have done something else, '
      'say the person number, the exercise, and what you would have done. Every disagreement is a rule.</div>')
    A('</div>')
    out = HERE / "twenty-programs.html"
    out.write_text("\n".join(P), encoding="utf-8")
    print(f"{out}  {out.stat().st_size/1024:.0f} KB")

render()
