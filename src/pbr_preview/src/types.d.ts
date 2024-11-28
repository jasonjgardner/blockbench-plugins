export type Channel =
  | "albedo"
  | "metalness"
  | "emissive"
  | "roughness"
  | "height"
  | "normal"
  | "ao"
  | "alpha"
  | "displacement"
  | "specular"
  | "specularColor";

export interface IChannel {
  label: string;
  description: string;
  map: string;
  id: string;
  icon?: string;
  default?: THREE.Color;
  regex?: RegExp;
}

export interface ILightrParams {
  lightHeight?: number;
  ambientLight?: [number, number, number];
  minLightIntensity?: number;
  lightDiffuse?: [number, number, number];
}

export interface IPbrMaterials {
  [materialUuid: string]: {
    [channelId: string]: string;
  };
}

export interface IBbMat {
  version: number;
  channels: Record<Channel | "preview", string>;
}

export interface IRegistry {
  bakeTexturesAction: Action;
  bakeTexturesDialog: Dialog;
  brushEmissiveColor: ColorPicker;
  brushHeightSlider: NumSlider;
  brushMetalnessSlider: NumSlider;
  brushRoughnessSlider: NumSlider;
  channelMenu: Menu;
  channelProp: Property;
  createMaterialTexture: Action;
  createTextureSet: Action;
  decodeMer: Action;
  displaySettingsPanel: Panel;
  exposureSlider: NumSlider;
  resetExposure: Action;
  generateMer: Action;
  generateNormal: Action;
  generateAo: Action;
  generateLabPbr: Action;
  decodeLabPbr: Action;
  materialBrushPanel: Panel;
  materialBrushTool: Tool;
  openChannelMenu: Action;
  pbrMaterialsProp: Property;
  pbrShaderMode: BarSelect;
  pbrShaderModeProp: Property;
  projectMaterialsProp: Property;
  projectPbrModeProp: Property;
  setBrushMaterial: Action;
  showChannelMenu: Action;
  textureChannelProp: Property;
  textureSetDialog: Dialog;
  toggleCorrectLights: Toggle;
  togglePbr: Toggle;
  tonemappingSelect: BarSelect;
  unassignChannel: Action;
  userMaterialBrushPresets: Dialog;
  exportUsdz: Action;
  usdz: Codec;
  bbmat: Codec;
  bbMatExport: Action;
  bbMatImport: Action;
  [key: string]: Deletable;
}

type MeshMaterialTypes =
  | "MeshStandardMaterial"
  | "MeshPhysicalMaterial"
  | "ShaderMaterial"
  | "MeshBasicMaterial"
  | "MeshPhongMaterial"
  | "MeshToonMaterial"
  | "MeshLambertMaterial"
  | "MeshMatcapMaterial"
  | "MeshDepthMaterial"
  | "MeshDistanceMaterial"
  | "MeshNormalMaterial";

export interface PbrProject extends ModelProject {
  pbr_shader: MeshMaterialTypes | "Blockbench";
  pbr_materials: Record<string, Record<IChannel["id"], string>>;
  bb_materials: Record<string, ModelProject["materials"]>;
}

export interface PbrTexture extends Texture {
  channel: IChannel["id"];
  extend(data: TextureData & { channel: IChannel["id"] }): void;
}
