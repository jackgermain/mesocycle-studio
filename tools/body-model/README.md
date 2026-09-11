# Body model

`makehuman-base.obj` is MakeHuman's base human mesh, downloaded 2026-09-11 from the MakeHuman project's own
repository: `https://github.com/makehumancommunity/makehuman` → `makehuman/data/3dobjs/base.obj`.

**Licence: CC0.** The file's own header says it was "explicitly released as CC0 in september 2020", and the
repository's LICENSE.md puts the base mesh, targets and other data files under CC0 1.0 Universal (only the
program code is AGPL). Free to use in a paid, closed app, with no attribution required.

Only the `body` group and the two eyeballs are rendered. The clothing proxies, hair, eyelashes and teeth are
left out. The `joint-*` groups are small markers MakeHuman places at every joint; they are not drawn, but they
are where the body picker's tap areas come from.

Rebuild after changing the model, the camera or the lighting:

```bash
node scripts/bake-body.mjs
```

That writes `public/body/frame-NN.webp` (what the app shows) and `src/components/bodyJoints.ts` (what taps are
tested against) from the same numbers, so the two cannot drift apart. It needs Google Chrome and a network
connection, because three.js is loaded from jsDelivr inside headless Chrome for the render.
