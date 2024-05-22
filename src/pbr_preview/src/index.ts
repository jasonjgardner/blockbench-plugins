/**
 * @author jasonjgardner
 * @discord jason.gardner
 * @github https://github.com/jasonjgardner
 */
/// <reference types="three" />
/// <reference path="../../../types/index.d.ts" />

interface IChannel {
  label: string;
  description: string;
  map: string;
  id: string;
}

(() => {
  const { MeshStandardMaterial } = THREE;

  let decodeMer: Action;
  let generateMer: Action;
  let generateNormal: Action;
  let pbrPreview: PbrPreview;
  let pbrMode: Mode;
  let pbrDisplaySetting: Setting;
  let displaySettingsPanel: Panel;
  let materialPanel: Panel;
  let styles: Deletable;
  let textureSetDialog: Dialog;

  const PLUGIN_ID = "pbr_preview";
  const PLUGIN_VERSION = "1.0.0";
  const NA_CHANNEL = "_NONE_";
  const CHANNELS: Record<string, IChannel> = {
    albedo: {
      id: "albedo",
      label: "Albedo",
      description: "The color of the material",
      map: "map",
    },
    metalness: {
      id: "metalness",
      label: "Metalness",
      description: "The material's metalness map",
      map: "metalnessMap",
    },
    emissive: {
      id: "emissive",
      label: "Emissive",
      description: "The material's emissive map",
      map: "emissiveMap",
    },
    roughness: {
      id: "roughness",
      label: "Roughness",
      description: "The material's roughness map",
      map: "roughnessMap",
    },
    height: {
      id: "height",
      label: "Height",
      description: "The material's height map",
      map: "bumpMap",
    },
    normal: {
      id: "normal",
      label: "Normal",
      description: "The material's normal map",
      map: "normalMap",
    },
    ao: {
      id: "ao",
      label: "Ambient Occlusion",
      description: "The material's ambient occlusion map",
      map: "aoMap",
    },
  };

  class PbrMaterial {
    static getMaterial(options: THREE.MeshStandardMaterialParameters = {}) {
      // const mer = PbrPreviewScene.decodeMer();

      const emissiveMap = PbrMaterial.getTexture("emissive");

      return new MeshStandardMaterial({
        map:
          PbrMaterial.getTexture("albedo") ??
          new THREE.CanvasTexture(
            Texture.all[0]?.canvas,
            undefined,
            undefined,
            undefined,
            THREE.NearestFilter,
            THREE.NearestFilter,
          ),
        aoMap: PbrMaterial.getTexture("ao"),
        normalMap: PbrMaterial.getTexture("normal"),
        roughnessMap: PbrMaterial.getTexture("roughness"),
        metalnessMap: PbrMaterial.getTexture("metalness"),
        bumpMap: PbrMaterial.getTexture("heightmap"),
        emissiveMap,
        emissiveIntensity: emissiveMap ? 1 : 0,
        emissive: emissiveMap ? 0xffffff : 0,
        envMap: PreviewScene.active?.cubemap ?? null,
        envMapIntensity: 1,
        alphaTest: 0.5,
        ...options,
      });
    }

    static projectId() {
      if (!Project) {
        return "default";
      }

      return (
        Project.save_path ??
        Project.model_identifier ??
        Project.uuid ??
        "default"
      );
    }

    static getProjectsData() {
      const projectsJson = localStorage.getItem(`${PLUGIN_ID}.pbr_textures`);
      return projectsJson ? JSON.parse(projectsJson) : {};
    }

    static getProjectData() {
      const id = PbrMaterial.projectId();
      const projects = PbrMaterial.getProjectsData();
      return projects[id] ?? {};
    }

    static saveTexture(name: string, src: string) {
      const projects = PbrMaterial.getProjectsData();
      const id = PbrMaterial.projectId();

      localStorage.setItem(
        `${PLUGIN_ID}.pbr_textures`,
        JSON.stringify({
          ...projects,
          [id]: {
            ...projects[id],
            [name]: src,
          },
        }),
      );
    }

    static removeTexture(name: string) {
      const id = PbrMaterial.projectId();
      const projects = PbrMaterial.getProjectsData();
      const projectData = PbrMaterial.getProjectData();

      delete projectData[name];

      localStorage.setItem(
        `${PLUGIN_ID}.pbr_textures`,
        JSON.stringify({
          ...projects,
          [id]: projectData,
        }),
      );
    }

    static findTexture(name: string): Texture | null {
      if (!Project) {
        return null;
      }

      const projectData = PbrMaterial.getProjectData();

      const filenameRegex = new RegExp(`_${name}(\.[^.]+)?$`, "i");
      return (
        Project.textures?.find(
          (t: Texture) =>
            projectData[name] === t.uuid ||
            (filenameRegex.test(t.name) && projectData[name] !== NA_CHANNEL),
        ) ?? null
      );
    }

    static getTexture(name: string) {
      const src = PbrMaterial.findTexture(name);

      if (!src) {
        return null;
      }

      const texture = new THREE.CanvasTexture(
        src.canvas,
        undefined,
        undefined,
        undefined,
        THREE.NearestFilter,
        THREE.NearestFilter,
      );

      texture.needsUpdate = true;

      return texture;
    }

    static extractChannel(texture: Texture, channel: "r" | "g" | "b" | "a") {
      const canvas = texture.canvas;
      const width = canvas.width;
      const height = canvas.height;

      const ctx = canvas.getContext("2d");

      if (!ctx) {
        return null;
      }

      const channelCanvas = document.createElement("canvas");
      channelCanvas.width = width;
      channelCanvas.height = height;

      const channelCtx = channelCanvas.getContext("2d");

      if (!channelCtx) {
        return null;
      }

      const channelIdx = { r: 0, g: 1, b: 2, a: 3 }[channel];

      const { data } = ctx.getImageData(0, 0, width, height);

      const channelData = new Uint8ClampedArray(width * height * 4);

      for (let idx = 0; idx < data.length; idx += 4) {
        channelData[idx] = data[idx + channelIdx];
        channelData[idx + 1] = data[idx + channelIdx];
        channelData[idx + 2] = data[idx + channelIdx];
        channelData[idx + 3] = 255;
      }

      const imageData = new ImageData(channelData, width, height);

      channelCtx.putImageData(imageData, 0, 0);

      return channelCanvas;
    }

    static decodeMer(emissiveThreshold = 25.5): {
      metalness?: HTMLCanvasElement | null;
      emissive?: HTMLCanvasElement | null;
      emissiveLevel?: HTMLCanvasElement | null;
      roughness?: HTMLCanvasElement | null;
      sss?: HTMLCanvasElement | null;
    } {
      const texture = PbrMaterial.findTexture("mer");

      if (!texture) {
        return {
          metalness: null,
          emissive: null,
          emissiveLevel: null,
          roughness: null,
          sss: null,
        };
      }

      const metalness = PbrMaterial.extractChannel(texture, "r");
      const emissiveLevel = PbrMaterial.extractChannel(texture, "g");
      const roughness = PbrMaterial.extractChannel(texture, "b");
      const sss = PbrMaterial.extractChannel(texture, "a");

      // Use emissiveLevel as mask for getting emissive color from albedo channel
      const albedo = PbrMaterial.findTexture(CHANNELS.albedo.id);
      const emissive = document.createElement("canvas");
      emissive.width = albedo?.width ?? texture.width;
      emissive.height = albedo?.height ?? texture.height;

      const emissiveCtx = emissive.getContext("2d");
      const emissiveLevelCtx = emissiveLevel?.getContext("2d");
      const albedoCtx = albedo?.canvas.getContext("2d");

      if (!emissiveCtx || !albedoCtx || !emissiveLevelCtx) {
        return {
          metalness,
          emissive: emissiveLevel,
          roughness,
          sss,
        };
      }

      // Write the albedo color to the emissive canvas where the emissive level is greater than a certain threshold
      const albedoData = albedoCtx.getImageData(
        0,
        0,
        emissive.width,
        emissive.height,
      );
      const emissiveLevelData = emissiveLevelCtx.getImageData(
        0,
        0,
        emissive.width,
        emissive.height,
      );

      const emissiveData = new Uint8ClampedArray(
        emissive.width * emissive.height * 4,
      );

      for (let idx = 0; idx < albedoData.data.length; idx += 4) {
        if (emissiveLevelData.data[idx] > emissiveThreshold) {
          emissiveData[idx] = albedoData.data[idx];
          emissiveData[idx + 1] = albedoData.data[idx + 1];
          emissiveData[idx + 2] = albedoData.data[idx + 2];
          emissiveData[idx + 3] = 255;
          continue;
        }

        emissiveData[idx] = 0;
        emissiveData[idx + 1] = 0;
        emissiveData[idx + 2] = 0;
        emissiveData[idx + 3] = 255;
      }

      emissiveCtx.putImageData(
        new ImageData(emissiveData, emissive.width, emissive.height),
        0,
        0,
      );

      return {
        metalness,
        emissive,
        emissiveLevel,
        roughness,
        sss,
      };
    }

    static createMer() {
      const metalness = PbrMaterial.findTexture("metalness");
      const emissive = PbrMaterial.findTexture("emissive");
      const roughness = PbrMaterial.findTexture("roughness");
      const sss = PbrMaterial.findTexture("sss");

      const width = Math.max(
        metalness?.width ?? 0,
        emissive?.width ?? 0,
        roughness?.width ?? 0,
        Project ? Project.texture_width : 0,
      );

      const height = Math.max(
        metalness?.height ?? 0,
        emissive?.height ?? 0,
        roughness?.height ?? 0,
        Project ? Project.texture_height : 0,
      );

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");

      if (!ctx) {
        return null;
      }

      const metalnessCanvas = metalness?.img
        ? PbrMaterial.extractChannel(metalness, "r")
        : null;
      const emissiveCanvas = emissive?.img
        ? PbrMaterial.extractChannel(emissive, "g")
        : null;
      const roughnessCanvas = roughness?.img
        ? PbrMaterial.extractChannel(roughness, "b")
        : null;
      const sssCanvas = sss?.img ? PbrMaterial.extractChannel(sss, "a") : null;

      const metalnessData =
        metalnessCanvas?.getContext("2d")?.getImageData(0, 0, width, height) ??
        new ImageData(width, height);
      const emissiveData =
        emissiveCanvas?.getContext("2d")?.getImageData(0, 0, width, height) ??
        new ImageData(width, height);
      const roughnessData =
        roughnessCanvas?.getContext("2d")?.getImageData(0, 0, width, height) ??
        new ImageData(width, height);
      const sssData =
        sssCanvas?.getContext("2d")?.getImageData(0, 0, width, height) ??
        new ImageData(
          new Uint8ClampedArray(width * height * 4).fill(255),
          width,
          height,
        );

      const data = new Uint8ClampedArray(width * height * 4);

      for (let idx = 0; idx < data.length; idx += 4) {
        data[idx] = metalnessData.data[idx];
        data[idx + 1] = emissiveData.data[idx];
        data[idx + 2] = roughnessData.data[idx];
        data[idx + 3] = sssData.data[idx];
      }

      ctx.putImageData(new ImageData(data, width, height), 0, 0);

      return canvas;
    }

    static createNormalMap(texture: Texture, heightInAlpha = false) {
      const textureCtx = texture.canvas.getContext("2d");

      if (!textureCtx) {
        return;
      }

      const { width, height } = texture;

      const { data: textureData } = textureCtx.getImageData(
        0,
        0,
        width,
        height,
      );

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        return;
      }

      const getHeight = (x: number, y: number): number => {
        const idx = (x + y * width) * 4;
        return textureData[idx] / 255;
      };

      canvas.width = width;
      canvas.height = height;

      ctx.drawImage(texture.img, 0, 0, width, height);

      const imageData = ctx.getImageData(0, 0, width, height);

      const data = imageData.data;

      const normalize = (v: number[]): number[] => {
        const length = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
        return [v[0] / length, v[1] / length, v[2] / length];
      };

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const left = getHeight(Math.max(x - 1, 0), y);
          const right = getHeight(Math.min(x + 1, width - 1), y);
          const top = getHeight(x, Math.max(y - 1, 0));
          const bottom = getHeight(x, Math.min(y + 1, height - 1));

          const dx = right - left;
          const dy = bottom - top;

          const normal = normalize([-dx, -dy, 1]);

          const idx = (y * width + x) * 4;
          data[idx] = ((normal[0] + 1) / 2) * 255;
          data[idx + 1] = ((normal[1] + 1) / 2) * 255;
          data[idx + 2] = ((normal[2] + 1) / 2) * 255;
          data[idx + 3] = heightInAlpha ? getHeight(x, y) * 255 : 255;
        }
      }

      ctx.putImageData(imageData, 0, 0);

      const normalMap = new Texture({
        name: `${texture.name}_normal`,
        saved: false,
        particle: false,
        keep_size: true,
      }).fromDataURL(canvas.toDataURL());

      if (Project) {
        Project.textures.push(normalMap);
      }

      return normalMap;
    }
  }

  const exportMer = (cb?: (filePath: string) => void) => {
    const mer = PbrMaterial.createMer();

    if (!mer) {
      return;
    }

    mer.toBlob(async (blob) => {
      if (!blob) {
        return;
      }

      const [name, startpath] = Project
        ? [
            `${Project.model_identifier.length > 0 ? Project.model_identifier : Project.name}_mer`,
            Project.export_path,
          ]
        : ["mer"];

      Blockbench.export(
        {
          content: await blob.arrayBuffer(),
          type: "PNG",
          name,
          extensions: ["png"],
          resource_id: "mer",
          savetype: "image",
          startpath,
        },
        cb,
      );
    });
  };

  const createDisplaySettingsPanel = ({ activate }: PbrPreview) => {
    return Vue.extend({
      name: "DisplaySettingsPanel",
      template: /*html*/ `
        <div class="display-settings-panel">
          <fieldset>
            <legend>Tone Mapping</legend>
            <div class="form-group">
              <label for="toneMapping">Function</label>
              <select
                id="toneMapping"
                v-model="toneMapping"
              >
                <option :value="THREE.NoToneMapping">None</option>
                <option :value="THREE.LinearToneMapping">Linear</option>
                <option :value="THREE.ReinhardToneMapping">Reinhard</option>
                <option :value="THREE.CineonToneMapping">Cineon</option>
                <option :value="THREE.ACESFilmicToneMapping">ACES Filmic</option>
              </select>
            </div>
            <div v-show="toneMapping !== THREE.NoToneMapping" class="form-group">
              <div class="form-group-row">
                <label for="exposure_input">Exposure</label>
                <input
                  type="number"
                  id="exposure_input"
                  v-model="exposure"
                  step="0.01"
                  min="-2"
                  max="2"
                  :disabled="toneMapping === THREE.NoToneMapping"
                />
              </div>
              <input
                type="range"
                id="exposure_range"
                v-model="exposure"
                step="0.01"
                min="-2"
                max="2"
                :disabled="toneMapping === THREE.NoToneMapping"
              />
            </div>
            </fieldset>
            <fieldset>
              <legend>Lighting</legend>

              <div class="form-group form-group-row">
                <label for="correctLights">Correct Lights</label>
                <input type="checkbox" id="correctLights" v-model="correctLights" />
              </div>
            </fieldset>
          </div>
        </div>
      `,
      data(): {
        toneMapping: THREE.ToneMapping;
        correctLights: boolean;
        exposure: number;
      } {
        return {
          toneMapping: Preview.selected.renderer.toneMapping,
          exposure: Preview.selected.renderer.toneMappingExposure,
          correctLights: Preview.selected.renderer.physicallyCorrectLights,
        };
      },
      watch: {
        toneMapping: {
          handler(value: THREE.ToneMapping) {
            Preview.selected.renderer.toneMapping = value;
            activate();
          },
          immediate: true,
        },
        correctLights: {
          handler(value: boolean) {
            Preview.selected.renderer.physicallyCorrectLights = value;
            activate();
          },
          immediate: true,
        },
        exposure: {
          handler(value: number) {
            Preview.selected.renderer.toneMappingExposure = value;
          },
          immediate: true,
        },
      },
    });
  };

  const createMaterialPanel = ({ activate }: PbrPreview) => {
    const ChannelButton = Vue.extend({
      name: "ChannelButton",
      props: {
        channel: Object,
      },
      template: /*html*/ `
        <div class="channel-button">
          <div v-if="selectedTexture" class="channel-texture">
            <img class="channel-texture__image" :src="selectedTexture.img.src" :alt="selectedTexture.uuid" width="64" height="64" />
            <div class="channel-texture__description">
              <h4 class="channel-texture__title">{{ channel.label }}</h4>
              <h5 class="channel-texture__name">{{ selectedTexture.name.trim() }}</h5>
            </div>
            <button class="channel-texture__clear" type="button" title="Clear channel" @click="unsetTexture">
              <i class="material-icons">clear</i>
            </button>
          </div>
          <div v-else class="channel-unassigned">
            <label :for="assignId(channel.label)">{{ channel.label }}</label>
            <select :id="assignId(channel.label)" @change="setTexture">
              <option>Select {{ channel.label }}</option>
              <option v-for="texture in projectTextures" :value="texture.uuid">{{ texture.name }}</option>
            </select>
          </div>
        </div>
      `,
      data(): {
        selectedTexture: Texture | null;
        projectTextures: Array<Texture>;
      } {
        return {
          selectedTexture: null,
          projectTextures: [],
        };
      },
      mounted() {
        this.projectTextures = Project
          ? Project.textures ?? Texture.all
          : Texture.all;
        this.selectedTexture = PbrMaterial.findTexture(this.channel.id);
      },
      methods: {
        assignId(label: string) {
          return `channel_${label.toLowerCase().replace(/\s/g, "-")}`;
        },
        setTexture(event: Event) {
          const texture = this.projectTextures.find(
            (t: Texture) =>
              t.uuid === (event.target as HTMLSelectElement).value,
          );

          if (!texture) {
            return;
          }

          PbrMaterial.saveTexture(this.channel.id, texture.uuid);
          this.selectedTexture = texture;
          activate({
            [this.channel.map]: new THREE.CanvasTexture(texture.canvas),
          });
        },
        unsetTexture() {
          PbrMaterial.saveTexture(this.channel.id, NA_CHANNEL);
          this.selectedTexture = null;
          activate({
            [this.channel.map]: null,
          });
        },
      },
    });

    return Vue.extend({
      name: "MaterialPanel",
      components: {
        ChannelButton,
      },
      template: /*html*/ `
        <div>
          <div v-for="(channel, key) in channels" :key="key">
            <ChannelButton :channel="channel" />
          </div>
        </div>
      `,
      data(): {
        channels: Record<string, IChannel>;
      } {
        return {
          channels: CHANNELS,
        };
      },
    });
  };

  class PbrPreview {
    activate(extendMaterial?: THREE.MeshStandardMaterialParameters) {
      const material = PbrMaterial.getMaterial(extendMaterial);

      Outliner.elements.forEach((item) => {
        const mesh = item.getMesh();

        if (mesh.isObject3D && !mesh.isMesh) {
          return;
        }

        (mesh as THREE.Mesh).material = material;
      });
    }

    deactivate() {
      // Restores the original material
      Canvas.updateAll();
    }
  }

  generateNormal = new Action(`${PLUGIN_ID}_generate_normal`, {
    icon: "altitude",
    name: "Generate Normal Map",
    description: "Generates a normal map from the height map",
    click() {
      const texture =
        PbrMaterial.findTexture(CHANNELS.height.id) ??
        Texture.all.find((t) => t.selected);

      if (!texture) {
        return;
      }

      const normalMap = PbrMaterial.createNormalMap(texture);

      if (normalMap) {
        PbrMaterial.saveTexture("normal", normalMap.uuid);
      }
    },
  });

  generateMer = new Action(`${PLUGIN_ID}_create_mer`, {
    icon: "lightbulb_circle",
    name: "Generate MER",
    click() {
      exportMer();
    },
  });

  decodeMer = new Action(`${PLUGIN_ID}_decode_mer`, {
    icon: "arrow_split",
    name: "Decode MER",
    click() {
      const { metalness, emissive, roughness } = PbrMaterial.decodeMer();

      if (metalness) {
        const metalnessTexture = new Texture({
          name: "metalness",
          saved: false,
          particle: false,
        }).fromDataURL(metalness.toDataURL());

        Project.textures.push(metalnessTexture);
        PbrMaterial.saveTexture(CHANNELS.metalness.id, metalnessTexture.uuid);
      }

      if (emissive) {
        const emissiveTexture = new Texture({
          name: "emissive",
          saved: false,
          particle: false,
        }).fromDataURL(emissive.toDataURL());

        Project.textures.push(emissiveTexture);
        PbrMaterial.saveTexture(CHANNELS.emissive.id, emissiveTexture.uuid);
      }

      if (roughness) {
        const roughnessTexture = new Texture({
          name: "roughness",
          saved: false,
          particle: false,
        }).fromDataURL(roughness.toDataURL());

        Project.textures.push(roughnessTexture);
        PbrMaterial.saveTexture(CHANNELS.roughness.id, roughnessTexture.uuid);
      }
    },
  });

  const createTextureSetDialog = () => {
    if (!Project) {
      return;
    }

    const projectNormalMap = PbrMaterial.findTexture(CHANNELS.normal.id)?.name;
    const projectHeightMap = PbrMaterial.findTexture(CHANNELS.height.id)?.name;
    const projectColorMap = PbrMaterial.findTexture(CHANNELS.albedo.id)?.name;
    const projectMetalnessMap = PbrMaterial.findTexture(
      CHANNELS.metalness.id,
    )?.name;
    const projectEmissiveMap = PbrMaterial.findTexture(
      CHANNELS.emissive.id,
    )?.name;
    const projectRoughnessMap = PbrMaterial.findTexture(
      CHANNELS.roughness.id,
    )?.name;

    const form: DialogOptions["form"] = {};

    if (!projectColorMap) {
      form.baseColor = {
        type: "color",
        label: "Base Color",
        value: "#ff00ff",
      };
    }

    if (!projectMetalnessMap && !projectEmissiveMap && !projectRoughnessMap) {
      form.metalness = {
        label: "Metalness",
        type: "range",
        min: 0,
        max: 255,
        step: 1,
        value: 0,
      };

      form.emissive = {
        label: "Emissive",
        type: "range",
        min: 0,
        max: 255,
        step: 1,
        value: 0,
      };

      form.roughness = {
        label: "Roughness",
        type: "range",
        min: 0,
        max: 255,
        step: 1,
        value: 0,
      };
    }

    if (projectNormalMap && projectHeightMap) {
      form.depthMap = {
        type: "radio",
        label: "Depth Map",
        options: {
          normal: "Normal Map",
          heightmap: "Height",
        },
        value: "normal",
      };
    }

    textureSetDialog = new Dialog(`${PLUGIN_ID}_texture_set`, {
      id: `${PLUGIN_ID}_texture_set`,
      title: "Create Texture Set JSON",
      buttons: ["Create", "Cancel"],
      form,
      onConfirm(formResult) {
        const baseName =
          Project.model_identifier.length > 0
            ? Project.model_identifier
            : Project.name;

        const hasMer =
          projectMetalnessMap || projectEmissiveMap || projectRoughnessMap;

        const textureSet = {
          format_version: "1.16.200",
          "minecraft:texture_set": {
            color:
              (projectColorMap
                ? pathToName(projectColorMap, false)
                : formResult.baseColor.hexCode) ?? baseName,
            metalness_emissive_roughness: [
              formResult.metalness ?? 0,
              formResult.emissive ?? 0,
              formResult.roughness ?? 255,
            ],
          },
        };

        if (formResult.depthMap === "normal" && projectNormalMap) {
          textureSet["minecraft:texture_set"].normal = pathToName(
            projectNormalMap,
            false,
          );
        } else if (
          (!projectNormalMap || formResult.depthMap === "heightmap") &&
          projectHeightMap
        ) {
          textureSet["minecraft:texture_set"].heightmap = pathToName(
            projectHeightMap,
            false,
          );
        }

        const exportTextureSet = () =>
          Blockbench.export({
            content: JSON.stringify(textureSet, null, 2),
            type: "JSON",
            name: `${baseName}.texture_set`,
            extensions: ["json"],
            resource_id: "texture_set",
            startpath: Project.export_path,
          });

        if (hasMer) {
          exportMer((filePath) => {
            textureSet["minecraft:texture_set"].metalness_emissive_roughness =
              pathToName(filePath, false);
            exportTextureSet();
          });
          return;
        }

        exportTextureSet();
      },
    });

    textureSetDialog.show();

    return textureSetDialog;
  };

  let updateListener = () => {
    pbrPreview.activate();
  }

  pbrDisplaySetting = new Setting('pbr_active', {
    category: "preview",
    name: "Enable PBR Preview",
    type: "boolean",
    value: false,
    icon: "tonality",
    onChange(value) {
      pbrPreview.deactivate();
      
      if (value) {
        pbrPreview.activate();
        Blockbench.addListener("finished_edit", updateListener);
        return;
      }

      Blockbench.removeListener("finished_edit", updateListener);
    },
  });

  BBPlugin.register(PLUGIN_ID, {
    version: PLUGIN_VERSION,
    title: "PBR Features",
    author: "Jason J. Gardner",
    description:
      "Create RTX/Deferred Rendering textures in Blockbench. Adds support for previewing PBR materials and exporting them in Minecraft-compatible formats.",
    tags: ["PBR", "RTX", "Deferred Rendering"],
    icon: "icon.png",
    variant: "both",
    await_loading: true,
    new_repository_format: true,
    website: "https://github.com/jasonjgardner/blockbench-plugins",
    onload() {
      pbrPreview = new PbrPreview();

      styles = Blockbench.addCSS(/*css*/ `
        .channel-button {
          display: flex;
          background-color: var(--color-dark);
          border: 2px solid var(--color-button);
          border-radius: 5px;
          margin: 0 .5rem 1rem;
          padding: 0.5rem;
          align-items: stretch;
          justify-content: space-between;
        }

        .channel-button > button {
          justify-self: stretch;
          width: 100%;
          white-space: nowrap;
        }

        .channel-texture {
          display: flex;
          flex-direction: row;
          flex-grow: 1;
          flex-wrap: nowrap;
          overflow: hidden;
          position: relative;
          width: 100%;
        }

        .channel-texture__clear {
          background: none;
          border-radius: 5px;
          border: none;
          color: var(--color-text);
          cursor: pointer;
          flex-grow: 1;
          font-size: 1rem;
          max-width: 1rem;
          min-width: fit-content;
          padding: 0;
          position: absolute;
          right: 0;
          top: 0;
        }

        .channel-texture__title {
          font-size: 1rem;
          font-weight: bold;
          margin: 0;
        }

        .channel-texture__description {
          display: flex;
          flex-direction: column;
          width: 100%;
          padding: 0 0.5rem;
        }

        .channel-texture__image {
          background-color: var(--color-dark);
          border: 1px solid var(--color-button);
          border-radius: 4px;
          image-rendering: pixelated;
        }

        .channel-texture__name {
          flex: 1;
          font-size: 0.825rem;
          margin: auto 0 0;
          overflow: hidden;
          padding: 0;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .channel-unassigned {
          display: flex;
          flex-direction: column;
          flex-grow: 1;
          justify-content: center;
          text-align: center;
        }

        .channel-unassigned > label {
          border-bottom: 1px solid var(--color-button);
          font-size: 1rem;
          font-weight: bold;
          margin: 0 0 0.5rem;
          padding: 0 0 0.5rem;
        }

        .channel-unassigned > select {
          background-color: var(--color-button);
          border: 1px solid var(--color-dark);
          border-radius: 5px;
          color: var(--color-text);
        }

        .display-settings-panel fieldset {
          border: 1px solid var(--color-dark);
          border-radius: 4px;
        }

        .display-settings-panel .form-group {
          display: flex;
          flex-direction: column;
          margin: 0.5rem;
        }

        .display-settings-panel .form-group-row {
          display: flex;
          flex-direction: row;
          justify-content: space-between;
        }
      `);

      pbrMode = new Mode(`${PLUGIN_ID}_mode`, {
        name: "PBR",
        icon: "flare",
        selectElements: false,
        hidden_node_types: ["texture_mesh"],
        onSelect() {
          pbrPreview.activate();

          three_grid.visible = false;

          Blockbench.on("select_preview_scene", () => pbrPreview.activate());

          displaySettingsPanel = new Panel(`${PLUGIN_ID}.display_settings`, {
            name: "Display Settings",
            id: `${PLUGIN_ID}.display_settings_panel`,
            icon: "display_settings",
            toolbars: [],
            display_condition: {
              modes: [`${PLUGIN_ID}_mode`],
              project: true,
            },
            component: createDisplaySettingsPanel(pbrPreview),
            expand_button: true,
            onFold() {},
            onResize() {},
            default_side: "right",
            default_position: {
              slot: "right_bar",
              float_position: [0, 0],
              float_size: [400, 500],
              height: 300,
              folded: false,
            },
            insert_after: "uv",
            insert_before: "paint",
          });

          materialPanel = new Panel(`${PLUGIN_ID}.material`, {
            name: "Material",
            id: `${PLUGIN_ID}.material_panel`,
            icon: "stacks",
            toolbars: [],
            display_condition: {
              modes: [`${PLUGIN_ID}_mode`],
              project: true,
            },
            component: createMaterialPanel(pbrPreview),
            expand_button: true,
            onFold() {},
            onResize() {},
            default_side: "left",
            default_position: {
              slot: "left_bar",
              float_position: [0, 0],
              float_size: [400, 500],
              height: 600,
              folded: false,
            },
            insert_after: `${PLUGIN_ID}.display_settings`,
            insert_before: "",
          });
        },
        onUnselect() {
          if (!Settings.get('pbr_active')) {
            pbrPreview.deactivate();
          }
          
          displaySettingsPanel?.delete();
          materialPanel?.delete();
          textureSetDialog?.delete();
          three_grid.visible = true;
        },
      });

      MenuBar.addAction(generateMer, "file.export");
      MenuBar.addAction(generateNormal, "tools");
      MenuBar.addAction(decodeMer, "tools");
      MenuBar.addAction(
        new Action(`${PLUGIN_ID}_create_texture_set`, {
          name: "Create Texture Set",
          icon: "layers",
          description:
            "Creates a texture set JSON file. Generates a MER when metalness, emissive, or roughness channels are set.",
          click() {
            createTextureSetDialog();
          },
        }),
        "file.export",
      );

      MenuBar.addAction(
        new Toggle("toggle_pbr", {
          name: "PBR Preview",
          description: "Toggle PBR Preview",
          icon: "tonality",
          category: "view",
          condition: {
            modes: ["edit", "paint", "animate"]
          },
          linked_setting: 'pbr_active',
          click() {
            
          }
        }),
        "view"
      );

      if (Settings.get('pbr_active')) {
        pbrPreview.activate();
      }
    },
    onunload() {
      pbrMode?.delete();
      displaySettingsPanel?.delete();
      pbrDisplaySetting?.delete();
      materialPanel?.delete();
      generateMer?.delete();
      decodeMer?.delete();
      styles?.delete();
      textureSetDialog?.delete();
      MenuBar.removeAction(`file.export.${PLUGIN_ID}_create_mer`);
      MenuBar.removeAction(`file.export.${PLUGIN_ID}_create_texture_set`);
      MenuBar.removeAction(`tools.${PLUGIN_ID}_generate_normal`);
    },
  });
})();
