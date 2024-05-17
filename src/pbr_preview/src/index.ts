/**
 * @author jasonjgardner
 * @discord jason.gardner
 * @github https://github.com/jasonjgardner
 */
/// <reference types="three" />
/// <reference path="../../../types/index.d.ts" />
(() => {
  const {
    WebGLRenderer,
    PerspectiveCamera,
    Scene,
    MeshStandardMaterial,
    OrbitControls,
  } = THREE;

  let sendToSubstanceAction: Action;
  let dialogBtn: Action;
  let dialogElement: Dialog;
  let panel: Panel;

  const NA_CHANNEL = "_NONE_";

  class PbrMaterial {
    static getMaterial() {
      // const mer = PbrPreviewScene.decodeMer();

      const emissiveMap = PbrMaterial.getTexture("emissive");

      return new MeshStandardMaterial({
        map:
          PbrMaterial.getTexture("albedo") ??
          new THREE.CanvasTexture(Texture.all[0]?.canvas),
        normalMap: PbrMaterial.getTexture("normal"),
        roughnessMap: PbrMaterial.getTexture("roughness"),
        metalnessMap: PbrMaterial.getTexture("metalness"),
        bumpMap: PbrMaterial.getTexture("heightmap"),
        emissiveMap,
        emissiveIntensity: emissiveMap ? 1 : 0,
        emissive: emissiveMap ? 0xffffff : 0,
      });
    }

    static saveTexture(name: string, src: string) {
      localStorage.setItem(
        "pbr_textures",
        JSON.stringify({
          ...JSON.parse(localStorage.getItem("pbr_textures") ?? "{}"),
          [Project.uuid]: {
            ...JSON.parse(localStorage.getItem("pbr_textures") ?? "{}")[
              Project.uuid
            ],
            [name]: src,
          },
        }),
      );
    }

    static getTexture(name: string) {
      const projectsJson = localStorage.getItem("pbr_textures");
      const projects = projectsJson ? JSON.parse(projectsJson) : {};

      const projectData = projects[Project.uuid] ?? {};

      const filenameRegex = new RegExp(`_${name}(\.[^.]+)?$`, "i");
      const src = Project.textures?.find(
        (t: Texture) =>
          projectData[name] === t.uuid || (filenameRegex.test(t.name) && projectData[name] !== NA_CHANNEL),
      );

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
  class PbrPreviewScene {
    scene: THREE.Scene;
    material: THREE.MeshStandardMaterial | null = null;

    constructor() {
      this.scene = new Scene();
      this.scene.background = new THREE.Color(0x1d1d1d);
      this.scene.add(new THREE.AmbientLight(0xfefefe, 0.75));

      this.addLights({
        position: new THREE.Vector3(-5, 10, 10),
      });

      this.scene.fog = new THREE.Fog(0xffffff, 5, 100);

      this.updateScene();
    }

    addLights({
      color = 0xffffff,
      intensity = 1,
      position,
    }: {
      color?: THREE.Color | string | number;
      intensity?: number;
      position?: THREE.Vector3;
    } = {}) {
      // Create a directional light
      const light = new THREE.DirectionalLight(color, intensity);
      light.position.set(0, 0, 0);

      if (position) {
        light.position.copy(position);
      }

      light.target.position.set(0, 0, 0);

      light.castShadow = true;

      this.scene.add(light);
      this.scene.add(light.target);
    }

    updateScene() {
      this.material = PbrMaterial.getMaterial();

      const meshes = PbrPreviewScene.getBbMesh(this.material);

      this.scene.add(...meshes);
    }

    static getBbMesh(material: THREE.MeshStandardMaterial) {
      const meshes: THREE.Mesh[] = [];
      // Get currently visible Blockbench mesh
      Outliner.elements.forEach((item) => {
        const bbMesh = item.mesh;

        if (bbMesh instanceof THREE.Mesh) {
          const mesh = bbMesh.clone(true);

          mesh.material = material;
          mesh.geometry = bbMesh.geometry.clone();
          mesh.geometry.uvsNeedUpdate = true;

          if (bbMesh.parent) {
            // Ensure the mesh is in the same position as the original and offset by its parent
            mesh.position.copy(bbMesh.position).add(bbMesh.parent.position);
            // Apply rotation and origin
            mesh.rotation.copy(bbMesh.rotation);
            mesh.scale.copy(bbMesh.scale);
          }

          meshes.push(mesh);
        }
      });

      return meshes;
    }
  }

  const createPanelComponent = ({ panelSize, scene }: { panelSize: number, scene: PbrPreviewScene }) => {
    return Vue.extend({
      name: "PbrTexturePreview",
      template: /*html*/ `
        <div class="pbr-preview">
          <div ref="canvas" class="pbr-preview__canvas"></div>
          <button type="button" v-on:click="toggleAnimation">
            <span v-if="runAnimation">Stop</span>
            <span v-else>Start</span>
          </button>
          <button type="button" v-on:click="updateScene">
            Reload
          </button>
          <button type="button" v-on:click="resetRotation">
            Reset
          </button>
          <label for="zoom">Zoom</label>
          <input
            type="range"
            id="zoom"
            v-model="zoomLevel"
            min="1"
            max="20"
            step="1"
          />
          <p>{{ zoomLevel }}&times;</p>
          <label for="fov">Field of View</label>
          <input
            type="range"
            id="fov"
            v-model="fov"
            min="1"
            max="180"
            step="1"
          />
          <p>{{ fov }}&deg;</p>
          <label for="rotationAxis">Rotation Axis</label>
          <select id="rotationAxis" v-model="rotationAxis">
            <option value="x">X</option>
            <option value="y">Y</option>
            <option value="z">Z</option>
          </select>
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
      `,
      data(): {
        scene: PbrPreviewScene;
        renderer: THREE.WebGLRenderer | null;
        canvas: HTMLElement | null;
        camera: THREE.PerspectiveCamera | null;
        zoomLevel: number;
        runAnimation: boolean;
        fov: number;
        rotationAxis: "x" | "y" | "z";
      } {
        return {
          scene,
          renderer: null,
          canvas: null,
          camera: null,
          zoomLevel: 7,
          runAnimation: true,
          fov: 75,
          rotationAxis: "y",
        };
      },
      beforeDestroy() {
        this.renderer?.dispose();
      },
      mounted() {
        this.renderer = new WebGLRenderer({ antialias: true });
        this.renderer.setSize(panelSize, panelSize);
        this.renderer.physicallyCorrectLights = true;

        if (this.$refs.canvas) {
          this.canvas = (this.$refs.canvas as Element).appendChild(
            this.renderer.domElement,
          );
          this.init();
        }
      },
      methods: {
        init() {
          this.setCamera();

          // const controls = new OrbitControls(this.camera, );
          // controls.target.set(0, 5, 0);
          // controls.update();

          this.animate();
        },
        toggleAnimation() {
          this.runAnimation = !this.runAnimation;

          if (this.runAnimation) {
            this.animate();
          }
        },
        updateScene() {
          this.scene.updateScene();
        },
        setCamera() {
          this.camera = new PerspectiveCamera(this.fov, 1, 0.1, 1000);
          this.camera.position.z = this.zoomLevel;
          this.camera.position.y = this.zoomLevel;
          this.camera.position.x = this.zoomLevel;

          this.camera.lookAt(0, 0, 0);
        },
        animate() {
          if (!this.runAnimation) {
            return;
          }

          requestAnimationFrame(this.animate);

          this.scene.scene.rotation[this.rotationAxis] += 0.01;
          this.render();
        },
        resetRotation() {
          this.scene.scene.rotation.set(0, 0, 0);
          this.render();
        },
        render() {
          this.renderer?.render(
            this.scene.scene,
            this.camera ?? new PerspectiveCamera(),
          );
        },
      },
      watch: {
        zoomLevel() {
          this.setCamera();
          this.render();
        },
        fov() {
          this.setCamera();
          this.render();
        },

      },
    });
  };

  const createDialogForm = (): DialogOptions["form"] => {
    const options: DialogFormElement["options"] = {
      [NA_CHANNEL]: "None",
    };

    Project.textures?.forEach((texture: Texture | any) => {
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
        value: "#ffffff",
      },
      albedoMap: {
        label: "Albedo Map",
        description: "Select a file for the albedo channel",
        type: "select",
        options,
      },
      normalMap: {
        label: "Normal Map",
        description: "Select a texture for the normal map channel",
        type: "select",
        options,
      },
      heightMap: {
        label: "Height Map",
        description: "Select a file for the heightmap/bump map channel",
        type: "select",
        options,
      },
      roughnessMap: {
        label: "Roughness Map",
        description: "Select a file for the roughness channel",
        type: "select",
        options,
      },
      metalnessMap: {
        label: "Metalness Map",
        description: "Select a file for the metallic channel",
        type: "select",
        options,
      },
      emissiveMap: {
        label: "Emissive Map",
        description: "Select a file for the emissive channel",
        type: "select",
        options,
      },
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
      const scene = new PbrPreviewScene();

      panel = new Panel({
        id: "threejs_material_viewer",
        name: "PBR Material Preview",
        condition: { modes: ["edit", "paint"] },
        component: createPanelComponent({
          panelSize,
          scene,
        }),
        toolbars: [],
        icon: "flare",
        expand_button: true,
        default_position: {
          slot: "bottom",
          float_position: [0, 0],
          float_size: [400, 400],
          height: panelSize,
          folded: false,
        },
        default_side: "left",
        insert_before: "paint",
        insert_after: "uv",
        onResize() {},
        onFold() {},
        display_condition: {
          modes: ["edit", "paint"],
          project: true,
        },
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
          scene.updateScene();
        },
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
        },
      });

      MenuBar.addAction(dialogBtn, "tools.pbr");

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
      panel?.delete();
      if (isApp) {
        sendToSubstanceAction.delete();
      }
    },
  });
})();
