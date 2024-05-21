"use strict";
(() => {
  // src/index.ts
  (() => {
    const { MeshStandardMaterial } = THREE;
    let generateMer;
    let pbrPreview;
    let pbrMode;
    let displaySettingsPanel;
    let materialPanel;
    let styles;
    const NA_CHANNEL = "_NONE_";
    const PLUGIN_ID = "pbr_preview";
    const CHANNELS = {
      albedo: {
        id: "albedo",
        label: "Albedo",
        description: "The color of the material",
        map: "map"
      },
      metalness: {
        id: "metalness",
        label: "Metalness",
        description: "The material's metalness map",
        map: "metalnessMap"
      },
      emissive: {
        id: "emissive",
        label: "Emissive",
        description: "The material's emissive map",
        map: "emissiveMap"
      },
      roughness: {
        id: "roughness",
        label: "Roughness",
        description: "The material's roughness map",
        map: "roughnessMap"
      },
      height: {
        id: "height",
        label: "Height",
        description: "The material's height map",
        map: "bumpMap"
      },
      normal: {
        id: "normal",
        label: "Normal",
        description: "The material's normal map",
        map: "normalMap"
      },
      ao: {
        id: "ao",
        label: "Ambient Occlusion",
        description: "The material's ambient occlusion map",
        map: "aoMap"
      }
    };
    class PbrMaterial {
      static getMaterial(options = {}) {
        const emissiveMap = PbrMaterial.getTexture("emissive");
        return new MeshStandardMaterial({
          map: PbrMaterial.getTexture("albedo") ?? new THREE.CanvasTexture(Texture.all[0]?.canvas),
          aoMap: PbrMaterial.getTexture("ao"),
          normalMap: PbrMaterial.getTexture("normal"),
          roughnessMap: PbrMaterial.getTexture("roughness"),
          metalnessMap: PbrMaterial.getTexture("metalness"),
          bumpMap: PbrMaterial.getTexture("heightmap"),
          emissiveMap,
          emissiveIntensity: emissiveMap ? 1 : 0,
          emissive: emissiveMap ? 16777215 : 0,
          envMap: PreviewScene.active?.cubemap ?? null,
          envMapIntensity: 1,
          ...options
        });
      }
      static projectId() {
        if (!Project) {
          return "default";
        }
        return Project.save_path ?? Project.model_identifier ?? Project.uuid ?? "default";
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
      static saveTexture(name, src) {
        const projects = PbrMaterial.getProjectsData();
        const id = PbrMaterial.projectId();
        localStorage.setItem(
          `${PLUGIN_ID}.pbr_textures`,
          JSON.stringify({
            ...projects,
            [id]: {
              ...projects[id],
              [name]: src
            }
          })
        );
      }
      static removeTexture(name) {
        const id = PbrMaterial.projectId();
        const projects = PbrMaterial.getProjectsData();
        const projectData = PbrMaterial.getProjectData();
        delete projectData[name];
        localStorage.setItem(
          `${PLUGIN_ID}.pbr_textures`,
          JSON.stringify({
            ...projects,
            [id]: projectData
          })
        );
      }
      static findTexture(name) {
        if (!Project) {
          return null;
        }
        const projectData = PbrMaterial.getProjectData();
        const filenameRegex = new RegExp(`_${name}(.[^.]+)?$`, "i");
        return Project.textures?.find(
          (t) => projectData[name] === t.uuid || filenameRegex.test(t.name) && projectData[name] !== NA_CHANNEL
        ) ?? null;
      }
      static getTexture(name) {
        const src = PbrMaterial.findTexture(name);
        if (!src) {
          return null;
        }
        const texture = new THREE.CanvasTexture(src.canvas);
        texture.needsUpdate = true;
        return texture;
      }
      static extractChannel(texture, channel) {
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
        const channelData = new Uint8Array(width * height);
        const size = width * height * 4;
        for (let idx = 0; idx < size; idx += 4) {
          const stride = idx / 4;
          channelData[stride] = data[idx + channelIdx];
          channelData[stride + 1] = data[idx + channelIdx];
          channelData[stride + 2] = data[idx + channelIdx];
          channelData[stride + 3] = 255;
        }
        const channelImageData = channelCtx.createImageData(width, height);
        channelImageData.data.set(channelData);
        channelCtx.putImageData(channelImageData, 0, 0);
        return channelCanvas;
      }
      static decodeMer() {
        const texture = PbrMaterial.findTexture("mer");
        if (!texture) {
          return null;
        }
        const metal = PbrMaterial.extractChannel(texture, "r");
        const emissive = PbrMaterial.extractChannel(texture, "g");
        const roughness = PbrMaterial.extractChannel(texture, "b");
        const sss = PbrMaterial.extractChannel(texture, "a");
        return {
          metalness: metal ? new THREE.CanvasTexture(metal) : void 0,
          emissive: emissive ? new THREE.CanvasTexture(emissive) : void 0,
          roughness: roughness ? new THREE.CanvasTexture(roughness) : void 0,
          sss: sss ? new THREE.CanvasTexture(sss) : void 0
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
          Project ? Project.texture_width : 0
        );
        const height = Math.max(
          metalness?.height ?? 0,
          emissive?.height ?? 0,
          roughness?.height ?? 0,
          Project ? Project.texture_height : 0
        );
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return null;
        }
        const metalnessCanvas = metalness?.img ? PbrMaterial.extractChannel(metalness, "r") : null;
        const emissiveCanvas = emissive?.img ? PbrMaterial.extractChannel(emissive, "g") : null;
        const roughnessCanvas = roughness?.img ? PbrMaterial.extractChannel(roughness, "b") : null;
        const sssCanvas = sss?.img ? PbrMaterial.extractChannel(sss, "a") : null;
        const metalnessData = metalnessCanvas?.getContext("2d")?.getImageData(0, 0, width, height) ?? new ImageData(width, height);
        const emissiveData = emissiveCanvas?.getContext("2d")?.getImageData(0, 0, width, height) ?? new ImageData(width, height);
        const roughnessData = roughnessCanvas?.getContext("2d")?.getImageData(0, 0, width, height) ?? new ImageData(width, height);
        const sssData = sssCanvas?.getContext("2d")?.getImageData(0, 0, width, height) ?? new ImageData(
          new Uint8ClampedArray(width * height * 4).fill(255),
          width,
          height
        );
        const size = width * height * 4;
        const data = new Uint8Array(size);
        for (let idx = 0; idx < size; idx += 4) {
          const stride = idx / 4;
          data[idx] = metalnessData.data[stride] ?? 0;
          data[idx + 1] = emissiveData.data[stride] ?? 0;
          data[idx + 2] = roughnessData.data[stride] ?? 0;
          data[idx + 3] = sssData.data[stride] ?? 255;
        }
        const imageData = ctx.createImageData(width, height);
        imageData.data.set(data);
        ctx.putImageData(imageData, 0, 0);
        return canvas;
      }
    }
    const createDisplaySettingsPanel = ({ activate }) => {
      return Vue.extend({
        name: "DisplaySettingsPanel",
        template: (
          /*html*/
          `
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
      `
        ),
        data() {
          return {
            toneMapping: Preview.selected.renderer.toneMapping,
            exposure: Preview.selected.renderer.toneMappingExposure,
            correctLights: Preview.selected.renderer.physicallyCorrectLights
          };
        },
        watch: {
          toneMapping: {
            handler(value) {
              Preview.selected.renderer.toneMapping = value;
              activate();
            },
            immediate: true
          },
          correctLights: {
            handler(value) {
              Preview.selected.renderer.physicallyCorrectLights = value;
              activate();
            },
            immediate: true
          },
          exposure: {
            handler(value) {
              Preview.selected.renderer.toneMappingExposure = value;
            },
            immediate: true
          }
        }
      });
    };
    const createMaterialPanel = ({ activate }) => {
      const ChannelButton = Vue.extend({
        name: "ChannelButton",
        props: {
          channel: Object
        },
        template: (
          /*html*/
          `
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
      `
        ),
        data() {
          return {
            selectedTexture: null,
            projectTextures: []
          };
        },
        mounted() {
          this.projectTextures = Project ? Project.textures ?? Texture.all : Texture.all;
          this.selectedTexture = PbrMaterial.findTexture(this.channel.id);
        },
        methods: {
          assignId(label) {
            return `channel_${label.toLowerCase().replace(/\s/g, "-")}`;
          },
          setTexture(event) {
            const texture = this.projectTextures.find(
              (t) => t.uuid === event.target.value
            );
            if (!texture) {
              return;
            }
            PbrMaterial.saveTexture(this.channel.id, texture.uuid);
            this.selectedTexture = texture;
            activate({
              [this.channel.map]: new THREE.CanvasTexture(texture.canvas)
            });
          },
          unsetTexture() {
            PbrMaterial.saveTexture(this.channel.id, NA_CHANNEL);
            this.selectedTexture = null;
            activate({
              [this.channel.map]: null
            });
          }
        }
      });
      return Vue.extend({
        name: "MaterialPanel",
        components: {
          ChannelButton
        },
        template: (
          /*html*/
          `
        <div>
          <div v-for="(channel, key) in channels" :key="key">
            <ChannelButton :channel="channel" />
          </div>
        </div>
      `
        ),
        data() {
          return {
            channels: CHANNELS
          };
        }
      });
    };
    class PbrPreview {
      activate(extendMaterial) {
        const material = PbrMaterial.getMaterial(extendMaterial);
        Outliner.elements.forEach((item) => {
          const mesh = item.getMesh();
          if (mesh.isObject3D && !mesh.isMesh) {
            return;
          }
          mesh.material = material;
        });
      }
      deactivate() {
        Canvas.updateAll();
      }
    }
    generateMer = new Action(`${PLUGIN_ID}.create_mer`, {
      icon: "lightbulb_circle",
      name: "Generate MER",
      click() {
        const mer = PbrMaterial.createMer();
        if (!mer) {
          return;
        }
        mer.toBlob(async (blob) => {
          if (!blob) {
            return;
          }
          const [name, startpath] = Project ? [`${Project.model_identifier ?? Project.name}_mer`, Project.export_path] : ["mer"];
          Blockbench.export({
            content: await blob.arrayBuffer(),
            type: "PNG",
            name,
            extensions: ["png"],
            resource_id: "mer",
            savetype: "image",
            startpath
          });
        });
      }
    });
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
        styles = Blockbench.addCSS(
          /*css*/
          `
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
      `
        );
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
                project: true
              },
              component: createDisplaySettingsPanel(pbrPreview),
              expand_button: true,
              onFold() {
              },
              onResize() {
              },
              default_side: "right",
              default_position: {
                slot: "right_bar",
                float_position: [0, 0],
                float_size: [400, 500],
                height: 300,
                folded: false
              },
              insert_after: "uv",
              insert_before: "paint"
            });
            materialPanel = new Panel(`${PLUGIN_ID}.material`, {
              name: "Material",
              id: `${PLUGIN_ID}.material_panel`,
              icon: "stacks",
              toolbars: [],
              display_condition: {
                modes: [`${PLUGIN_ID}_mode`],
                project: true
              },
              component: createMaterialPanel(pbrPreview),
              expand_button: true,
              onFold() {
              },
              onResize() {
              },
              default_side: "left",
              default_position: {
                slot: "left_bar",
                float_position: [0, 0],
                float_size: [400, 500],
                height: 600,
                folded: false
              },
              insert_after: `${PLUGIN_ID}.display_settings`,
              insert_before: ""
            });
          },
          onUnselect() {
            pbrPreview.deactivate();
            displaySettingsPanel?.delete();
            materialPanel?.delete();
          },
          selectElements: false
        });
        MenuBar.addAction(generateMer, "file.export");
      },
      onunload() {
        pbrMode?.delete();
        displaySettingsPanel?.delete();
        materialPanel?.delete();
        generateMer?.delete();
        styles?.delete();
      }
    });
  })();
})();
//# sourceMappingURL=pbr_preview.js.map
