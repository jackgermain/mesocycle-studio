/**
 * Bake the body picker's figure from a real human model, and fit its tap areas to that same model.
 *
 *   node scripts/bake-body.mjs [frames]
 *
 * Source: tools/body-model/makehuman-base.obj -- MakeHuman's base mesh, released CC0 (the licence is in the
 * file's own header). Two outputs, from one set of numbers so they cannot drift apart:
 *
 *   public/body/frame-NN.webp       the body from NN angles round one turn -- what the app shows
 *   src/components/bodyJoints.ts    where the model's own joints are -- what the tap areas are built from
 *
 * Why pictures rather than 3D in the app: three.js is ~600KB into a bundle with no code splitting, so every
 * screen would pay for one panel in the feedback flow. A ring of WebP frames loads as images, only on the
 * screen that uses them, and cannot drop a frame on an old phone.
 *
 * Why the joints: the tap areas used to be hand-placed capsules, and they cannot line up with a real body --
 * MakeHuman stands in an A-pose, arms out and feet apart. MakeHuman marks every joint with a small group of
 * faces, so the capsules are built from those markers, in the same space and through the same camera as the
 * pictures. A tap on the knee in the picture lands on the knee from every angle.
 *
 * The camera replicates bodyModel.project exactly: a window 108 x 178 body units wide and tall at the body's
 * centre, seen from 340 units away, turned about the vertical axis by the same yaw.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, rmSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const MODEL = resolve("tools/body-model/makehuman-base.obj");
const FRAMES = Number(process.argv[2] || 36);

const VIEW_W = 108;
const VIEW_H = 178;
const DIST = 340;
const PX_PER_UNIT = 5; // 540 x 890: sharp on a 3x phone at the panel's 380px height
const BODY_HEIGHT = 163; // body units, head to heel -- leaves a margin inside the 178-unit window

// The body, and its eyeballs so the face is not two empty sockets. Hair, eyelashes, teeth and the clothing
// proxies are separate groups in the file and stay out.
const KEEP = ["body", "helper-l-eye", "helper-r-eye"];

// ---- 1. Read the mesh: which vertices are the body, and where each joint marker sits. -----------------
const V = [];
const groups = new Map();
let group = "";
for (const line of readFileSync(MODEL, "utf8").split("\n")) {
  if (line.startsWith("v ")) {
    const [, x, y, z] = line.trim().split(/\s+/);
    V.push([+x, +y, +z]);
  } else if (line.startsWith("g ") || line.startsWith("o ")) {
    group = line.slice(2).trim();
  } else if (line.startsWith("f ")) {
    if (!groups.has(group)) groups.set(group, new Set());
    for (const tok of line.trim().split(/\s+/).slice(1)) groups.get(group).add(parseInt(tok, 10) - 1);
  }
}

function centre(name) {
  const idx = groups.get(name);
  if (!idx) throw new Error(`the model has no ${name} group`);
  const c = [0, 0, 0];
  for (const i of idx) for (let k = 0; k < 3; k++) c[k] += V[i][k];
  return c.map((v) => v / idx.size);
}

let ymin = Infinity;
let ymax = -Infinity;
for (const i of groups.get("body")) {
  ymin = Math.min(ymin, V[i][1]);
  ymax = Math.max(ymax, V[i][1]);
}
// Mesh units (decimetres, y up, facing +z) to body space (x to the viewer's right at yaw 0, y down, z toward
// the camera). Scaled to a fixed height, centred vertically, and turned about the pelvis.
const S = BODY_HEIGHT / (ymax - ymin);
const YC = (ymin + ymax) / 2;
const ZC = centre("joint-pelvis")[2];
const round = (v) => Math.round(v * 10) / 10 + 0; // + 0 turns -0 into 0
const toBody = ([x, y, z]) => [round(x * S), round(-(y - YC) * S), round((z - ZC) * S)];

const NAMES = {
  headTop: "joint-head-2", head: "joint-head", neck: "joint-neck",
  spine1: "joint-spine-1", spine2: "joint-spine-2", spine3: "joint-spine-3", spine4: "joint-spine-4",
  pelvis: "joint-pelvis",
};
for (const s of ["r", "l"]) {
  Object.assign(NAMES, {
    [`${s}Clavicle`]: `joint-${s}-clavicle`,
    [`${s}Shoulder`]: `joint-${s}-shoulder`,
    [`${s}Elbow`]: `joint-${s}-elbow`,
    [`${s}Wrist`]: `joint-${s}-hand`,
    [`${s}Hip`]: `joint-${s}-upper-leg`,
    [`${s}Knee`]: `joint-${s}-knee`,
    [`${s}Ankle`]: `joint-${s}-ankle`,
    [`${s}Midfoot`]: `joint-${s}-foot-1`,
    [`${s}Toes`]: `joint-${s}-foot-2`,
  });
}
const joints = Object.entries(NAMES).map(([key, name]) => [key, toBody(centre(name))]);

writeFileSync(
  resolve("src/components/bodyJoints.ts"),
  [
    "// Written by scripts/bake-body.mjs from tools/body-model/makehuman-base.obj. Do not edit by hand -- rerun it.",
    "//",
    "// Where the joints are on the model the body picker's pictures are rendered from, in body space: x toward",
    "// the viewer's right at yaw 0, y down, z toward the camera. The tap areas in bodyModel.ts are built from",
    "// these, which is what keeps a tap on the knee in the picture on the knee.",
    "",
    `export const FRAME_COUNT = ${FRAMES};`,
    "",
    "export const JOINTS = {",
    ...joints.map(([key, v]) => `  ${key}: [${v.join(", ")}],`),
    "} as const;",
    "",
  ].join("\n"),
);
console.log(`wrote src/components/bodyJoints.ts (${joints.length} joints, scale ${S.toFixed(3)})`);

// ---- 2. Render the frames. ------------------------------------------------------------------------------
const W = VIEW_W * PX_PER_UNIT;
const H = VIEW_H * PX_PER_UNIT;
const FOV = (2 * Math.atan(VIEW_H / 2 / DIST) * 180) / Math.PI;
const out = resolve("public/body");
mkdirSync(out, { recursive: true });

const page = `<!doctype html><html><body style="margin:0">
<script type="importmap">
{"imports":{
  "three":"https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js",
  "three/addons/":"https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/"
}}
</script>
<script type="module">
import * as THREE from "three";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

function report(o) {
  const pre = document.createElement("pre");
  pre.id = "out";
  pre.textContent = JSON.stringify(o);
  document.body.appendChild(pre);
}

try {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(${W}, ${H});
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  // Lit for a dark page: a soft sky light so nothing goes black, one strong key from the upper left front,
  // a cool fill from the right, and two green rims from behind -- the app's accent -- that lift the
  // silhouette off the background the way the rest of the UI glows.
  scene.add(new THREE.HemisphereLight(0xdfe7f0, 0x15181d, 0.85));
  const key = new THREE.DirectionalLight(0xffffff, 2.3); key.position.set(-160, 260, 300); scene.add(key);
  const fill = new THREE.DirectionalLight(0xa9bfd4, 0.65); fill.position.set(260, 60, 160); scene.add(fill);
  const rimA = new THREE.DirectionalLight(0x4ce08f, 1.5); rimA.position.set(140, 180, -320); scene.add(rimA);
  const rimB = new THREE.DirectionalLight(0x4ce08f, 1.0); rimB.position.set(-160, 120, -300); scene.add(rimB);

  const keep = new Set(${JSON.stringify(KEEP)});
  const root = await new OBJLoader().loadAsync("file://${MODEL}");
  const skin = new THREE.MeshStandardMaterial({ color: 0xaeb6c1, roughness: 0.52, metalness: 0 });
  for (const child of [...root.children]) {
    if (!child.isMesh || !keep.has(child.name)) { root.remove(child); continue; }
    // The file has no normals, so the loader's are per face and the body renders as facets. Welding the
    // vertices and recomputing gives the smooth shading a skin should have.
    let geo = child.geometry;
    geo.deleteAttribute("normal");
    geo.deleteAttribute("uv");
    geo = mergeVertices(geo, 1e-4);
    geo.computeVertexNormals();
    child.geometry = geo;
    child.material = skin;
  }
  if (root.children.length === 0) throw new Error("no body mesh found in the model");

  root.scale.setScalar(${S});
  root.position.set(0, ${-YC * S}, ${-ZC * S});
  const pivot = new THREE.Group();
  pivot.add(root);
  scene.add(pivot);

  const cam = new THREE.PerspectiveCamera(${FOV}, ${VIEW_W / VIEW_H}, 1, 2000);
  cam.position.set(0, 0, ${DIST});
  cam.lookAt(0, 0, 0);

  const frames = [];
  for (let i = 0; i < ${FRAMES}; i++) {
    pivot.rotation.y = (i / ${FRAMES}) * Math.PI * 2;
    renderer.render(scene, cam);
    frames.push(renderer.domElement.toDataURL("image/webp", 0.9));
  }
  report({ ok: true, frames, kept: root.children.map((c) => c.name) });
} catch (e) {
  report({ ok: false, error: String((e && e.message) || e) });
}
</script></body></html>`;

const pagePath = resolve(out, "_bake.html");
writeFileSync(pagePath, page);

console.log(`rendering ${FRAMES} frames at ${W}x${H} …`);
const dom = execFileSync(
  CHROME,
  [
    "--headless", "--disable-gpu", "--enable-unsafe-swiftshader", "--use-gl=swiftshader",
    "--allow-file-access-from-files", "--virtual-time-budget=180000",
    "--dump-dom", `file://${pagePath}`,
  ],
  { maxBuffer: 1024 * 1024 * 400 },
).toString();
rmSync(pagePath, { force: true });

const m = dom.match(/<pre id="out">([\s\S]*?)<\/pre>/);
if (!m) {
  console.error("no output — the page never finished rendering.");
  process.exit(1);
}
const result = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&"));
if (!result.ok) {
  console.error("render failed:", result.error);
  process.exit(1);
}

for (const f of readdirSync(out)) if (/^frame-\d+\.(png|webp)$/.test(f)) rmSync(resolve(out, f));
let bytes = 0;
result.frames.forEach((dataUrl, i) => {
  const buf = Buffer.from(dataUrl.split(",")[1], "base64");
  bytes += buf.length;
  writeFileSync(resolve(out, `frame-${String(i).padStart(2, "0")}.webp`), buf);
});
console.log(`wrote ${result.frames.length} frames to public/body/ (${Math.round(bytes / 1024)} KB), rendered: ${result.kept.join(", ")}`);
