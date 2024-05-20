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

  let sendToSubstanceAction: Action;
  let dialogBtn: Action;
  let dialogElement: Dialog;
  let pbrPreview: PbrPreview;
  let pbrMode: Mode;
  let displaySettingsPanel: Panel;
  let materialPanel: Panel;
  let styles: Deletable;

  const NA_CHANNEL = "_NONE_";
  const PLUGIN_ID = "pbr_preview";
  const CHANNELS: Record<string, IChannel> = {
    albedo: {
      id: "albedo",
      label: "Albedo",
      description: "The color of the material",
      map: "map",
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
    height: {
      id: "height",
      label: "Height",
      description: "The material's height map",
      map: "bumpMap",
    },
    roughness: {
      id: "roughness",
      label: "Roughness",
      description: "The material's roughness map",
      map: "roughnessMap",
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
  };

  class PbrMaterial {
    static getMaterial(options: THREE.MeshStandardMaterialParameters = {}) {
      // const mer = PbrPreviewScene.decodeMer();

      const emissiveMap = PbrMaterial.getTexture("emissive");

      return new MeshStandardMaterial({
        map:
          PbrMaterial.getTexture("albedo") ??
          new THREE.CanvasTexture(Texture.all[0]?.canvas),
        aoMap: PbrMaterial.getTexture("ao"),
        normalMap: PbrMaterial.getTexture("normal"),
        roughnessMap: PbrMaterial.getTexture("roughness"),
        metalnessMap: PbrMaterial.getTexture("metalness"),
        bumpMap: PbrMaterial.getTexture("heightmap"),
        emissiveMap,
        emissiveIntensity: emissiveMap ? 1 : 0,
        emissive: emissiveMap ? 0xffffff : 0,
        ...options,
      });
    }

    static projectId() {
      return (
        Project.saved_path ??
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

      const texture = new THREE.CanvasTexture(src.canvas);

      texture.needsUpdate = true;

      return texture;
    }

    static extractChannel(texture: THREE.Texture, channel: number) {
      const canvas: HTMLCanvasElement = texture.image;
      const width = canvas.width;
      const height = canvas.height;

      const ctx = canvas.getContext("2d");

      if (!ctx) {
        return null;
      }

      const { data } = ctx.getImageData(0, 0, width, height);

      const channelData = new Uint8Array(width * height);

      const size = width * height * 4;

      for (let i = 0; i < size; i += 4) {
        const stride = i / 4;
        channelData[stride] = data[i + channel];
        channelData[stride + 1] = data[i + channel];
        channelData[stride + 2] = data[i + channel];
      }

      const channelCanvas = document.createElement("canvas");
      channelCanvas.width = width;
      channelCanvas.height = height;

      const channelCtx = channelCanvas.getContext("2d");

      if (!channelCtx) {
        return null;
      }

      const channelImageData = channelCtx.createImageData(width, height);

      channelImageData.data.set(channelData);
      channelCtx.putImageData(channelImageData, 0, 0);

      const channelTexture = new THREE.CanvasTexture(channelCanvas);
      channelTexture.needsUpdate = true;

      return channelTexture;
    }

    static decodeMer(): {
      metalness?: THREE.Texture;
      emissive?: THREE.Texture;
      roughness?: THREE.Texture;
    } | null {
      // Extract metalness, emissive, and roughness from the texture's red, green, and blue channels respectively
      const texture = PbrMaterial.getTexture("mer");

      if (!texture) {
        return null;
      }

      return {
        metalness: PbrMaterial.extractChannel(texture, 0) ?? undefined,
        emissive: PbrMaterial.extractChannel(texture, 1) ?? undefined,
        roughness: PbrMaterial.extractChannel(texture, 2) ?? undefined,
      };
    }
  }

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
        this.projectTextures = Project.textures ?? Texture.all;
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
      const envMap = PreviewScene.active?.cubemap ?? null;
      const material = PbrMaterial.getMaterial({
        envMap,
        ...extendMaterial,
      });

      Outliner.elements.forEach((item) => {
        const mesh = item.getMesh();

        mesh.material = material;
        // mesh.material.needsUpdate = true;
      });

      // Preview.selected.renderer.toneMapping = THREE.LinearToneMapping;
      // Preview.selected.renderer.physicallyCorrectLights = true;

      // Preview.selected = this.preview;

      // Canvas.pbrMaterial = material;
    }

    deactivate() {
      // Outliner.elements.forEach((item) => {
      //   const mesh = item.getMesh();

      //   if (this.meshMaterials.has(mesh.uuid)) {
      //     mesh.material = this.meshMaterials.get(mesh.uuid);
      //   }
      // });
      Canvas.updateAll();
    }
  }

  BBPlugin.register(PLUGIN_ID, {
    title: "PBR Features",
    author: "Jason J. Gardner",
    description: "Adds PBR features to Blockbench",
    icon: "flare",
    variant: "both",
    await_loading: true,
    new_repository_format: true,
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
        onSelect() {
          pbrPreview.activate();

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
          pbrPreview.deactivate();
          displaySettingsPanel?.delete();
          materialPanel?.delete();
        },
        selectElements: false,
      });

      if (isApp) {
        sendToSubstanceAction = new Action("pbr.send_to_substance", {
          icon: "view_in_ar",
          description: "Send to Adobe Substance 3D",
          click: () => {
            console.log("Open Substance 3D");
            // Run command line to open Substance 3D
          },
        });
        MenuBar.addAction(sendToSubstanceAction, "file.export");
      }
    },
    onunload() {
      dialogBtn?.delete();
      dialogElement?.delete();
      pbrMode?.delete();
      displaySettingsPanel?.delete();
      materialPanel?.delete();
      styles?.delete();
      if (isApp) {
        sendToSubstanceAction?.delete();
      }
    },
  });
})();
