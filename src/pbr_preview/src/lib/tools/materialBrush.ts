import { registry, CHANNELS, setups, teardowns } from "../../constants";
import { applyPbrMaterial } from "../applyPbrMaterial";
import { MaterialBrush } from "../MaterialBrush";

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
        texture.layers.find(({ channel }) => channel === CHANNELS.height.id) !==
        undefined
      );
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
          if (!layer.visible || !matChannels.includes(layer.channel)) {
            return;
          }

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
