/**
 * Bake a 3D human model into a ring of flat images the app can flip through.
 *
 *   node scripts/bake-body.mjs path/to/body.glb [frames]
 *
 * Renders the model once per angle in headless Chrome — which has working WebGL 2 here — and writes the
 * frames to public/body/. Nothing 3D ships to the phone: the app swipes through pictures, so the runtime
 * cost is one <img> and the bundle never learns what a mesh is.
 *
 * Why bake rather than render live: three.js is ~600KB into a bundle with no code splitting, so every
 * screen in the app would pay for one panel in the feedback flow. A ring of WebP frames is a couple of
 * hundred KB, loads as images, and cannot drop a frame on an old phone.
 *
 * The camera is fixed and orbits on one axis, so every frame shares a centre and a scale. That is what
 * lets the existing capsule model keep doing the tap-picking underneath: the sprite is what you see, the
 * capsules are what you touch, and they line up because the bake and the picker use the same framing.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const model = process.argv[2];
const FRAMES = Number(process.argv[3] || 36);
const SIZE = 900; // rendered square, downscaled after

if (!model || !existsSync(model)) {
  console.error("usage: node scripts/bake-body.mjs path/to/body.glb [frames]");
  process.exit(1);
}
const modelPath = resolve(model);
const out = resolve("public/body");
mkdirSync(out, { recursive: true });

const page = `<!doctype html><html><body style="margin:0;background:#0b0c11">
<script type="importmap">
{"imports":{
  "three":"https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js",
  "three/addons/":"https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/"
}}
</script>
<script type="module">
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";

const SIZE = ${SIZE}, FRAMES = ${FRAMES};
const url = "file://${modelPath.replace(/"/g, '\\"')}";

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setSize(SIZE, SIZE);
renderer.setClearColor(0x000000, 0);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();

// Lit like the rest of the app: one strong key from the upper left, a cool fill from the right so the
// shaded side does not go black, and a rim from behind to lift the silhouette off a dark page.
const key = new THREE.DirectionalLight(0xffffff, 2.6); key.position.set(-3, 4, 4); scene.add(key);
const fill = new THREE.DirectionalLight(0x9fb4c8, 0.9); fill.position.set(4, 1, 2); scene.add(fill);
const rim = new THREE.DirectionalLight(0x4ce08f, 1.1); rim.position.set(0, 2, -5); scene.add(rim);
scene.add(new THREE.AmbientLight(0x404a56, 0.7));

function loaderFor(u) {
  if (/\\.glb$|\\.gltf$/i.test(u)) return new GLTFLoader();
  if (/\\.fbx$/i.test(u)) return new FBXLoader();
  return new OBJLoader();
}

function report(o) {
  const pre = document.createElement("pre");
  pre.id = "out";
  pre.textContent = JSON.stringify(o);
  document.body.appendChild(pre);
}

try {
  const loaded = await loaderFor(url).loadAsync(url);
  const root = loaded.scene ?? loaded;

  // Neutral clay, so the app's own colours do the talking and the model's own textures cannot fight them.
  root.traverse((n) => {
    if (n.isMesh) n.material = new THREE.MeshStandardMaterial({ color: 0x8d95a1, roughness: 0.62, metalness: 0.04 });
  });

  // Centre on the model's own bounding box and scale it to a fixed height, so a model authored in metres
  // and one authored in centimetres both come out the same size.
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3(), centre = new THREE.Vector3();
  box.getSize(size); box.getCenter(centre);
  root.position.sub(centre);
  const pivot = new THREE.Group();
  pivot.add(root);
  pivot.scale.setScalar(1 / size.y);
  scene.add(pivot);

  const cam = new THREE.PerspectiveCamera(24, 1, 0.01, 100);
  cam.position.set(0, 0, 4.4);
  cam.lookAt(0, 0, 0);

  const frames = [];
  for (let i = 0; i < FRAMES; i++) {
    pivot.rotation.y = (i / FRAMES) * Math.PI * 2;
    renderer.render(scene, cam);
    frames.push(renderer.domElement.toDataURL("image/png"));
  }
  report({ ok: true, frames, height: size.y, width: size.x });
} catch (e) {
  report({ ok: false, error: String(e && e.message || e) });
}
</script></body></html>`;

const pagePath = resolve(out, "_bake.html");
writeFileSync(pagePath, page);

console.log(`rendering ${FRAMES} frames from ${model} …`);
const dom = execFileSync(CHROME, [
  "--headless", "--disable-gpu", "--enable-unsafe-swiftshader", "--use-gl=swiftshader",
  "--allow-file-access-from-files", "--virtual-time-budget=120000",
  "--dump-dom", `file://${pagePath}`,
], { maxBuffer: 1024 * 1024 * 400 }).toString();

const m = dom.match(/<pre id="out">([\s\S]*?)<\/pre>/);
if (!m) { console.error("no output — the page never finished. Is the model path right?"); process.exit(1); }
const result = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&"));
if (!result.ok) { console.error("render failed:", result.error); process.exit(1); }

result.frames.forEach((dataUrl, i) => {
  const png = resolve(out, `frame-${String(i).padStart(2, "0")}.png`);
  writeFileSync(png, Buffer.from(dataUrl.split(",")[1], "base64"));
});

// sips is on every Mac, so this needs nothing installed. Trimmed to the width the panel actually renders
// at on a phone, times two for retina.
for (let i = 0; i < result.frames.length; i++) {
  const f = resolve(out, `frame-${String(i).padStart(2, "0")}.png`);
  execFileSync("sips", ["-Z", "760", f], { stdio: "ignore" });
}
console.log(`wrote ${result.frames.length} frames to public/body/ (model was ${result.width.toFixed(2)} x ${result.height.toFixed(2)} units)`);
