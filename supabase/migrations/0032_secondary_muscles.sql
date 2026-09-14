-- An exercise can say it trains more than one muscle.
--
-- Jack, adding "Hip Clean": "I want to be able to categorize exercises as working more than one group
-- rather than it simply saying that you can only work one muscle from an exercise... I want to be able to
-- click on back and I also want to be able to click on full body. and quads and traps."
--
-- `muscle` stays, and stays singular, on purpose. It is the PRIMARY mover, and it is what weekly volume
-- books a set against -- 113 places in the app read it. If a hip clean counted as a direct set for back and
-- quads and traps and full body all at once, four muscles would each be charged the full set and every
-- "over/in range/under" verdict in the app would be wrong. So the extra muscles are additive and secondary:
-- they earn fractional credit toward effective volume, which is exactly what src/generator/weeklyVolume.ts
-- already does for synergists, and they count for the soreness check.
--
-- Default '{}' rather than null so every existing row reads back as "no secondaries" without a backfill,
-- and no reader has to handle null separately.
--
-- Same taxonomy constraint as `muscle`, for the same reason: volume, soreness and the synergist tables all
-- key off MUSCLE_GROUPS, and a muscle outside it books work against nothing while looking normal on screen.
-- `<@` is array containment -- every element must appear in the allowed list.

alter table public.library_exercises
  add column if not exists secondary_muscles text[] not null default '{}';

alter table public.library_exercises
  drop constraint if exists library_exercises_secondary_known;

alter table public.library_exercises
  add constraint library_exercises_secondary_known check (
    secondary_muscles <@ array[
      'Abs','Back','Biceps','Calves','Chest','Forearms','Front delts','Side delts','Rear delts',
      'Full body','Glutes','Hamstrings','Adductors','Obliques','Quads','Traps','Triceps'
    ]::text[]
  );
