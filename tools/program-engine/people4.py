# Four people, one per training frequency.
#
# G96: the intake carries training age, consistency and what a typical session looks like, because half the
# rules key off them -- a first block barely moves the bar on a hinge (G83), a beginner's leg day is two or
# three exercises (G88), an RDL and a leg curl together are intermediate-plus (G93).
#
# `cleared` is G90 and is a keyword, not prose: "yes", "no", or "n/a" when there is nothing to clear. It was
# prose once, and `cleared.startswith("no")` read Leah's "Not needed" as "No" and stripped every knee-loaded
# lift out of her program -- she ended up with no quad work at all. The note for the page is `cleared_note`.
#
# A sub is a name, or (name, reps) where the replacement is not written the same way -- a pull-through
# replacing a per-side lunge is not done per side. None removes the exercise. Subs are intake decisions only:
# anything a doctrine rule removes (G88's leg extension, G90's knee work) is left to the rule, so the page
# attributes it to the rule rather than to the person.

PEOPLE = [
 dict(n=1, name="Leah", sex="F", age="20–30", days=3, weeks=4, level="beginner",
      training_age="First structured block. Six months of classes and treadmill, no barbell work.",
      consistency="Two or three sessions most weeks for the last six months; never missed for longer than a week.",
      typical="Circuit-style classes: light dumbbells, high reps, nothing taken near failure, no weights written down.",
      cleared="n/a", cleared_note="Nothing to clear — no diagnosis.",
      note="Ganglion cyst on the left wrist — pressing with the wrist bent back under load aches.",
      changed="G85: the press moves to a machine, with a wrist wrap, and progresses like anything else — a dumbbell "
              "can fall back on the wrist and a barbell is worse. G88 then cuts the leg day down on its own: the "
              "leg extension goes, and the leg press goes because the Smith squat is already there. G83 keeps the "
              "RDL creeping on the small plate since this is her first block, while the hip thrust (G84) gets "
              "pushed hard.",
      guard=[],
      subs={"Incline Dumbbell Press": ("Chest Press Machine", "10–12")},
      flag=None),
 dict(n=2, name="Dominic", sex="M", age="30–40", days=4, weeks=6, level="intermediate",
      training_age="Nine years on and off; the last three consistent.",
      consistency="Four days a week for the last two years, give or take a week around work travel.",
      typical="Upper/lower, 6–10 reps on the first lift and 10–15 after it, one or two sets a session taken close "
              "to failure, weights written down every session.",
      cleared="no", cleared_note="No — patellar tendinopathy, not seen by a physician yet.",
      note="Patellar tendinopathy in the right knee — aches just under the kneecap on deep knee bends and on leg "
           "extensions, worse the morning after.",
      changed="G90: with no clearance the app doesn't program around a tendon problem. Everything that loads the "
              "knee through deep flexion comes out — the leg press, the leg extension, the Smith squat and the "
              "lunges — and he needs a physician before any of it comes back. What's left is what you said is "
              "fine: hip hinging, pull-throughs and hamstring curls.",
      guard=[],
      subs={"Dumbbell Reverse Lunge": ("Cable Pull-Through", "12")},
      flag=None),
 dict(n=3, name="Alina", sex="F", age="30–40", days=5, weeks=6, level="intermediate",
      training_age="Six years lifting, the last four in blocks with a coach.",
      consistency="Five days a week, rarely misses; trains around a desk job with evening sessions.",
      typical="Glute-focused: hip thrusts and RDLs heavy for 8–10, everything else 12–20, last set of each "
              "exercise near failure.",
      cleared="yes", cleared_note="Yes — physiotherapist cleared bilateral work, no split stance.",
      note="Right SI joint irritation — Bulgarians and split lunges flare it within a day. Bilateral work is fine.",
      changed="No split-stance loading anywhere: the Bulgarian and the split lunge become a pull-through and a "
              "glute bridge. Glutes come from hip thrusts, pull-throughs, bridges and abduction; quads from the "
              "Smith squat and the leg press, both bilateral and both cleared. The squat is the one lift held at "
              "10 reps.",
      guard=["Smith Machine Squat"],
      subs={"Bulgarian Split Squat": ("Cable Pull-Through", "15"),
            "Smith Machine Split Lunge": ("Barbell Glute Bridge", "12"),
            "Dumbbell Reverse Lunge": ("Barbell Glute Bridge", "15")},
      flag=None),
 dict(n=4, name="Kai", sex="M", age="20–30", days=6, weeks=4, level="intermediate",
      training_age="Five years, the last two at six days a week.",
      consistency="Six days a week for two years; a week off after each block.",
      typical="Push/pull/legs twice over, 8–12 reps on nearly everything, the last set of each exercise at or "
              "near failure, tracks every set in a notebook.",
      cleared="yes", cleared_note="Yes — shoulder rehabbed and discharged two years ago.",
      note="Left shoulder dislocated two years ago, fully rehabbed. Still apprehensive with the arm back and out "
           "— the stretch at the bottom of a fly, and the bottom of a deep dumbbell press.",
      changed="No dumbbell flies — cable flies at mid height, where he sets how far back the arm goes. Pressing "
              "reps held at 10 or above, and week one is a test for the dumbbell press.",
      guard=["Incline Dumbbell Press", "Incline Smith Press"],
      subs={"Dumbbell Fly": ("Cable Fly — Mid", "15")},
      # Simulated: his joint report after week one comes back flagged on the dumbbell press.
      flag=("Incline Dumbbell Press", "Incline Smith Press")),
]

REASON = {
 (1, "Incline Dumbbell Press"): "G85: a machine press can't fall back on a sore wrist, and it keeps progressing",
 (2, "Dumbbell Reverse Lunge"): "a pull-through works the hips without the knee travelling forward under load",
 (3, "Bulgarian Split Squat"): "split stance loads one side of the pelvis — a pull-through loads both evenly",
 (3, "Smith Machine Split Lunge"): "same reason — a barbell glute bridge is bilateral and supported",
 (3, "Dumbbell Reverse Lunge"): "a bridge is bilateral and supported",
 (4, "Dumbbell Fly"): "a cable fly lets him stop short of the stretch; a dumbbell fly takes the arm back and out",
}
