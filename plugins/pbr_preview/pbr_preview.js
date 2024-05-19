"use strict";
(() => {
  // src/index.ts
  (() => {
    const { MeshStandardMaterial } = THREE;
    let sendToSubstanceAction;
    let dialogBtn;
    let dialogElement;
    let preview;
    const NA_CHANNEL = "_NONE_";
    const PLUGIN_ID = "pbr_preview";
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
      static getTexture(name) {
        const projectsJson = localStorage.getItem("pbr_textures");
        const projects = projectsJson ? JSON.parse(projectsJson) : {};
        const projectData = projects[Project.uuid] ?? {};
        const filenameRegex = new RegExp(`_${name}(.[^.]+)?$`, "i");
        const src = Project.textures?.find(
          (t) => projectData[name] === t.uuid || filenameRegex.test(t.name) && projectData[name] !== NA_CHANNEL
        );
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
    const createDialogForm = () => {
      const options = {
        [NA_CHANNEL]: "None"
      };
      Project.textures?.forEach((texture) => {
        if (!(texture instanceof Texture)) {
          return;
        }
        if (texture.name && texture.name.length > 0) {
          options[texture.uuid] = texture.name;
        }
      });
      return {
        albedoMap: {
          label: "Albedo Map",
          description: "Select a file for the albedo channel",
          type: "select",
          options
        },
        normalMap: {
          label: "Normal Map",
          description: "Select a texture for the normal map channel",
          type: "select",
          options
        },
        aoMap: {
          label: "Ambient Occlusion Map",
          description: "Select a file for the ambient occlusion channel",
          type: "select",
          options
        },
        heightMap: {
          label: "Height Map",
          description: "Select a file for the heightmap/bump map channel",
          type: "select",
          options
        },
        roughnessMap: {
          label: "Roughness Map",
          description: "Select a file for the roughness channel",
          type: "select",
          options
        },
        metalnessMap: {
          label: "Metalness Map",
          description: "Select a file for the metallic channel",
          type: "select",
          options
        },
        emissiveMap: {
          label: "Emissive Map",
          description: "Select a file for the emissive channel",
          type: "select",
          options
        }
      };
    };
    const meshMaterials = /* @__PURE__ */ new Map();
    const activatePbrPreview = () => {
      preview = new Preview({
        id: `${PLUGIN_ID}.preview`,
        antialias: true
      });
      if (Preview.selected) {
        preview.copyView(Preview.selected);
      }
      preview.renderer.physicallyCorrectLights = true;
      const envMap = PreviewScene.active?.cubemap ?? null;
      const material = PbrMaterial.getMaterial({
        envMap
      });
      Outliner.elements.forEach((item) => {
        const mesh = item.getMesh();
        meshMaterials.set(mesh.uuid, mesh.material);
        mesh.material = material;
      });
      preview.fullscreen();
    };
    const deactivatePbrPreview = () => {
      Outliner.elements.forEach((item) => {
        const mesh = item.getMesh();
        if (meshMaterials.has(mesh.uuid)) {
          mesh.material = meshMaterials[mesh.uuid];
        }
      });
      Canvas.updateAll();
    };
    BBPlugin.register(PLUGIN_ID, {
      title: "PBR Features",
      author: "Jason J. Gardner",
      description: "Adds PBR features to Blockbench",
      icon: "flare",
      variant: "both",
      await_loading: true,
      new_repository_format: true,
      onload() {
        const pbrMode = new Mode(`${PLUGIN_ID}.mode`, {
          name: "PBR",
          icon: "flare",
          onSelect() {
            activatePbrPreview();
          },
          onUnselect() {
            deactivatePbrPreview();
          },
          selectElements: false
        });
        BARS.defineActions(() => {
          new Action(`${PLUGIN_ID}.enable_pbr_mode`, {
            name: "PBR Mode",
            icon: "flare",
            click() {
              pbrMode.select();
            }
          });
        });
        dialogElement = new Dialog("pbr.dialog", {
          title: "PBR Channels",
          id: "pbr_dialog",
          // TODO: Recreate with project change
          form: createDialogForm() ?? {},
          onConfirm(formResult) {
            [
              "albedo",
              "normal",
              "height",
              "roughness",
              "metalness",
              "emissive",
              "ao"
            ].forEach((channel) => {
              const value = formResult[`${channel}Map`];
              if (!value || value === NA_CHANNEL) {
                PbrMaterial.removeTexture(channel);
                return;
              }
              PbrMaterial.saveTexture(channel, value);
            });
          }
        });
        dialogBtn = new Action("pbr.show_dialog", {
          name: "Add PBR",
          icon: "flare",
          description: "Show PBR options",
          click: () => {
            dialogElement.show();
          }
        });
        MenuBar.addAction(dialogBtn, "tools.pbr");
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
        meshMaterials.clear();
        if (isApp) {
          sendToSubstanceAction.delete();
        }
      }
    });
  })();
})();
//# sourceMappingURL=pbr_preview.js.map
