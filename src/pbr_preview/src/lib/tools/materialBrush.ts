import type { IChannel } from "../../types";
import { registry, CHANNELS, setups, teardowns } from "../../constants";
import {
  applyPbrMaterial,
  debounceApplyPbrMaterial,
} from "../applyPbrMaterial";
import { MaterialBrush } from "../MaterialBrush";
import { vue as Vue, three as THREE } from "../../deps";
import { getSelectedTexture, generatePreviewImage } from "../util";

const STORAGE_NAMESPACE = "materialBrushPresets";

const getPresets = () => {
  return JSON.parse(localStorage.getItem(STORAGE_NAMESPACE) || "{}");
};

const savePreset = (name?: string, id?: string) => {
  const presets = getPresets();
  const uuid = id ?? guid();
  const results = registry.userMaterialBrushPresets?.getFormResult() ?? {};
  const settings = {};

  if (results.albedo) {
    settings.albedo = results.albedo.toString();
  }

  if (results.metalness) {
    settings.metalness = Number(results.metalness);
  }

  if (results.roughness) {
    settings.roughness = Number(results.roughness);
  }

  if (results.emissive) {
    settings.emissive = results.emissive.toString();
  }

  if (results.height) {
    settings.height = Number(results.height);
  }

  presets[uuid] = [
    settings,
    name ?? "New Preset",
    generatePreviewImage(settings),
  ];

  localStorage.setItem(STORAGE_NAMESPACE, JSON.stringify(presets));

  return uuid;
};

const applyPreset = ({
  metalness,
  roughness,
  emissive,
  height,
  albedo,
}: {
  metalness?: number;
  roughness?: number;
  emissive?: string;
  height?: number;
  albedo?: string;
}) => {
  if (metalness !== undefined) {
    registry.brushMetalnessSlider?.setValue(metalness || 0, true);
  }

  if (roughness !== undefined) {
    registry.brushRoughnessSlider?.setValue(roughness ?? 1, true);
  }

  if (emissive !== undefined) {
    registry.brushEmissiveColor?.set(emissive ?? "#000000");
  }

  if (height !== undefined) {
    registry.brushHeightSlider?.setValue(
      Math.max(0, Math.min(1, height ?? 0.5)),
      true
    );
  }

  if (albedo !== undefined) {
    // @ts-expect-error ColorPanel global is not typed
    ColorPanel.set(albedo);
  }
};

const materialBrushSliderCondition = ({ id }: IChannel) =>
  Condition({
    project: true,
    tools: ["material_brush"],
    method() {
      const texture = getSelectedTexture();

      return (
        (texture?.layers_enabled &&
          texture.layers.find(({ channel }) => channel && channel === id) !==
            undefined) === true
      );
    },
  });

const userPresetsDialogComponent = Vue.extend({
  name: "UserPresetsDialog",
  data(): {
    userPresets: Record<string, [Record<string, number | string>, string]>;
    channels: typeof CHANNELS;
  } {
    return {
      userPresets: {},
      channels: CHANNELS,
    };
  },
  methods: {
    applyPreset(preset: string) {
      try {
        const [settings, name] = this.userPresets[preset];

        const { metalness, roughness, emissive, height, albedo } = settings;

        applyPreset({
          metalness: Number(metalness),
          roughness: Number(roughness),
          emissive: emissive.toString(),
          height: Number(height),
          albedo: albedo.toString(),
        });

        registry.userMaterialBrushPresets?.hide();
        Blockbench.showQuickMessage(`Preset "${name}" applied`, 2000);
      } catch {
        Blockbench.showQuickMessage("Failed to apply preset", 2000);
      }
    },
    deletePreset(preset: string) {
      Blockbench.showMessageBox(
        {
          title: "Delete Preset",
          message: "Are you sure you want to delete this preset?",
          confirm: 1,
          cancel: 0,
          buttons: ["Cancel", "Delete"],
          checkboxes: {},
          width: 400,
        },
        (btn) => {
          if (btn) {
            const presets = getPresets();
            const friendlyName = this.userPresets[preset][1] ?? preset;

            delete presets[preset];

            localStorage.setItem(
              "materialBrushPresets",
              JSON.stringify(presets)
            );

            this.userPresets = presets;

            Blockbench.showQuickMessage(
              `Preset "${friendlyName}" deleted`,
              2000
            );
          }
        }
      );
    },
    editPreset(preset: string) {
      registry.userMaterialBrushPresets?.setFormValues({
        name: this.userPresets[preset][1] ?? preset,
        ...this.userPresets[preset][0],
      });
    },
    getSummary(settings: Record<string, number | string>) {
      return Object.entries(settings)
        .filter(([channel]) => channel in this.channels)
        .map(([channel, value]) => {
          if (channel === "albedo" || channel === "emissive") {
            return `${this.channels[channel]?.label ?? channel}: ${value}`;
          }

          return `${this.channels[channel]?.label ?? channel}: ${Number(value).toFixed(1)}`;
        })
        .join("\n");
    },
  },
  computed: {
    presets() {
      return Object.entries(this.userPresets);
    },
  },
  mounted() {
    this.userPresets = getPresets();
  },
  template: /* html */ `
    <div>
      <ul class="list mobile_scrollbar preset_list">
        <li
          v-for="([key, [settings, name, image]]) in presets"
          :key="key"
          class="user_preset"
        >
          <div v-if="image" class="preset_preview" @click="editPreset(key)">
            <img :src="image" :alt="name" :title="getSummary(settings)" width="96" height="96" />
            <div class="preset_title">{{ name }}</div>
          </div>
          <div v-else>
            <div class="preset_title" @click="editPreset(key)" :title="getSummary(settings)">{{ name }}</div>
          </div>
          <div class="preset_buttons">
            <button class="delete_preset" type="button" @click="deletePreset(key)">
              <i class="material-icons">close</i>
            </button>
          </div>
        </li>
      </ul>
    </div>`,
});

setups.push(() => {
  registry.materialBrushStyles = Blockbench.addCSS(/* css */ `
  .preset_list {
    display: grid;
    grid-template-columns: repeat(auto-fill, 96px);
    grid-gap: 8px;
    justify-content: start;
    align-items: start;
    margin: 0 auto;
    padding: 8px;
  }

  .user_preset {
    display: flex;
    justify-content: start;
    align-items: center;
    width: 100%;
    padding: 8px;
    position: relative;
  }

  .preset_title {
    font-size: 1em;
    color: var(--color-text);
  }

  .user_preset:hover .preset_title {
    color: var(--color-accent);
  }

  .preset_preview {
    display: flex;
    flex-direction: column;
    flex-wrap: nowrap;
    justify-content: center;
    align-items: center;
    text-align: center;
  }

  .preset_buttons {
    display: flex;
    flex-direction: row;
    align-items: center;
    font-size: 0.8em;
    padding: 0 4px;
  }

  .preset_channel {
    display: flex;
    flex-direction: row;
    align-items: center;
    margin: 0 8px;
    font-size: 0.8em;
  }

  .delete_preset {
    margin-left: 8px;
    padding: 4px;
    height: 24px;
    width: 24px;
    min-width: 24px;
    background-color: transparent;
    color: var(--color-text);
    border: none;
    border-radius: 100%;
    position: absolute;
    right: -8px;
    top: 0;
    filter: drop-shadow(0 0 2px var(--color-shadow));
  }

  .delete_preset:hover {
    background: transparent;
    color: var(--color-accent);
  }

  .delete_preset .material-icons {
    font-size: 0.825em;
  }

  .delete_preset:hover .material-icons {
    color: var(--color-accent);
  }`);

  registry.brushMetalnessSlider = new NumSlider("slider_brush_metalness", {
    category: "paint",
    name: "Metalness",
    description: "Adjust the metalness of the brush",
    tool_setting: "brush_metalness",
    settings: {
      min: 0,
      max: 1,
      step: 0.01,
      default: 0,
    },
    condition: () => materialBrushSliderCondition(CHANNELS.metalness),
  });

  registry.brushRoughnessSlider = new NumSlider("slider_brush_roughness", {
    category: "paint",
    name: "Roughness",
    description: "Adjust the roughness of the brush",
    tool_setting: "brush_roughness",
    settings: {
      min: 0,
      max: 1,
      step: 0.01,
      default: 1,
    },
    condition: () => materialBrushSliderCondition(CHANNELS.roughness),
  });

  registry.brushEmissiveColor = new ColorPicker("brush_emissive_color", {
    category: "paint",
    name: "Emissive",
    description: "Adjust the emissive color of the brush",
    value: "#000000",
    tool_setting: "brush_emissive",
    condition: () => materialBrushSliderCondition(CHANNELS.emissive),
  });

  registry.brushHeightSlider = new NumSlider("slider_brush_height", {
    category: "paint",
    name: "Height",
    description: "Adjust the height of the brush",
    tool_setting: "brush_height",
    settings: {
      min: 0,
      max: 1,
      step: 0.01,
      default: 0.5,
    },
    condition: () => materialBrushSliderCondition(CHANNELS.height),
  });

  registry.materialBrushTool = new Tool("material_brush", {
    name: "Material Brush",
    description: "Paints across multiple texture layers",
    icon: "view_in_ar",
    paintTool: true,
    cursor: "cell",
    category: "tools",
    toolbar: "brush",
    condition: {
      project: true,
      selected: {
        texture: true,
      },
      modes: ["paint"],
      method() {
        return getSelectedTexture()?.layers_enabled ?? false;
      },
    },
    allowed_view_modes: "textured",
    tool_settings: {
      brush_metalness: 0,
      brush_roughness: 1,
      brush_emissive: "#000000",
      brush_height: 0.5,
    },
    brush: {
      blend_modes: false,
      shapes: true,
      size: true,
      softness: true,
      opacity: true,
      offset_even_radius: true,
      floor_coordinates: true,
      changePixel(
        pxX, // Pixel that is changing
        pxY,
        px,
        alpha,
        { size, softness, texture, x, y }
      ) {
        const mat = MaterialBrush.fromSettings();

        const matChannels = Object.keys(mat.colors);

        const brushSize = Math.floor(size - (softness * size) / 100);

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

          const distance = Math.sqrt((x - pxX) ** 2 + (y - pxY) ** 2);
          const fallOff = Math.min(1, distance / brushSize);

          // Transition colors at soft edges
          if (x % brushSize <= fallOff && y % brushSize <= fallOff) {
            const currentPixel = layer.ctx.getImageData(pxX, pxY, 1, 1).data;
            const currentFill = new THREE.Color(
              `rgb(${currentPixel[0]}, ${currentPixel[1]}, ${currentPixel[2]})`
            );

            // Set the fill color to the lerp between the current pixel and the new color
            fill.lerp(currentFill, 1);
          }

          layer.ctx.fillStyle = fill.getStyle();
          layer.ctx.fillRect(pxX, pxY, 1, 1);

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
      onStrokeStart({ texture }) {
        Undo.initEdit({
          layers: texture.layers,
        });

        return true;
      },
      onStrokeEnd({ texture }) {
        Undo.finishEdit("Material Brush Stroke");

        return true;
      },
    },
    onCanvasClick(data: any) {
      Painter.startPaintToolCanvas(data, data.event);
    },
    onSelect() {
      Painter.updateNslideValues();
      applyPbrMaterial();
    },
    click() {
      debounceApplyPbrMaterial();
    },
  });

  registry.loadBrushPreset = new Action("load_brush_preset", {
    icon: "stroke_full",
    name: "Material Brush Presets",
    description: "Load or save a brush preset",
    category: "paint",
    condition: {
      project: true,
    },
    click() {
      registry.userMaterialBrushPresets = new Dialog("user_brush_presets", {
        id: "user_brush_presets",
        title: "Edit Material Brush",
        component: userPresetsDialogComponent,
        part_order: ["lines", "component", "form"],
        form: {
          albedo: {
            type: "color",
            label: "Albedo",
            value: ColorPanel.get(),
            toggle_enabled: true,
          },
          metalness: {
            type: "number",
            label: "Metalness",
            min: 0,
            max: 1,
            step: 0.01,
            full_width: false,
            toggle_enabled: true,
          },
          roughness: {
            type: "number",
            label: "Roughness",
            min: 0,
            max: 1,
            step: 0.01,
            toggle_enabled: true,
            full_width: false,
          },
          emissive: {
            type: "color",
            label: "Emissive",
            value: "#000000",
            toggle_enabled: true,
          },
          height: {
            type: "number",
            label: "Height",
            min: 0,
            max: 1,
            step: 0.01,
            toggle_enabled: true,
          },
        },
        onConfirm(formResult) {
          applyPreset({
            metalness: Number(
              formResult.metalness ?? registry.brushMetalnessSlider?.get()
            ),
            roughness: Number(
              formResult.roughness ?? registry.brushRoughnessSlider?.get()
            ),
            emissive: (
              formResult.emissive ?? registry.brushEmissiveColor?.get()
            ).toString(),
            height: Number(
              formResult.height ?? registry.brushHeightSlider?.get()
            ),
            albedo: (formResult.albedo ?? ColorPanel.get()).toString(),
          });
        },
        buttons: ["Close", "Save", "Apply"],
        cancelIndex: 0,
        confirmIndex: 2,
        onButton(idx, event) {
          registry.materialBrushTool?.select();

          if (idx !== 1) {
            return;
          }

          Blockbench.textPrompt("Save Preset", "New Preset", (name) => {
            if (name) {
              savePreset(name);
              Blockbench.showQuickMessage(`Preset "${name}" saved`, 2000);
            }
          });
        },
      }).show();
    },
  });

  MenuBar.addAction(registry.materialBrushTool, "tools.0");
});
teardowns.push(() => {
  MenuBar.removeAction("tools.material_brush");
});
