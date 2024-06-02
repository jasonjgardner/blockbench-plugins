import { registry, setups } from "../../constants";
import { three as THREE } from "../../deps";
import { applyPbrMaterial } from "../applyPbrMaterial";

setups.push(() => {
  registry.exposureSlider = new BarSlider("display_settings_exposure", {
    category: "preview",
    name: "Exposure",
    description: "Adjusts the exposure of the scene",
    type: "number",
    value: 1,
    icon: "exposure",
    step: 0.1,
    min: -2,
    max: 2,
    // condition: () => Number(tonemappingSelect.get()) !== THREE.NoToneMapping,
    onBefore() {
      if (Number(registry.tonemappingSelect?.get()) === THREE.NoToneMapping) {
        // @ts-expect-error `.change()` does not require an Event for its value
        tonemappingSelect.change(THREE.LinearToneMapping.toString());
      }
      // @ts-expect-error Set method exists on the toggle
      registry.togglePbr?.set(true);
    },
    onChange({ value }) {
      const exposureValue = Math.max(-2, Math.min(2, Number(value)));
      Preview.all.forEach((preview) => {
        preview.renderer.toneMappingExposure = exposureValue;
      });

      Preview.selected.renderer.toneMappingExposure = exposureValue;
    },
    onAfter() {
      applyPbrMaterial();
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
      [THREE.NoToneMapping]: "None",
      [THREE.LinearToneMapping]: "Linear",
      [THREE.ReinhardToneMapping]: "Reinhard",
      [THREE.CineonToneMapping]: "Cineon",
      [THREE.ACESFilmicToneMapping]: "ACES",
    },
    onChange({ value }) {
      const currentExposure = Number(registry.exposureSlider?.get() ?? 1);
      Preview.all.forEach((preview) => {
        preview.renderer.toneMapping = Number(value) as THREE.ToneMapping;
        preview.renderer.toneMappingExposure = currentExposure;
      });

      Preview.selected.renderer.toneMapping = Number(
        value,
      ) as THREE.ToneMapping;
      Preview.selected.renderer.toneMappingExposure = currentExposure;

      Blockbench.showQuickMessage(
        `Tone mapping set to ${this.getNameFor(value)}`,
        2000,
      );

      if (registry.togglePbr && !registry.togglePbr.value) {
        registry.togglePbr.set(true);
      }

      applyPbrMaterial();
    },
  });
});
