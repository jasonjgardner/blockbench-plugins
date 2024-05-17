"use strict";
(() => {
  // src/index.ts
  (() => {
    const { WebGLRenderer, PerspectiveCamera, Scene, MeshStandardMaterial } = THREE;
    let sendToSubstanceAction;
    let dialogBtn;
    let dialogElement;
    let panel;
    class PbrMaterial {
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
      static getTexture(name) {
        const projectsJson = localStorage.getItem("pbr_textures");
        const projects = projectsJson ? JSON.parse(projectsJson) : {};
        const projectData = projects[Project.uuid] ?? {};
        console.log("Project data", projectData);
        const filenameRegex = new RegExp(`_${name}(.[^.]+)?$`, "i");
        const src = Project.textures?.find(
          (t) => projectData[name] === t.uuid || filenameRegex.test(t.name)
        );
        if (!src) {
          return null;
        }
        const texture = new THREE.CanvasTexture(src.canvas);
        texture.needsUpdate = true;
        return texture;
      }
    }
    class PbrPreviewScene {
      constructor() {
        this.material = null;
        this.scene = new Scene();
        this.scene.background = new THREE.Color(1907997);
        this.scene.add(new THREE.AmbientLight(16711422, 0.125));
        const light = new THREE.DirectionalLight(16777215, 1);
        light.position.set(-5, 10, 10);
        light.castShadow = true;
        this.scene.add(light);
        this.scene.add(light.target);
        this.updateScene();
      }
      updateScene() {
        this.material = PbrPreviewScene.getMaterial();
        const meshes = PbrPreviewScene.getBbMesh(this.material);
        this.scene.add(...meshes);
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
          metalness: PbrPreviewScene.extractChannel(texture, 0) ?? void 0,
          emissive: PbrPreviewScene.extractChannel(texture, 1) ?? void 0,
          roughness: PbrPreviewScene.extractChannel(texture, 2) ?? void 0
        };
      }
      static getMaterial() {
        return new MeshStandardMaterial({
          map: PbrMaterial.getTexture("albedo") ?? new THREE.CanvasTexture(Texture.all[0]?.canvas),
          normalMap: PbrMaterial.getTexture("normal"),
          roughnessMap: PbrMaterial.getTexture("roughness"),
          metalnessMap: PbrMaterial.getTexture("metalness"),
          bumpMap: PbrMaterial.getTexture("heightmap"),
          emissiveMap: PbrMaterial.getTexture("emissive")
        });
      }
      static getBbMesh(material) {
        const meshes = [];
        Outliner.elements.forEach((item) => {
          const bbMesh = item.mesh;
          if (bbMesh instanceof THREE.Mesh) {
            const mesh = bbMesh.clone(true);
            mesh.material = material;
            mesh.geometry = bbMesh.geometry.clone();
            mesh.geometry.uvsNeedUpdate = true;
            if (bbMesh.parent) {
              mesh.position.copy(bbMesh.position).add(bbMesh.parent.position);
              mesh.rotation.copy(bbMesh.rotation);
              mesh.scale.copy(bbMesh.scale);
            }
            meshes.push(mesh);
          }
        });
        return meshes;
      }
    }
    const createPanelComponent = ({ panelSize }) => {
      return Vue.extend({
        name: "PbrTexturePreview",
        template: (
          /*html*/
          `
        <div class="pbr-preview">
          <div ref="canvas" class="pbr-preview__canvas"></div>
        </div>
        <style>
          .pbr-preview {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
          .pbr-preview__canvas {
            width: 100%;
            height: 100%;
            max-width: 100%;
            max-height: 100%;
            overflow: hidden;
          }
        </style>
      `
        ),
        data() {
          return {
            scene: new PbrPreviewScene(),
            renderer: new WebGLRenderer(),
            camera: new PerspectiveCamera(50, 1, 0.1, 2e3),
            zoomLevel: 7
          };
        },
        mounted() {
          this.renderer.setSize(panelSize, panelSize);
          if (this.$refs.canvas) {
            this.$refs.canvas.appendChild(this.renderer.domElement);
            this.init();
          }
        },
        methods: {
          init() {
            this.camera.position.z = this.zoomLevel;
            this.camera.position.y = this.zoomLevel;
            this.camera.position.x = this.zoomLevel;
            this.camera.lookAt(0, 0, 0);
            this.animate();
          },
          animate() {
            requestAnimationFrame(this.animate);
            this.scene.scene.rotation.y += 0.01;
            this.renderer.render(this.scene.scene, this.camera);
          }
        }
      });
    };
    const createDialogForm = () => {
      const options = {};
      Project.textures?.forEach((texture) => {
        if (!(texture instanceof Texture)) {
          return;
        }
        if (texture.name && texture.name.length > 0) {
          options[texture.uuid] = texture.name;
        }
      });
      return {
        color: {
          type: "color",
          label: "Color",
          value: "#ffffff"
        },
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
    BBPlugin.register("pbr_preview", {
      title: "PBR Features",
      author: "Jason J. Gardner",
      description: "Adds PBR features to Blockbench",
      icon: "flare",
      variant: "both",
      await_loading: true,
      new_repository_format: true,
      onload() {
        let panelSize = 600;
        panel = new Panel({
          id: "threejs_material_viewer",
          name: "PBR Material Preview",
          condition: { modes: ["edit", "paint"] },
          component: createPanelComponent({
            panelSize
          }),
          toolbars: [],
          icon: "flare",
          expand_button: true,
          default_position: {
            slot: "bottom",
            float_position: [0, 0],
            float_size: [400, 400],
            height: panelSize,
            folded: false
          },
          default_side: "left",
          insert_before: "paint",
          insert_after: "uv",
          onResize() {
          },
          onFold() {
          },
          display_condition: {
            modes: ["edit", "paint"],
            project: true
          }
        });
        dialogElement = new Dialog("pbr.dialog", {
          title: "PBR Channels",
          id: "pbr_dialog",
          form: createDialogForm() ?? {},
          onConfirm(formResult) {
            PbrMaterial.saveTexture("albedo", formResult.albedoMap);
            PbrMaterial.saveTexture("normal", formResult.normalMap);
            PbrMaterial.saveTexture("heightmap", formResult.heightMap);
            PbrMaterial.saveTexture("roughness", formResult.roughnessMap);
            PbrMaterial.saveTexture("metalness", formResult.metalnessMap);
            PbrMaterial.saveTexture("emissive", formResult.emissiveMap);
          }
          // sidebar: {
          //   pages: {
          //     normalMap: {
          //       icon: "altitude",
          //       label: "Normal Map",
          //     }
          //   },
          // }
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
        panel?.delete();
        if (isApp) {
          sendToSubstanceAction.delete();
        }
      }
    });
  })();
})();
//# sourceMappingURL=pbr_preview.js.map
