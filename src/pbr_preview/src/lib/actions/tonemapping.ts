import { registry, setups } from "../../constants";
import { three as THREE } from "../../deps";
import {
  applyPbrMaterial,
  debounceApplyPbrMaterial,
} from "../applyPbrMaterial";
import type { PbrProject } from "../../types";

const setPreviewExposure = (value: number) => {
  const exposureValue = Math.max(-2, Math.min(2, value));
  Preview.all.forEach((preview) => {
    preview.renderer.toneMappingExposure = exposureValue;
  });

  Preview.selected.renderer.toneMappingExposure = exposureValue;
};

setups.push(() => {
  registry.exposureSlider = new NumSlider("display_settings_exposure", {
    category: "preview",
    name: "Exposure",
    description: "Adjusts the exposure of the scene",
    type: "number",
    value: 1,
    icon: "exposure",
    settings: {
      min: -2,
      max: 2,
      step: 0.01,
      default: 1,
    },
    // condition: () => Number(tonemappingSelect.get()) !== THREE.NoToneMapping,
    onBefore() {
      if (Number(registry.tonemappingSelect?.get()) === THREE.NoToneMapping) {
        // @ts-expect-error `.change()` does not require an Event for its value
        registry.tonemappingSelect.change(THREE.LinearToneMapping.toString());
      }
      // @ts-expect-error Set method exists on the toggle
      registry.togglePbr?.set(true);
    },
    onChange(value) {
      setPreviewExposure(Number(value));
    },
    onAfter() {
      debounceApplyPbrMaterial();
    },
  });

  registry.resetExposureButton = new Action("display_settings_reset_exposure", {
    category: "preview",
    name: "Reset Exposure",
    description: "Resets the exposure of the scene",
    icon: "exposure_plus_1",
    condition: () =>
      registry.exposureSlider !== undefined &&
      Number(registry.exposureSlider?.get()) !== 1,
    click() {
      setPreviewExposure(1);
      registry.exposureSlider?.setValue(1, true);

      debounceApplyPbrMaterial();
    },
  });

  registry.tonemappingSelect = new BarSelect("display_settings_tone_mapping", {
    category: "preview",
    name: "Tone Mapping",
    description: "Changes the tone mapping of the preview",
    type: "select",
    default_value: THREE.NoToneMapping,
    value: Preview.selected.renderer.toneMapping ?? THREE.NoToneMapping,
    icon: "monochrome_photos",
    options: {
      [THREE.NoToneMapping]: "No Tone Mapping",
      [THREE.LinearToneMapping]: "Linear",
      [THREE.ReinhardToneMapping]: "Reinhard",
      [THREE.CineonToneMapping]: "Cineon",
      [THREE.ACESFilmicToneMapping]: "ACES",
    },
    onChange({ value }) {
      Preview.selected.renderer.toneMapping = Number(
        value
      ) as THREE.ToneMapping;

      let currentExposure = 1;
      if (Preview.selected.renderer.toneMapping === THREE.NoToneMapping) {
        registry.exposureSlider?.setValue(currentExposure, true);
      } else {
        currentExposure = Number(registry.exposureSlider?.get() ?? 1);
      }

      Preview.all.forEach((preview) => {
        preview.renderer.toneMapping = Number(value) as THREE.ToneMapping;
        preview.renderer.toneMappingExposure = currentExposure;
      });

      Preview.selected.renderer.toneMappingExposure = currentExposure;

      Blockbench.showQuickMessage(
        `Tone mapping set to ${this.getNameFor(value)}`,
        2000
      );

      if (registry.togglePbr && !registry.togglePbr.value) {
        registry.togglePbr.set(true);
      }

      applyPbrMaterial();
    },
  });

  // Select between different types of THREE.js materials: MeshStandardMaterial, MeshPhysicalMaterial, MeshPhongMaterial, MeshToonMaterial, etc.
  registry.pbrShaderMode = new BarSelect("display_settings_pbr_shader", {
    category: "preview",
    name: "PBR Shader",
    description: "Changes the shader used for PBR materials",
    type: "select",
    default_value: "MeshStandardMaterial",
    value: "MeshStandardMaterial",
    icon: "style",
    options: {
      Blockbench: "Blockbench",
      MeshBasicMaterial: "Basic",
      MeshLambertMaterial: "Lambert",
      MeshPhongMaterial: "Phong",
      MeshStandardMaterial: "Standard",
      MeshPhysicalMaterial: "Physical",
      MeshToonMaterial: "Toon",
      MeshNormalMaterial: "Normal",
      MeshDepthMaterial: "Depth",
    },
    onChange({ value }) {
      (Project as PbrProject).pbr_shader = value;
      Blockbench.showQuickMessage(
        `PBR Shader set to ${this.getNameFor(value)}`,
        2000
      );

      applyPbrMaterial();
    },
  });
});
