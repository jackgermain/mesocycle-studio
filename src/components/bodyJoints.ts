// Written by scripts/bake-body.mjs from tools/body-model/makehuman-base.obj. Do not edit by hand -- rerun it.
//
// Where the joints are on the model the body picker's pictures are rendered from, in body space: x toward
// the viewer's right at yaw 0, y down, z toward the camera. The tap areas in bodyModel.ts are built from
// these, which is what keeps a tap on the knee in the picture on the knee.

export const FRAME_COUNT = 36;

export const JOINTS = {
  headTop: [0, -82.1, 3.5],
  head: [0, -67.4, 4.1],
  neck: [0, -58.3, 0.7],
  spine1: [0, -38.2, -5],
  spine2: [0, -25.3, -3],
  spine3: [0, -19.9, -2.2],
  spine4: [0, -14.7, -3],
  pelvis: [0, -7.2, 0],
  rClavicle: [-2.1, -51.3, 1.7],
  rShoulder: [-19.5, -48.6, 1.3],
  rElbow: [-35.7, -30.8, 1.1],
  rWrist: [-48.4, -18.7, 19.2],
  rHip: [-10.1, -6.4, -1],
  rKnee: [-13.4, 33.2, 2.1],
  rAnkle: [-18.6, 74.8, 1],
  rMidfoot: [-19, 80.7, 12.9],
  rToes: [-19, 80.4, 20.6],
  lClavicle: [2.1, -51.3, 1.7],
  lShoulder: [19.5, -48.6, 1.3],
  lElbow: [35.7, -30.8, 1.1],
  lWrist: [48.4, -18.7, 19.2],
  lHip: [10.1, -6.4, -1],
  lKnee: [13.4, 33.2, 2.1],
  lAnkle: [18.6, 74.8, 1],
  lMidfoot: [19, 80.7, 12.9],
  lToes: [19, 80.4, 20.6],
} as const;
