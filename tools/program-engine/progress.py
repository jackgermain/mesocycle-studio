"""The progression model, as decisions rather than numbers.

Week 1 is logged by the client: they are given sets, a rep target and an effort target, and they pick the
weight. Nothing is prescribed as a load, ever — the engine has no idea what someone can lift until they
tell it, and guessing is how a first week ends in either a warm-up or an injury.

From week 2 on, each exercise gets exactly ONE move, decided from three inputs:

    reps        did they hit the rep target on every set, or fall short, or beat it
    effort      the 1..5 rating on the LAST set (G62). 1 easy, 5 could not have done another rep.
    context     where in the block, how long the block is, and whether this movement is on the slow track

Only one thing moves per week — reps, load, or sets, never two. Volume and load draw on the same recovery
budget, and pushing both is how a block that looks reasonable on paper buries someone by week four.

EFFORT IS THE PRIMARY INPUT, NOT THE REPS. Two clients both hitting 4x10 did the same work on paper; the
one who rated it 2 and the one who rated it 5 need opposite decisions, and the rep count cannot tell them
apart. This is the single biggest difference from a spreadsheet progression.
"""

# Two tracks, as in the doctrine. Load-first holds reps and adds weight; rep-first climbs reps to the top
# of the range then jumps load and resets, because on a lateral raise the next dumbbell is a 25% jump and
# five pounds costs two or three reps.
REP_FIRST = {
  "Incline Dumbbell Press", "Dumbbell Fly", "Cable Fly — Mid", "Reverse Pec Deck", "Freemotion Y Raise",
  "Dumbbell Lateral Raise", "Front Raise — Cable", "Straight-Arm Pulldown", "Dumbbell Skullcrusher",
  "Rope Pushdown", "Overhead Cable Triceps Ext.", "Cable Curl", "Dumbbell Curl", "Hammer Curl",
  "Incline Dumbbell Curl", "Barbell Reverse Curl", "Dumbbell Reverse Curl", "Cable Glute Kickback",
  "Glute Bridge", "Bulgarian Split Squat", "Smith Machine Split Lunge", "Dumbbell Reverse Lunge",
  "Captain's Chair Leg Raise", "Hanging Leg Raise", "V-Up", "Starfish Crunch", "Cable Rotation",
  "Plank Alternating Limb Touch", "Landmine Press", "Cable Pull-Through",
}

# Highest absolute load, so G61's six-week restraint bites hardest here.
HEAVY = {
  "Barbell RDL", "Smith Machine Squat", "Barbell Hip Thrust", "Smith Machine Hip Thrust",
  "Incline Smith Press", "Leg Press", "Weighted / Assisted Pull-Up",
}

def track(name):
    return "rep" if name in REP_FIRST else "load"

def tier(name):
    return "H" if name in HEAVY else "M"


def decide(name, week, weeks, effort, hit, slow, staggered=False):
    """One week's move for one exercise.

    `hit` is what they did against the rep target: "under", "on", or "over".
    `slow` marks the movement their injury note put on the conservative track.
    `staggered` is whether the sets are currently uneven — the top set already carries more than the rest.

    That last one matters more than it looks. "Level up" means bringing the lagging sets to the weight the
    top set already uses, so it is only available when there ARE lagging sets. Without tracking it, a
    client who sat at effort 4 for four weeks got told to level up four times, which after the first is an
    instruction to do nothing.

    Returns (code, move, why). The code drives the colour; the move is what the client sees next week.
    """
    load_first = track(name) == "load"
    heavy = tier(name) == "H"
    six = weeks >= 6

    # ---- the client did not finish the work -----------------------------------------------------------
    if hit == "under":
        # Twice in a row is a load problem, not a bad day. Rebuilding from 10% down beats grinding.
        return ("reset", "drop ~10%, rebuild", "missed the range — a second miss next week drops the load")

    # ---- failure. G62: effort is spent, so load must not also rise --------------------------------------
    if effort >= 5:
        if heavy and six:
            # G61 and G62 stacked: the heaviest thing in the longest block, already at RIR 0, with the
            # deload still weeks away. This is the one case where nothing moves at all.
            return ("hold", "repeat exactly", "RIR 0 on the heaviest lift, mid-block — nothing moves")
        return ("hold", "hold load, +1 rep", "hit failure — the effort target was already met, so load holds")

    # ---- the prescription was too light ---------------------------------------------------------------
    if effort <= 2 and hit != "under":
        if load_first:
            return ("jump", "+1 full increment, all sets", "rated easy — this was under-prescribed, so it takes the whole jump")
        return ("jump", "+2 reps", "rated easy — climb the range faster than one rep a week")

    # ---- the normal case ------------------------------------------------------------------------------
    # A movement on the slow track never takes a full jump. Its whole purpose is to accumulate more slowly
    # than the rest of the program, because the tissue underneath it has a history.
    if slow:
        if effort >= 4:
            return ("hold", "hold load, +1 rep", "slow track — anything at 4 or above holds the load")
        return ("rep", "+1 rep", "slow track — reps before load, every week")

    if effort >= 4:
        # Very hard but not failure: bring the lagging sets up to the top set's weight rather than putting
        # more on the top set. This is `levelUp` — the smaller of the two moves, and it comes first.
        return ("level", "level up — lagging sets to the top weight", "very hard — finish the jump already started before making a new one")

    # effort 3, hit the range: the standard move.
    if load_first:
        if heavy and six:
            # G61: same destination, two weeks later. The increment shrinks rather than the block getting
            # a longer version of the same ramp.
            return ("load", "+1 min increment, top set only", "on target — six-week block, so the smallest jump on the heaviest lift")
        return ("load", "+1 increment, top 2 sets", "on target — stagger the jump rather than moving every set at once")
    return ("rep", "+1 rep", "on target — climb the range before touching the load")


def stagger_after(code, staggered):
    """Whether the sets are uneven after this move. A load jump lands on the top sets only, which creates
    the gap; levelling closes it; a reset flattens everything."""
    if code == "load": return True
    if code in ("level", "reset", "jump"): return False
    return staggered


def week_one(name, sets, reps):
    """What week one asks for. No load, an effort ceiling instead — the client picks a weight that lands
    them at about RPE 7 on the last set, which is the only instruction that works when nobody yet knows
    what they can lift."""
    return f"{sets}×{reps} @7 · client picks the weight"
