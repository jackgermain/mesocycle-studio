# Four more people, one per training frequency, built with everything from the twenty-program critique.
#
# Two four-week blocks and two six-week; two end in a deload (C7a, five or more days a week) and two do not.
# One beginner, so G69's two-sets rule is exercised; one week-one joint flag, so G70's swap is exercised.
# Which ordering, leg-ceiling and leg-spacing rules fire is decided by build2.py from the templates, not
# asserted here -- the page lists what actually fired for each person.
#
# A sub is a name, or (name, reps) where the replacement is not written the same way -- a pull-through
# replacing a per-side lunge is not done per side.

PEOPLE = [
 dict(n=1, name="Leah", sex="F", age="20–30", days=3, weeks=4, level="beginner",
      note="First structured training block. Ganglion cyst on the left wrist — pressing with the wrist bent back under load aches.",
      changed="Two sets on everything for the whole block, starting at the top of each rep range. Pressing stays on dumbbells so the wrist can sit neutral, on the slow track, with reps held at 10 or above.",
      slow="Incline Dumbbell Press", guard=["Incline Dumbbell Press"], subs={}, flag=None),
 dict(n=2, name="Dominic", sex="M", age="30–40", days=4, weeks=6, level="intermediate",
      note="Patellar tendinopathy in the right knee — aches just under the kneecap on deep knee bends and on leg extensions, worse the morning after.",
      changed="No lunges — the knee travels forward under load on every rep. Leg extensions run on the slow track with reps held high, so the tendon sees less load for the same work. Leg press reps held at 10 or above.",
      slow="Leg Extension", guard=["Leg Extension", "Leg Press"],
      subs={"Dumbbell Reverse Lunge": ("Cable Pull-Through", "12")}, flag=None),
 dict(n=3, name="Alina", sex="F", age="30–40", days=5, weeks=6, level="intermediate",
      note="Right SI joint irritation — Bulgarians and split lunges flare it within a day. Bilateral work is fine.",
      changed="No split-stance loading anywhere. Glutes come from hip thrusts, pull-throughs, bridges and abduction; quads from the Smith squat and leg press. The squat is on the slow track at 10 reps.",
      slow="Smith Machine Squat", guard=["Smith Machine Squat"],
      subs={"Bulgarian Split Squat": ("Cable Pull-Through", "15"),
            "Smith Machine Split Lunge": None,
            "Dumbbell Reverse Lunge": ("Glute Bridge", "15")}, flag=None),
 dict(n=4, name="Kai", sex="M", age="20–30", days=6, weeks=4, level="intermediate",
      note="Left shoulder dislocated two years ago, fully rehabbed. Still apprehensive with the arm back and out — the stretch at the bottom of a fly, and the bottom of a deep dumbbell press.",
      changed="No dumbbell flies — cable flies at mid height, where he sets how far back the arm goes. Pressing reps held at 10 or above, and week one is a test for the dumbbell press.",
      slow="Incline Dumbbell Press", guard=["Incline Dumbbell Press", "Incline Smith Press"],
      subs={"Dumbbell Fly": ("Cable Fly — Mid", "15")},
      # Simulated: his joint report after week one comes back flagged on the dumbbell press.
      flag=("Incline Dumbbell Press", "Incline Smith Press")),
]

REASON = {
 (2, "Dumbbell Reverse Lunge"): "a pull-through works the hips without the knee travelling forward under load",
 (3, "Bulgarian Split Squat"): "split stance loads one side of the pelvis — a pull-through loads both evenly",
 (3, "Smith Machine Split Lunge"): "same reason — and the squat and leg press already cover quads that day",
 (3, "Dumbbell Reverse Lunge"): "a bridge is bilateral and supported",
 (4, "Dumbbell Fly"): "a cable fly lets him stop short of the stretch; a dumbbell fly takes the arm back and out",
}
