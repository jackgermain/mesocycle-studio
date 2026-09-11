# What each person's constraint actually changes, as substitutions against the base template for their
# sex and day-count. Written as swaps rather than as whole new programs so the change is legible: the
# artifact can show "Barbell RDL -> Cable Pull-Through" and the reason, instead of a program you have to
# diff in your head.
#
# None means remove without replacing. A note in REASON explains the swap in the person's own terms.

SUBS = {
 1:  {"Cable Curl": "Hammer Curl", "Dumbbell Curl": "Incline Dumbbell Curl", "Barbell Reverse Curl": "Dumbbell Reverse Curl"},
 2:  {"Chest Press Machine": "Incline Dumbbell Press", "Cable Fly — Mid": "Cable Fly — Mid"},
 3:  {"Barbell RDL": "Barbell RDL", "Weighted / Assisted Pull-Up": "Lat Pulldown"},
 4:  {"Dumbbell Skullcrusher": "Overhead Cable Triceps Ext.", "Barbell Reverse Curl": "Hammer Curl"},
 5:  {},
 6:  {"Incline Smith Press": "Landmine Press", "Freemotion Y Raise": "Dumbbell Lateral Raise", "Front Raise — Cable": None},
 7:  {"Dumbbell Reverse Lunge": "Bulgarian Split Squat", "Leg Press": "Leg Press"},
 8:  {"Incline Dumbbell Press": "Incline Smith Press", "Dumbbell Fly": "Cable Fly — Mid"},
 9:  {"Cybex Lateral Raise Machine": "Reverse Pec Deck", "Freemotion Y Raise": "Reverse Pec Deck"},
 10: {"Standing Calf Raise": "Seated Calf Raise", "Smith Machine Squat": "Leg Press", "Dumbbell Reverse Lunge": "Leg Extension"},
 11: {"Smith Machine Squat": "Leg Press", "Bulgarian Split Squat": "Hip Abduction Machine", "Smith Machine Split Lunge": "Cable Glute Kickback"},
 12: {"Bulgarian Split Squat": "Barbell Hip Thrust", "Leg Press": "Leg Press"},
 13: {"Barbell RDL": "Barbell RDL", "Bulgarian Split Squat": "Seated Leg Curl"},
 14: {"Smith Machine Squat": "Leg Press", "Barbell RDL": "Seated Leg Curl", "Barbell Hip Thrust": "Smith Machine Hip Thrust", "Assisted Pull-Up": "Lat Pulldown"},
 15: {},
 16: {"Captain's Chair Leg Raise": "Plank Alternating Limb Touch", "Hanging Leg Raise": "Cable Rotation", "Starfish Crunch": "Plank Alternating Limb Touch", "V-Up": "Plank Alternating Limb Touch"},
 17: {"Lat Pulldown": "Lat Pulldown", "Assisted Pull-Up": "Seated Cable Row", "Incline Dumbbell Press": "Chest Press Machine"},
 18: {"Smith Machine Squat": "Leg Press", "Smith Machine Split Lunge": "Seated Leg Curl", "Dumbbell Reverse Lunge": "Leg Extension"},
 19: {"Barbell RDL": "Cable Pull-Through", "Chest Supported Row": "Chest Supported Row", "Seated Cable Row": "Chest Supported Row"},
 20: {"Smith Machine Squat": "Smith Machine Squat", "Dumbbell Reverse Lunge": "Smith Machine Split Lunge", "Standing Calf Raise": "Seated Calf Raise"},
}

# Why, in the person's terms. Only for swaps that actually change the movement.
REASON = {
 (1,  "Cable Curl"): "straight-bar and cable-bar curls are what flared the tendon; neutral grip instead",
 (2,  "Chest Press Machine"): "keeps every press on an incline, where the AC joint is quiet",
 (3,  "Weighted / Assisted Pull-Up"): "loaded pull-ups put the spine under axial load at the bottom; the pulldown does not",
 (4,  "Dumbbell Skullcrusher"): "the wrist is extended and loaded at the bottom of a skullcrusher; rope keeps it neutral",
 (6,  "Incline Smith Press"): "landmine press keeps the hands below eye level, where the cuff is comfortable",
 (6,  "Front Raise — Cable"): "front raises take the arm above eye level with a straight arm — the exact position that aggravates it",
 (7,  "Dumbbell Reverse Lunge"): "a fixed rear foot means the knee tracks the same way every rep, unlike a stepping lunge",
 (8,  "Incline Dumbbell Press"): "the Smith bounds the bottom of the press, so he is never in the deep stretch that strained it",
 (8,  "Dumbbell Fly"): "a cable fly at mid height lets him pick the range; a dumbbell fly does not",
 (9,  "Cybex Lateral Raise Machine"): "chest-supported, so the neck is not holding position under load",
 (10, "Standing Calf Raise"): "standing calf work is loaded dorsiflexion, which is the aggravator",
 (10, "Smith Machine Squat"): "keeps him off his feet under load",
 (11, "Smith Machine Squat"): "leg press with a high foot position gets the quads without deep knee flexion",
 (11, "Bulgarian Split Squat"): "single-leg work is the worst offender for anterior knee pain; abduction gets glute volume without it",
 (12, "Bulgarian Split Squat"): "split squats take the hip past the pinch; a thrust never leaves the mid range",
 (13, "Bulgarian Split Squat"): "leg curls load the hamstring short rather than long, which the strained tissue tolerates",
 (14, "Smith Machine Squat"): "a bounded machine range means she cannot sink into end range",
 (14, "Barbell RDL"): "an RDL is an end-range hamstring stretch under load, which is the thing to avoid",
 (16, "Captain's Chair Leg Raise"): "direct flexion is what causes the coning; anti-extension work does not",
 (17, "Assisted Pull-Up"): "wide-grip pulling is the aggravator; a neutral row is not",
 (17, "Incline Dumbbell Press"): "a machine means the shoulder is not stabilising the weight",
 (18, "Smith Machine Squat"): "leg press lets her control depth precisely on a stiff day",
 (19, "Barbell RDL"): "a pull-through is a hinge with the load in front and no spinal compression",
 (19, "Seated Cable Row"): "chest-supported means the low back is out of the row entirely",
 (20, "Dumbbell Reverse Lunge"): "a fixed split stance does not ask the limited ankle to travel",
 (20, "Standing Calf Raise"): "seated calf work keeps the ankle out of loaded dorsiflexion",
}
