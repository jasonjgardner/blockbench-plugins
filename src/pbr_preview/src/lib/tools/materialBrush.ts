import { registry, CHANNELS, setups, teardowns } from "../../constants";
import { applyPbrMaterial } from "../applyPbrMaterial";
import { MaterialBrush } from "../MaterialBrush";

const presets: Record<string, () => void> = {
  matte: () => {
    registry.brushMetalnessSlider?.setValue(0, true);
    registry.brushRoughnessSlider?.setValue(1, true);
    registry.brushEmissiveColor?.set("#000000");
    registry.brushHeightSlider?.setValue(0.5, true);
  },
  gloss: () => {
    registry.brushMetalnessSlider?.setValue(0, true);
    registry.brushRoughnessSlider?.setValue(0.5, true);
    registry.brushEmissiveColor?.set("#000000");
    registry.brushHeightSlider?.setValue(0.5, true);
  },
  metal: () => {
    registry.brushMetalnessSlider?.setValue(1, true);
    registry.brushRoughnessSlider?.setValue(0.5, true);
    registry.brushEmissiveColor?.set("#000000");
    registry.brushHeightSlider?.setValue(0.5, true);
  },
  polished: () => {
    registry.brushMetalnessSlider?.setValue(1, true);
    registry.brushRoughnessSlider?.setValue(0.1, true);
    registry.brushEmissiveColor?.set("#000000");
    registry.brushHeightSlider?.setValue(0.5, true);
  },
  glowing: () => {
    registry.brushMetalnessSlider?.setValue(0, true);
    registry.brushRoughnessSlider?.setValue(0.5, true);
    registry.brushEmissiveColor?.set("#00ff00");
    registry.brushHeightSlider?.setValue(0.5, true);
  },
};

const applyPreset = (preset: string) => {
  presets[preset]();
  //   applyPbrMaterial();
};

setups.push(() => {
  registry.brushMetalnessSlider = new NumSlider("slider_brush_metalness", {
    category: "paint",
    name: "Metalness",
    description: "Adjust the metalness of the brush",
    settings: {
      min: 0,
      max: 1,
      step: 0.01,
      default: 0,
    },
    condition: () => {
      if (!Project) {
        return false;
      }

      const texture = Project.selected_texture;

      if (!texture?.layers_enabled) {
        return false;
      }

      return (
        texture.layers.find(
          // @ts-expect-error Channel property is an extension of TextureLayer
          ({ channel }) => channel === CHANNELS.metalness.id,
        ) !== undefined
      );
    },
  });

  registry.brushRoughnessSlider = new NumSlider("slider_brush_roughness", {
    category: "paint",
    name: "Roughness",
    description: "Adjust the roughness of the brush",
    settings: {
      min: 0,
      max: 1,
      step: 0.01,
      default: 1,
    },
    condition: () => {
      if (!Project) {
        return false;
      }

      const texture = Project.selected_texture;

      if (!texture?.layers_enabled) {
        return false;
      }

      return (
        texture.layers.find(
          // @ts-expect-error Channel property is an extension of TextureLayer
          ({ channel }) => channel === CHANNELS.roughness.id,
        ) !== undefined
      );
    },
  });

  registry.brushEmissiveColor = new ColorPicker("brush_emissive_color", {
    category: "paint",
    name: "Emissive",
    description: "Adjust the emissive color of the brush",
    value: "#000000",
    condition: () => {
      if (!Project) {
        return false;
      }

      const texture = Project.selected_texture;

      if (!texture?.layers_enabled) {
        return false;
      }

      return (
        texture.layers.find(
          // @ts-expect-error Channel property is an extension of TextureLayer
          ({ channel }) => channel === CHANNELS.emissive.id,
        ) !== undefined
      );
    },
  });

  registry.brushHeightSlider = new NumSlider("slider_brush_height", {
    category: "paint",
    name: "Height",
    description: "Adjust the height of the brush",
    settings: {
      min: 0,
      max: 1,
      step: 0.01,
      default: 0.5,
    },
    condition: () => {
      if (!Project) {
        return false;
      }

      const texture = Project.selected_texture;

      if (!texture?.layers_enabled) {
        return false;
      }

      return (
        // @ts-expect-error Channel property is an extension of TextureLayer
        texture.layers.find(({ channel }) => channel === CHANNELS.height.id) !==
        undefined
      );
    },
  });

  registry.materialBrushPresets = new BarSelect("brush_presets", {
    category: "paint",
    name: "Material Brush Presets",
    description: "Select a preset for the material brush",
    options: {
      matte: "Matte",
      gloss: "Gloss",
      metal: "Dull Metal",
      polished: "Polished Metal",
      glowing: "Glowing",
    },
    onChange({ value }) {
      applyPreset(value);
      registry.materialBrushTool?.select();
      applyPbrMaterial();
    },
  });

  registry.materialBrushTool = new Tool("material_brush", {
    name: "Material Brush",
    description: "Paints across multiple texture layers",
    icon: "view_in_ar",
    paintTool: true,
    cursor: "cell",
    condition: () =>
      Modes.paint &&
      !!Project &&
      Project.selected_texture &&
      Project.selected_texture.layers_enabled,
    brush: {
      blend_modes: false,
      shapes: true,
      size: true,
      softness: true,
      opacity: true,
      offset_even_radius: true,
      floor_coordinates: true,
      changePixel(x, y, px, alpha, { size, softness, texture }) {
        const mat = MaterialBrush.fromSettings();

        const matChannels = Object.keys(mat.colors);

        let rgba = px;

        texture.layers.forEach((layer) => {
          // @ts-expect-error Channel property is an extension of TextureLayer
          if (!layer.visible || !matChannels.includes(layer.channel)) {
            return;
          }

          // @ts-expect-error Channel property is an extension of TextureLayer
          const fill = mat.getChannel(layer.channel);

          if (!fill) {
            return;
          }

          // TODO: Let softness affect the brush

          layer.ctx.fillStyle = fill.getStyle();
          layer.ctx.fillRect(size * x, size * y, size, size);

          if (layer.selected) {
            rgba = {
              r: fill.r * 255,
              g: fill.g * 255,
              b: fill.b * 255,
              a: alpha * 255,
            };
          }
        });

        return rgba;
      },
    },
    onCanvasClick(data: any) {
      Painter.startPaintToolCanvas(data, data.event);
    },
    onSelect() {
      applyPbrMaterial();
    },
    click() {
      applyPbrMaterial();
    },
  });

  MenuBar.addAction(registry.materialBrushTool, "tools.0");
});

teardowns.push(() => {
  MenuBar.removeAction("tools.material_brush");
});
