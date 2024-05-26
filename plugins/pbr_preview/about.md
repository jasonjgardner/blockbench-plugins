## Features

### PBR Material Preview
- Preview PBR textures in Edit and Paint mode.

#### Auto-Updated Preview
- PBR materials are updated with every edit to provide a (nearly) live painting preview of the material in Blockbench.

### Decode MER
- MERs can be inferred and decoded automatically when PBR mode is enabled.
- Decoding can be _slow_ on large textures.
- Assign an albedo map prior to decoding a MER to extract the emissive color.

### Export MER
- Compiles metal, emissive and roughness channels into MER texture.

### Generate Normal Map
- Calculate normal map based on the assigned or inferred height map for the currently selected material/texture.

### Export Texture Set
- Export texture set dialog

## Usage

### Display Settings

#### Toggle PBR

#### Toggle Corrected Lighting

#### Tone Mapping

#### Exposure

### Channel Management

#### Channel Naming Convention

The plugin will assume that textures and layers which end in an underscore and a channel name are intended to be used as that channel. For example, `texture_roughness` will be used as the roughness map unless the channel has been manually assigned a texture.

#### Supported Channels
| Channel   | Description | Colorspace |
|-----------|-------------|------------|
| `ao`      | Ambient Occlusion | __BW__ |
| `albedo`  | Albedo / Base Color | __RGB__ |
| `normal`  | DirectX Normal Map | __RGB__ |
| `metalness` | Metallic map | __BW__ |
| `roughness` | Roughness map | __BW__ |
| `emissive` | Emissive map | Displayed in __RGB__; Exported as __BW__ in MER |
| `sss` | Subsurface Scattering | __BW__; Not supported by shader but exported in MER alpha channel |

#### Explicit Channel Assignment

#### Removing Channel Assignment