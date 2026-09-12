"""What each exercise IS, for the ordering and volume rules.

Muscle, systemic cost, and body region. The rules that consume these:

  G60/G67  cost wins the opening slot, and a top-priority compound can take it instead
  G66      a muscle's work stays together; an already-started muscle is finished before a new one
  G69      the six-set ceiling on paired leg compounds
  G72      heavy lower-body days need more than a day between them

COST, lower is more expensive:
  0  standing, self-stabilised, axially loaded compound  (Smith squat, RDL, split squats)
  1  supported or guided compound                         (leg press, presses, rows, pulldowns, thrusts)
  2  isolation / accessory
  3  core
"""

EX = {
  # name:                          (muscle,        cost)
  "Incline Dumbbell Press":        ("Chest", 1),
  "Incline Smith Press":           ("Chest", 1),
  "Chest Press Machine":           ("Chest", 1),
  "Cable Fly — Mid":               ("Chest", 2),
  "Dumbbell Fly":                  ("Chest", 2),
  "Landmine Press":                ("Front delts", 1),
  "Seated Shoulder Press Machine": ("Front delts", 1),
  "Dumbbell Lateral Raise":        ("Side delts", 2),
  "Cybex Lateral Raise Machine":   ("Side delts", 2),
  "Freemotion Y Raise":            ("Side delts", 2),
  "Front Raise — Cable":           ("Front delts", 2),
  "Reverse Pec Deck":              ("Rear delts", 2),
  "Overhead Cable Triceps Ext.":   ("Triceps", 2),
  "Rope Pushdown":                 ("Triceps", 2),
  "Dumbbell Skullcrusher":         ("Triceps", 2),
  "Cable Curl":                    ("Biceps", 2),
  "Dumbbell Curl":                 ("Biceps", 2),
  "Hammer Curl":                   ("Biceps", 2),
  "Incline Dumbbell Curl":         ("Biceps", 2),
  "Spider Curl":                   ("Biceps", 2),
  "Barbell Reverse Curl":          ("Forearms", 2),
  "Dumbbell Reverse Curl":         ("Forearms", 2),
  "Lat Pulldown":                  ("Back", 1),
  "Chest Supported Row":           ("Back", 1),
  "Seated Cable Row":              ("Back", 1),
  "Weighted / Assisted Pull-Up":   ("Back", 0),
  "Assisted Pull-Up":              ("Back", 1),
  "Straight-Arm Pulldown":         ("Back", 2),
  "Smith Machine Squat":           ("Quads", 0),
  "Leg Press":                     ("Quads", 1),
  "Leg Extension":                 ("Quads", 2),
  "Dumbbell Reverse Lunge":        ("Quads", 0),
  "Bulgarian Split Squat":         ("Glutes", 0),
  "Smith Machine Split Lunge":      ("Glutes", 0),
  "Barbell RDL":                   ("Hamstrings", 0),
  # The erectors get their own muscle rather than being folded into hamstrings: for a client training around
  # low back pain, "how many sets did the lower back get" is the number that has to be visible.
  "45° Back Extension":            ("Lower back", 2),
  "Seated Leg Curl":               ("Hamstrings", 2),
  "Barbell Hip Thrust":            ("Glutes", 1),
  "Smith Machine Hip Thrust":      ("Glutes", 1),
  "Cable Pull-Through":            ("Glutes", 1),
  "Cable Glute Kickback":          ("Glutes", 2),
  "Glute Bridge":                  ("Glutes", 2),
  "Hip Abduction Machine":         ("Glutes", 2),
  "Standing Calf Raise":           ("Calves", 2),
  "Seated Calf Raise":             ("Calves", 2),
  "Captain's Chair Leg Raise":     ("Core", 3),
  "Hanging Leg Raise":             ("Core", 3),
  "V-Up":                          ("Core", 3),
  "Starfish Crunch":               ("Core", 3),
  "Cable Rotation":                ("Core", 3),
  "Plank Alternating Limb Touch":  ("Core", 3),
  "Dead Bug":                      ("Core", 3),
}

LOWER = {"Quads", "Hamstrings", "Glutes", "Calves"}

# G69. The compounds that make a leg day systemically expensive. Hip thrusts and pull-throughs are left
# OUT on purpose: supported, glute-dominant and low on axial load, they are not what "four sets of Smith
# squats and three of leg press will demolish somebody" was about. That is an inference, and it is on the
# list for Jack to confirm.
LEG_COMPOUNDS = {
  "Smith Machine Squat", "Leg Press", "Barbell RDL",
  "Bulgarian Split Squat", "Smith Machine Split Lunge", "Dumbbell Reverse Lunge",
}

# Priority tiers, from Jack's own ordering. Lower is more important.
#   Men:   chest and side delts; then arms and back (front/rear delts only where there is room); then abs and legs.
#   Women: glutes, quads, hamstrings; then back; then shoulders with core in the middle; then arms.
PRIORITY = {
  "M": {"Chest": 1, "Side delts": 1, "Back": 2, "Biceps": 2, "Triceps": 2, "Forearms": 2,
        "Front delts": 2, "Rear delts": 2, "Core": 3, "Quads": 3, "Hamstrings": 3, "Glutes": 3, "Calves": 3,
        "Lower back": 3},
  "F": {"Glutes": 1, "Quads": 1, "Hamstrings": 1, "Back": 2, "Side delts": 3, "Front delts": 3,
        "Rear delts": 3, "Core": 3, "Biceps": 4, "Triceps": 4, "Forearms": 4, "Calves": 4,
        "Lower back": 3},
}

def muscle(name): return EX[name][0]
def cost(name): return EX[name][1]
def region(name):
    m = muscle(name)
    return "lower" if m in LOWER else ("core" if m == "Core" else "upper")
def rank(sex, name): return PRIORITY[sex].get(muscle(name), 4)
def top_tier(sex, name): return rank(sex, name) == 1
