import { Document, NodeIO, bounds } from '@gltf-transform/core';

const io = new NodeIO();
const doc = await io.read('public/1v1_map_optimized.glb');
const scene = doc.getRoot().getDefaultScene();
const b = bounds(scene);
console.log("Bounds:", b);
