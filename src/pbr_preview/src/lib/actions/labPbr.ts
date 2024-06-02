import { registry, setups, teardowns } from "../../constants";
import PbrMaterial from "../PbrMaterials";

const exportNormalMap = (normalMap: HTMLCanvasElement) => {
  normalMap.toBlob(async (blob) => {
    if (!blob) {
      return;
    }

    Blockbench.export({
      content: await blob.arrayBuffer(),
      type: "PNG",
      name: "normal_map",
      extensions: ["png"],
      resource_id: "normal_map",
      savetype: "image",
    });
  });
};

const exportSpecularMap = (specularMap: HTMLCanvasElement) => {
  specularMap.toBlob(async (blob) => {
    if (!blob) {
      return;
    }

    Blockbench.export({
      content: await blob.arrayBuffer(),
      type: "PNG",
      name: "specular_map",
      extensions: ["png"],
      resource_id: "specular_map",
      savetype: "image",
    });
  });
};

setups.push(() => {
  registry.generateLabPbr = new Action("generate_lab_pbr", {
    icon: "beaker",
    name: "Generate labPBR textures",
    description:
      "Generate a specular and normal map in labPBR format for Java shaders",
    condition: {
        formats: ["java_block"],
        project: true,
    },
    async click() {
      const selected = Project.selected_texture;
      if (!selected) {
        return;
      }
      const mat = new PbrMaterial(
        selected.layers_enabled ? selected.layers : [selected],
        selected.uuid,
      );
      const outputs = mat.createLabPbrOutput();

      if (outputs === null) {
        return;
      }

      await Promise.all([
        exportNormalMap(outputs.normalMap),
        exportSpecularMap(outputs.specular),
      ]);

      Blockbench.showQuickMessage("Exported labPBR textures");
    },
  });

  MenuBar.addAction(registry.generateLabPbr, "file.export");
});

teardowns.push(() => {
  MenuBar.removeAction("file.export.generate_lab_pbr");
});
