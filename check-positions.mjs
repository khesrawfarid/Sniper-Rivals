import { Document, NodeIO } from '@gltf-transform/core';

const io = new NodeIO();
const doc = await io.read('public/1v1_map_optimized.glb');
for (const n of doc.getRoot().listNodes()) {
  if (n.getMesh()) console.log(n.getName(), n.getTranslation(), n.getScale());
}
