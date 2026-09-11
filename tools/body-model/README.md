# Body model

`makehuman-base.obj` is MakeHuman's base human mesh, downloaded 2026-09-11 from the MakeHuman project's own
repository: `https://github.com/makehumancommunity/makehuman` → `makehuman/data/3dobjs/base.obj`.

**Licence: CC0.** The file's own header says it was "explicitly released as CC0 in september 2020", and the
repository's LICENSE.md puts the base mesh, targets and other data files under CC0 1.0 Universal (only the
program code is AGPL). Free to use in a paid, closed app, with no attribution required.

Only the `body` group and the two eyeballs are rendered. The clothing proxies, hair, eyelashes and teeth are
left out. The `joint-*` groups are small markers MakeHuman places at every joint; they are not drawn, but they
are where the body picker's tap areas come from.

## Shape: a muscular man

`targets/` holds seven MakeHuman shape targets — per-vertex offsets — from the same repository and under the
same CC0 licence (each file's own header says so), downloaded 2026-09-11 from
`makehuman/data/targets/macrodetails/` and its `proportions/` folder. The bake adds them to the base mesh with
the weights MakeHuman's own sliders produce for:

- **male** — the three `*-male-young` ethnic targets at a third each, since that is where gender lives
- **maximum muscle, a little under average weight** — `universal-male-young-maxmuscle-averageweight` at 0.7
  and `-minweight` at 0.3, so the muscle reads as definition rather than bulk
- **ideal proportions** — the two proportions files are byte-identical, so this is one shape at full weight

The joint markers move with the body, so the same run re-fits the tap areas to the new shape.

Rebuild after changing the model, the shape, the camera or the lighting:

```bash
node scripts/bake-body.mjs
```

That writes `public/body/frame-NN.webp` (what the app shows) and `src/components/bodyJoints.ts` (what taps are
tested against) from the same numbers, so the two cannot drift apart. It needs Google Chrome and a network
connection, because three.js is loaded from jsDelivr inside headless Chrome for the render.
