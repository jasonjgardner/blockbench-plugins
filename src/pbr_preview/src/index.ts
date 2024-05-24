/**
 * @author jasonjgardner
 * @discord jason.gardner
 * @github https://github.com/jasonjgardner
 */
/// <reference types="three" />
/// <reference path="../../../types/index.d.ts" />

type Channel =
  | "albedo"
  | "metalness"
  | "emissive"
  | "roughness"
  | "height"
  | "normal"
  | "ao";

interface IChannel {
  label: string;
  description: string;
  map: string;
  id: string;
}

(() => {
  const { MeshStandardMaterial } = THREE;

  let decodeMer: Action;
  let createTextureSet: Action;
  let generateMer: Action;
  let generateNormal: Action;
  let togglePbr: Toggle;
  let pbrPreview: PbrPreview;
  let pbrMode: Mode;
  let pbrDisplaySetting: Setting;
  let displaySettingsPanel: Panel;
  let materialPanel: Panel;
  let styles: Deletable;
  let textureSetDialog: Dialog;
  let channelAssignmentSelect: BarSelect;
  let channelProp: Property;

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

  const getProjectTextures = () => {
    const allTextures = Project ? Project.textures ?? Texture.all : Texture.all;

    return allTextures
      .filter((t: Texture) => t.layers.length > 0)
      .flatMap((t: Texture) => t.layers);
  };

  class PbrMaterial {
    private _scope: Array<Texture | TextureLayer>;
    private _materialUuid: string;

    constructor(
      scope: Array<Texture | TextureLayer> | null,
      materialUuid: string,
    ) {
      this._scope = scope ?? getProjectTextures();
      this._materialUuid = materialUuid;
    }

    merToCanvas() {
      let emissiveMap = this.getTexture(CHANNELS.emissive);
      let roughnessMap = this.getTexture(CHANNELS.roughness);
      let metalnessMap = this.getTexture(CHANNELS.metalness);

      if (!emissiveMap && !roughnessMap && !metalnessMap) {
        const { metalness, emissive, roughness } = this.decodeMer();

        if (metalness) {
          metalnessMap = PbrMaterial.makePixelatedCanvas(metalness);
        }

        if (emissive) {
          emissiveMap = PbrMaterial.makePixelatedCanvas(emissive);
        }

        if (roughness) {
          roughnessMap = PbrMaterial.makePixelatedCanvas(roughness);
        }
      }

      return {
        emissiveMap,
        roughnessMap,
        metalnessMap,
      };
    }

    getMaterial(options: THREE.MeshStandardMaterialParameters = {}) {
      const { emissiveMap, roughnessMap, metalnessMap } = this.merToCanvas();

      return new THREE.MeshStandardMaterial({
        map:
          this.getTexture(CHANNELS.albedo) ??
          PbrMaterial.makePixelatedCanvas(
            TextureLayer.selected?.canvas ??
              Texture.all.find((t) => t.selected)?.canvas ??
              Texture.all[0].canvas,
          ),
        aoMap: this.getTexture(CHANNELS.ao),
        normalMap: this.getTexture(CHANNELS.normal),
        bumpMap: this.getTexture(CHANNELS.height),
        metalnessMap,
        // metalness: metalnessMap ? 1 : 0,
        roughnessMap,
        // roughness: roughnessMap ? 1 : 0,
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
      // TODO: Load from Blockbench project data
      const projectsJson = localStorage.getItem(`${PLUGIN_ID}.pbr_textures`);
      return projectsJson ? JSON.parse(projectsJson) : {};
    }

    static getProjectData() {
      const id = PbrMaterial.projectId();
      const projects = PbrMaterial.getProjectsData();
      return projects[id] ?? {};
    }

    saveTexture(channel: IChannel, textureUuid: string) {
      const projects = PbrMaterial.getProjectsData();
      const id = PbrMaterial.projectId();

      const key = channel.id;

      // TODO: Save with project data

      const project = projects[id];
      const material = project?.[this._materialUuid];

      if (material) {
        material[key] = textureUuid;
      } else {
        projects[id] = {
          ...project,
          [this._materialUuid]: {
            [key]: textureUuid,
          },
        };
      }

      localStorage.setItem(
        `${PLUGIN_ID}_pbr_textures`,
        JSON.stringify(projects),
      );
    }

    removeTexture(channel: IChannel) {
      const id = PbrMaterial.projectId();
      const projects = PbrMaterial.getProjectsData();
      const projectData = PbrMaterial.getProjectData();

      delete projectData[this._materialUuid][channel.id];

      localStorage.setItem(
        `${PLUGIN_ID}_pbr_textures`,
        JSON.stringify({
          ...projects,
          [id]: projectData,
        }),
      );
    }

    findTexture(name: string | IChannel): Texture | TextureLayer | null {
      if (!Project) {
        return null;
      }

      const materialChannel = this._scope.find(
        (t) => t.channel && (t.channel === name || t.channel === name.id),
      );

      if (materialChannel) {
        return materialChannel;
      }

      const channel = typeof name === "string" ? name : name.id;

      const projectData = PbrMaterial.getProjectData();
      const materialData = projectData[this._materialUuid];

      if (!materialData) {
        const filenameRegex = new RegExp(`_*${channel}(\.[^.]+)?$`, "i");
        return this._scope.find((t) => filenameRegex.test(t.name)) ?? null;
      }


      const textureUuid = materialData[channel];

      if (!textureUuid) {
        return null;
      }

      return this._scope.find((t) => t.uuid === textureUuid) ?? null;
    }

    static makePixelatedCanvas(canvas: HTMLCanvasElement) {
      const texture = new THREE.CanvasTexture(
        canvas,
        undefined,
        undefined,
        undefined,
        THREE.NearestFilter,
        THREE.NearestFilter,
      );

      texture.needsUpdate = true;

      return texture;
    }

    /**
     * Searches for a texture and creates a canvas element with the texture data if found
     * @param name The name of the texture to search for. Use a channel or a texture name or UUID
     * @param scope An array of textures to search in. Defaults to all textures in the project
     */
    getTexture(name: string | IChannel) {
      const texture = this.findTexture(name);
      return texture ? PbrMaterial.makePixelatedCanvas(texture.canvas) : null;
    }

    static extractChannel(
      texture: Texture | TextureLayer,
      channel: "r" | "g" | "b" | "a",
    ) {
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

    decodeMer(emissiveThreshold = 25.5): {
      metalness?: HTMLCanvasElement | null;
      emissive?: HTMLCanvasElement | null;
      emissiveLevel?: HTMLCanvasElement | null;
      roughness?: HTMLCanvasElement | null;
      sss?: HTMLCanvasElement | null;
    } {
      const texture = this.findTexture("mer");

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

      const emissive = document.createElement("canvas");
      emissive.width = texture.img.width;
      emissive.height = texture.img.height;

      // Use emissiveLevel as mask for getting emissive color from albedo channel
      const albedo = this.findTexture(CHANNELS.albedo);

      if (albedo) {
        emissive.width = albedo.img.width;
        emissive.height = albedo.img.height;
      }

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

    createMer() {
      const metalness = this.findTexture(CHANNELS.metalness);
      const emissive = this.findTexture(CHANNELS.emissive);
      const roughness = this.findTexture(CHANNELS.roughness);
      const sss = this.findTexture("sss");

      const width = Math.max(
        metalness?.img.width ?? 0,
        emissive?.img.width ?? 0,
        roughness?.img.width ?? 0,
        Project ? Project.texture_width : 0,
      );

      const height = Math.max(
        metalness?.img.height ?? 0,
        emissive?.img.height ?? 0,
        roughness?.img.height ?? 0,
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

    static createNormalMap(
      texture: Texture | TextureLayer,
      heightInAlpha = false,
    ) {
      const textureCtx = texture.canvas.getContext("2d");

      if (!textureCtx) {
        return;
      }

      const { width, height } = texture.img;

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

      const dataUrl = canvas.toDataURL();

      const normalMapTexture =
        texture instanceof Texture
          ? texture
          : new Texture({
              name: `${texture.name}_normal`,
              saved: false,
              particle: false,
              keep_size: true,
            }).fromDataURL(dataUrl);

      const normalMapLayer = new TextureLayer(
        {
          name: `${texture.name}_normal`,
          data_url: dataUrl,
        },
        normalMapTexture,
      );

      if (texture instanceof TextureLayer) {
        texture.texture.layers.push(normalMapLayer);
      } else if (Project) {
        Project.textures.push(normalMapTexture);
      }

      return normalMapLayer;
    }
  }

  const exportMer = (cb?: (filePath: string) => void) => {
    const selected = Texture.all.find((t) => t.selected);

    if (!selected) {
      return;
    }

    const mer = new PbrMaterial(
      getProjectTextures(),
      selected.uuid,
    ).createMer();

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
        material: Object,
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
        selectedTexture: Texture | TextureLayer | null;
        projectTextures: TextureLayer[];
        pbrMaterial: PbrMaterial | null;
      } {
        return {
          selectedTexture: null,
          projectTextures: [],
          pbrMaterial: null,
        };
      },
      mounted() {
        this.projectTextures = getProjectTextures();
        this.pbrMaterial = new PbrMaterial(
          this.projectTextures,
          this.material.uuid,
        );
      },
      methods: {
        assignId(label: string) {
          return `channel_${label.toLowerCase().replace(/\s/g, "-")}`;
        },
        setTexture(event: Event) {
          const texture = this.projectTextures.find(
            (t: TextureLayer) =>
              t.uuid === (event.target as HTMLSelectElement).value,
          );

          if (!texture) {
            return;
          }

          this.pbrMaterial?.saveTexture(this.channel, texture.uuid);
          this.selectedTexture = texture;
          activate({
            [this.channel.map]: new THREE.CanvasTexture(
              texture.canvas,
              undefined,
              undefined,
              undefined,
              THREE.NearestFilter,
              THREE.NearestFilter,
            ),
          });
        },
        unsetTexture() {
          this.pbrMaterial?.saveTexture(this.channel, NA_CHANNEL);
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
          <div v-for="material in materials" :key="material.uuid">
            <div v-for="(channel, key) in channels" :key="key">
              <ChannelButton :channel="channel" :material="material" />
            </div>
          </div>
        </div>
      `,
      data(): {
        channels: Record<string, IChannel>;
        materials: Array<Texture | TextureLayer>;
      } {
        return {
          channels: CHANNELS,
          materials: [],
        };
      },
      mounted() {
        this.materials = getProjectTextures();
      },
    });
  };

  class PbrPreview {
    activate(extendMaterial?: THREE.MeshStandardMaterialParameters) {
      // Don't overwrite placeholder material in Edit and Paint mode
      if (
        !Project ||
        (Texture.all.length === 0 && Modes.id !== `${PLUGIN_ID}_mode`)
      ) {
        return;
      }

      Project.elements.forEach((item) => {
        if (!(item instanceof Cube)) {
          return;
        }

        Object.keys(item.faces).forEach((key) => {
          const face = item.faces[key];
          const texture = face.getTexture();

          if (!texture) {
            return;
          }

          const projectMaterial = Project.materials[texture.uuid];
          const material = new PbrMaterial(
            texture.layers_enabled
              ? texture.layers.filter((layer) => layer.visible) ?? null
              : Project.textures,
            texture.uuid,
          ).getMaterial(extendMaterial);

          Project.materials[texture.uuid] =
            THREE.ShaderMaterial.prototype.copy.call(material, projectMaterial);

          Canvas.updateAllFaces(texture);
        });
      });
    }

    deactivate() {
      // Restore the original material by deactivating all the PBR maps
      this.activate({
        aoMap: null,
        normalMap: null,
        bumpMap: null,
        metalnessMap: null,
        roughnessMap: null,
        emissiveMap: null,
        emissive: 0,
      });
      Canvas.updateAll();
    }
  }

  generateNormal = new Action(`${PLUGIN_ID}_generate_normal`, {
    icon: "altitude",
    name: "Generate Normal Map",
    description: "Generates a normal map from the height map",
    click() {
      const selected =
        TextureLayer.selected ?? Texture.all.find((t) => t.selected);
      const mat = new PbrMaterial(getProjectTextures(), selected.uuid);

      const texture =
        TextureLayer.selected ??
        mat.findTexture(CHANNELS.height) ??
        Texture.all.find((t) => t.selected);

      if (!texture) {
        return;
      }

      const normalMap = PbrMaterial.createNormalMap(texture);

      if (normalMap) {
        mat.saveTexture(CHANNELS.normal, normalMap.uuid);
        Blockbench.showQuickMessage("Normal map generated", 2000);
        return;
      }

      Blockbench.showQuickMessage("Failed to generate normal map", 2000);
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
      const projectTextures = getProjectTextures();
      const selected =
        TextureLayer.selected.texture ?? Texture.all.find((t) => t.selected);

      const mat = new PbrMaterial(
        projectTextures,
        (selected ?? projectTextures[0]).uuid,
      );
      const mer = mat.decodeMer();
      const merChannels = [
        CHANNELS.metalness,
        CHANNELS.emissive,
        CHANNELS.roughness,
      ];

      merChannels.forEach((channel) => {
        const key = channel.id as keyof typeof mer;
        const canvas = mer[key];

        if (!canvas) {
          return;
        }

        const layer = new TextureLayer(
          {
            name: `${selected?.name}_${key}`,
            data_url: canvas.toDataURL(),
          },
          selected,
        );
        projectTextures.push(layer);
        mat.saveTexture(channel, layer.uuid);
      });
    },
  });

  const createTextureSetDialog = () => {
    if (!Project) {
      return;
    }
    const scope = getProjectTextures();
    Project.textures.forEach((t) => {
      const mat = new PbrMaterial(scope, t.uuid);

      const projectNormalMap = mat.findTexture(CHANNELS.normal)?.name;
      const projectHeightMap = mat.findTexture(CHANNELS.height)?.name;
      const projectColorMap = mat.findTexture(CHANNELS.albedo)?.name;
      const projectMetalnessMap = mat.findTexture(CHANNELS.metalness)?.name;
      const projectEmissiveMap = mat.findTexture(CHANNELS.emissive)?.name;
      const projectRoughnessMap = mat.findTexture(CHANNELS.roughness)?.name;

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
                  : formResult.baseColor?.toHexString()) ?? baseName,
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
    });
  };

  createTextureSet = new Action(`${PLUGIN_ID}_create_texture_set`, {
    name: "Create Texture Set",
    icon: "layers",
    description:
      "Creates a texture set JSON file. Generates a MER when metalness, emissive, or roughness channels are set.",
    click() {
      createTextureSetDialog();
    },
  });

  const updateListener = () => {
    if (Settings.get("pbr_active")) {
      pbrPreview.activate();
    }
  };

  const subscribeToEvents: Array<EventName | string> = [
    "undo",
    "redo",
    // "setup_project",
    // "select_project",
    "add_texture",
    "finish_edit",
    "finished_edit",
    // "update_view",
    // "update_texture_selection",
    // "update_faces",
  ];

  const enableListeners = () => {
    subscribeToEvents.forEach((event) => {
      Blockbench.addListener(event as EventName, updateListener);
    });
  };

  const disableListeners = () => {
    subscribeToEvents.forEach((event) => {
      Blockbench.removeListener(event as EventName, updateListener);
    });
  };

  pbrDisplaySetting = new Setting("pbr_active", {
    category: "preview",
    name: "Enable PBR Preview",
    type: "boolean",
    value: false,
    icon: "tonality",
    onChange(value) {
      pbrPreview.deactivate();

      if (value) {
        pbrPreview.activate();
        enableListeners();
        return;
      }

      disableListeners();
    },
  });

  togglePbr = new Toggle("toggle_pbr", {
    name: "PBR Preview",
    description: "Toggle PBR Preview",
    icon: "tonality",
    category: "view",
    condition: {
      modes: ["edit", "paint", "animate"],
    },
    linked_setting: "pbr_active",
    click() {
      Blockbench.showQuickMessage(
        `PBR Preview is now ${pbrDisplaySetting.value ? "enabled" : "disabled"}`,
        2000,
      );
    },
  });

  const layersPanelToolbar: Toolbar[] = Panels.layers.toolbars;

  const initLayerToolbar = () => {
    channelProp = new Property(TextureLayer, "enum", "channel", {
      default: NA_CHANNEL,
      values: Object.keys(CHANNELS).map((key) => CHANNELS[key].id),
    });

    const channelIds = Object.keys(CHANNELS);

    channelIds.map((channel) => {
      new Property(ModelProject, "string", `pbr_${channel}`, {
        default: NA_CHANNEL,
        values: getProjectTextures().map((t) => t.uuid),
      });
    });

    channelAssignmentSelect = new BarSelect(
      `${PLUGIN_ID}_layers_channel_assignment`,
      {
        condition: () => Modes.paint && TextureLayer.selected,
        category: "pbr",
        options: Object.fromEntries(
          Object.entries(CHANNELS).map(([key, channel]) => [
            key,
            channel.label,
          ]),
        ),
        onChange() {
          const texture = TextureLayer.selected;

          if (!texture || !this.value || !Project) {
            return;
          }

          texture.extend({ channel: this.value });

          Project[`pbr_${this.value}`] = texture.uuid;

          // new PbrMaterial(null, texture.texture.uuid).saveTexture(
          //   CHANNELS[texture.channel],
          //   texture.uuid,
          // );
          pbrPreview.activate();
        },
      },
    );

    layersPanelToolbar[0].add(channelAssignmentSelect, 4);
  };

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
          displaySettingsPanel?.delete();
          materialPanel?.delete();
          textureSetDialog?.delete();
          three_grid.visible = true;

          if (!Settings.get("pbr_active")) {
            pbrPreview.deactivate();
            disableListeners();
            return;
          }

          enableListeners();
        },
      });

      MenuBar.addAction(generateMer, "file.export");
      MenuBar.addAction(generateNormal, "tools");
      MenuBar.addAction(decodeMer, "tools");
      MenuBar.addAction(createTextureSet, "file.export");
      MenuBar.addAction(togglePbr, "view");

      initLayerToolbar();
    },
    onunload() {
      pbrMode?.delete();
      displaySettingsPanel?.delete();
      pbrDisplaySetting?.delete();
      materialPanel?.delete();
      generateMer?.delete();
      generateNormal?.delete();
      togglePbr?.delete();
      decodeMer?.delete();
      styles?.delete();
      createTextureSet?.delete();
      textureSetDialog?.delete();
      channelAssignmentSelect?.delete();
      MenuBar.removeAction(`file.export.${PLUGIN_ID}_create_mer`);
      MenuBar.removeAction(`file.export.${PLUGIN_ID}_create_texture_set`);
      MenuBar.removeAction(`tools.${PLUGIN_ID}_generate_normal`);
      disableListeners();
      layersPanelToolbar[0].remove(channelAssignmentSelect);
    },
  });
})();
