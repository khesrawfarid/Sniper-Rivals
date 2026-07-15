import { Document, NodeIO } from '@gltf-transform/core';
import fs from 'fs';

const io = new NodeIO();
const doc = await io.read('public/1v1_map_optimized.glb');

const root = doc.getRoot();
const nodes = root.listNodes();
let hasScale = false;
for (const node of nodes) {
  const scale = node.getScale();
  if (scale[0] !== 1 || scale[1] !== 1 || scale[2] !== 1) {
    console.log("Node scale:", node.getName(), scale);
    hasScale = true;
  }
}
if (!hasScale) console.log("No non-uniform/non-1 scales found.");
