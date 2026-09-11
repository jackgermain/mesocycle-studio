// Written by scripts/bake-body.mjs from tools/body-model/makehuman-base.obj. Do not edit by hand -- rerun it.
//
// Where the joints are on the model the body picker's pictures are rendered from, in body space: x toward
// the viewer's right at yaw 0, y down, z toward the camera. The tap areas in bodyModel.ts are built from
// these, which is what keeps a tap on the knee in the picture on the knee.

export const FRAME_COUNT = 36;

export const JOINTS = {
  headTop: [0, -80.6, -0.6],
  head: [0, -66.7, 0.2],
  neck: [0, -56, -0.7],
  spine1: [0, -40.8, -2.1],
  spine2: [0, -25.8, 1.1],
  spine3: [0, -16.7, 0],
  spine4: [0, -10, -2.4],
  pelvis: [0, -5.5, 0],
  rClavicle: [-2.6, -49.2, 5.4],
  rShoulder: [-16.4, -49.7, 0],
  rElbow: [-30.6, -32.6, -0.1],
  rWrist: [-42.2, -22.4, 15.8],
  rHip: [-10.8, -3.2, -0.2],
  rKnee: [-15.5, 37.7, 1.7],
  rAnkle: [-21.5, 74.5, -1.5],
  rMidfoot: [-21.5, 80.9, 10.4],
  rToes: [-21.5, 80.1, 18.5],
  lClavicle: [2.6, -49.2, 5.4],
  lShoulder: [16.4, -49.7, 0],
  lElbow: [30.6, -32.6, -0.1],
  lWrist: [42.2, -22.4, 15.8],
  lHip: [10.8, -3.2, -0.2],
  lKnee: [15.5, 37.7, 1.7],
  lAnkle: [21.5, 74.5, -1.5],
  lMidfoot: [21.5, 80.9, 10.4],
  lToes: [21.5, 80.1, 18.5],
} as const;
