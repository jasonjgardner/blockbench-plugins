import { three as THREE } from "../deps";
import PbrMaterial from "./PbrMaterials";
import { debounce } from "./util";

function applyToFace(
  face: CubeFace | MeshFace,
  materialParams: THREE.MeshStandardMaterialParameters
) {
  const texture = face.getTexture();

  if (!texture || !face.enabled || !Project) {
    return false;
  }

  const projectMaterial = Project.materials[texture.uuid];

  if (projectMaterial.isShaderMaterial && !Project.bb_materials[texture.uuid]) {
    Project.bb_materials[texture.uuid] = projectMaterial;
  }

  const material = new PbrMaterial(
    texture.layers_enabled
      ? texture.layers.filter((layer) => layer.visible) ?? null
      : Project.textures,
    texture.uuid
  ).getMaterial(materialParams);

  material.side = Canvas.getRenderSide(texture) as THREE.Side;

  Project.materials[texture.uuid] = THREE.ShaderMaterial.prototype.copy.call(
    material,
    projectMaterial
  );

  Canvas.updateAllFaces(texture);

  return true;
}

function applyToMesh(
  mesh: Mesh,
  materialParams: THREE.MeshStandardMaterialParameters
) {
  mesh.forAllFaces((face) => applyToFace(face, materialParams));
  return true;
}

function applyToCube(
  cube: Cube,
  materialParams: THREE.MeshStandardMaterialParameters
) {
  let materialsSet = false;

  Object.keys(cube.faces).forEach((key) => {
    const face = cube.faces[key];

    if (applyToFace(face, materialParams)) {
      materialsSet = true;
    }
  });

  return materialsSet;
}

/**
 * ### Apply PBR Material
 * Iterates over all faces in the project and applies a PBR material to each face
 * @param materialParams Parameters to extend the base material with
 * @returns `THREE.MeshStandardMaterial` with PBR textures applied
 */
export const applyPbrMaterial = (
  materialParams: THREE.MeshStandardMaterialParameters = {}
) => {
  // Don't overwrite placeholder material in Edit and Paint mode
  if (!Project || Texture.all.length === 0) {
    return;
  }

  let materialsSet = false;

  Project.elements.forEach((item) => {
    if (item instanceof Mesh && applyToMesh(item, materialParams)) {
      materialsSet = true;
      return;
    }

    if (item instanceof Cube && applyToCube(item, materialParams)) {
      materialsSet = true;
    }
  });

  Project.pbr_active = materialsSet;
};

export const debounceApplyPbrMaterial = (wait = 100) =>
  debounce(applyPbrMaterial, wait);
