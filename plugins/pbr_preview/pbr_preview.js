"use strict";
(() => {
  // src/index.ts
  (() => {
    const { MeshStandardMaterial } = THREE;
    let sendToSubstanceAction;
    let dialogBtn;
    let dialogElement;
    let preview;
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
      },
      height: {
        id: "height",
        label: "Height",
        description: "The material's height map",
        map: "bumpMap"
      },
      roughness: {
        id: "roughness",
        label: "Roughness",
        description: "The material's roughness map",
        map: "roughnessMap"
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
          ...options
        });
      }
      static saveTexture(name, src) {
        localStorage.setItem(
          "pbr_textures",
          JSON.stringify({
            ...JSON.parse(localStorage.getItem("pbr_textures") ?? "{}"),
            [Project.uuid]: {
              ...JSON.parse(localStorage.getItem("pbr_textures") ?? "{}")[Project.uuid],
              [name]: src
            }
          })
        );
      }
      static removeTexture(name) {
        const projectsJson = localStorage.getItem("pbr_textures");
        const projects = projectsJson ? JSON.parse(projectsJson) : {};
        const projectData = projects[Project.uuid] ?? {};
        delete projectData[name];
        localStorage.setItem(
          "pbr_textures",
          JSON.stringify({
            ...projects,
            [Project.uuid]: projectData
          })
        );
      }
      static findTexture(name) {
        const projectsJson = localStorage.getItem("pbr_textures");
        const projects = projectsJson ? JSON.parse(projectsJson) : {};
        const projectData = projects[Project.uuid] ?? {};
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
        const canvas = texture.image;
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
      static decodeMer() {
        const texture = PbrMaterial.getTexture("mer");
        if (!texture) {
          return null;
        }
        return {
          metalness: PbrMaterial.extractChannel(texture, 0) ?? void 0,
          emissive: PbrMaterial.extractChannel(texture, 1) ?? void 0,
          roughness: PbrMaterial.extractChannel(texture, 2) ?? void 0
        };
      }
    }
    const createDisplaySettingsPanel = ({ preview: preview2 }) => {
      return Vue.extend({
        name: "DisplaySettingsPanel",
        template: (
          /*html*/
          `
        <div>
          <div class="form-group">
            <label for="exposure">Exposure</label>
            <input
              type="number"
              id="exposure"
              v-model="exposure"
              @change="updateExposure"
            />
          </div>
        </div>
      `
        ),
        data() {
          return {
            exposure: 1
          };
        },
        methods: {
          updateExposure() {
            preview2.renderer.toneMappingExposure = this.exposure;
            preview2.render();
          }
        }
      });
    };
    const createMaterialPanel = ({
      preview: preview2,
      activate,
      deactivate
    }) => {
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
          this.projectTextures = Project.textures ?? Texture.all;
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
            preview2.render();
          },
          unsetTexture() {
            PbrMaterial.saveTexture(this.channel.id, NA_CHANNEL);
            this.selectedTexture = null;
            activate({
              [this.channel.map]: null
            });
            preview2.render();
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
            textures: [],
            channels: CHANNELS
          };
        },
        mounted() {
          this.textures = Texture.all.map((texture) => texture.uuid);
        },
        methods: {},
        watch: {}
      });
    };
    class PbrPreview {
      constructor() {
        this._active = false;
        this.preview = new Preview({
          id: `${PLUGIN_ID}.preview`,
          antialias: true
        });
        if (Preview.selected) {
          this.preview.copyView(Preview.selected);
        }
        this.preview.renderer.physicallyCorrectLights = true;
      }
      activate(extendMaterial) {
        const envMap = PreviewScene.active?.cubemap ?? null;
        const material = PbrMaterial.getMaterial({
          envMap,
          ...extendMaterial
        });
        Outliner.elements.forEach((item) => {
          const mesh = item.getMesh();
          mesh.material = material;
          mesh.material.needsUpdate = true;
        });
        if (!this._active) {
          Preview.selected = this.preview;
          this._active = true;
        }
        this.preview.render();
      }
      deactivate() {
        Canvas.updateAll();
      }
      get active() {
        return this._active;
      }
      set active(value) {
        if (!this._active && value) {
          this.activate();
        }
        if (this._active && !value) {
          this.deactivate();
        }
        this._active = value;
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
        const pbrPreview = new PbrPreview();
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
      `
        );
        pbrMode = new Mode(`${PLUGIN_ID}_mode`, {
          name: "PBR",
          icon: "flare",
          onSelect() {
            pbrPreview.activate();
            pbrPreview.preview.fullscreen();
            displaySettingsPanel = new Panel(`${PLUGIN_ID}.display_settings`, {
              name: "Display Settings",
              id: `${PLUGIN_ID}.display_settings_panel`,
              icon: "display_settings",
              toolbars: [],
              display_condition: {
                modes: [`${PLUGIN_ID}_mode`],
                project: true
              },
              component: createDisplaySettingsPanel({
                preview
              }),
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
        if (isApp) {
          sendToSubstanceAction = new Action("pbr.send_to_substance", {
            icon: "view_in_ar",
            description: "Send to Adobe Substance 3D",
            click: () => {
              console.log("Open Substance 3D");
            }
          });
          MenuBar.addAction(sendToSubstanceAction, "file.export");
        }
      },
      onunload() {
        dialogBtn?.delete();
        dialogElement?.delete();
        preview?.delete();
        pbrMode?.delete();
        displaySettingsPanel?.delete();
        materialPanel?.delete();
        styles?.delete();
        if (isApp) {
          sendToSubstanceAction?.delete();
        }
      }
    });
  })();
})();
//# sourceMappingURL=pbr_preview.js.map
