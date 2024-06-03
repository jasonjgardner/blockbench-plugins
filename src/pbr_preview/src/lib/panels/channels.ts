import { registry, setups, CHANNELS, NA_CHANNEL } from "../../constants";
import { vue as Vue } from "../../deps";

setups.push(() => {
  const component = Vue.extend({
    name: "ChannelsPanel",
    data() {
      return {
        channels: CHANNELS,
      };
    },
    methods: {
      openMenu(event: MouseEvent) {
        registry.channelMenu?.open(event);
      },
      canShowChannel(texture: Texture | TextureLayer) {
        return texture.channel && texture.channel !== NA_CHANNEL;
      },
    },
    computed: {
      textures: () =>
        Texture.all.map((t) => (t.layers_enabled ? t.layers : [t])).flat(),
    },
    template: /* html */ `
				<div>
					<ul class="list mobile_scrollbar" ref="channel_list" id="channel_list">
						<li
							v-for="texture in textures"
							v-bind:texid="texture.uuid"
              v-on:click.stop="texture.select($event)"
              v-on:dblclick="openMenu($event)"
              v-if="canShowChannel(texture)"
							:key="texture.uuid"
							class="texture"
						>
            <img :src="texture.img.src" :alt="texture.name" width="48" height="48" />
            <div class="texture_description_wrapper texture_channel_description">
              <div class="texture_name">{{ texture.name }}</div>
              <div class="texture_channel_wrapper">
              <div class="texture_channel">{{ channels[texture.channel].label }}</div>
              <i class="material-icons texture_particle_icon">{{ channels[texture.channel].icon }}</i>
  </div>
            </div>
						</li>
					</ul>
				</div>
			`,
  });

  registry.channelsPanelStyle = Blockbench.addCSS(/* css */ `
    .texture_channel {
      background-color: var(--color-ui);
      color: var(--color-text, currentColor);
      flex: 1;
      font-size: 1em;
      margin: 0 0 0 auto;
      padding: 0 8px;
      text-align: right;
    }

    .texture_channel + .texture_particle_icon {
      background-color: var(--color-ui);
      padding-right: 8px;
    }

    .texture_channel_description {
      background-color: var(--color-back);
      display: flex;
      flex-direction: row;
      flex-wrap: nowrap;
      justify-content: space-between;
    }
    
    .texture_channel_wrapper {
      align-items: center;
      background-color: var(--color-ui);
      display: flex;
      flex: 1;
      flex-direction: row;
      align-items: center;
      flex-wrap: nowrap;
      padding: 0 8px;
    }

    .texture_channel_description .texture_name {
      align-items: center;
      color: var(--color-subtle_text);
      display: flex;
      flex: 1;
    }

    .texture_channel_description:hover .texture_channel {
      color: var(--color-accent);
    }

    #channel_list {
      display: flex;
      flex-direction: column;
    }

    #channel_list .texture {
      padding-right: 0;
    }
  `);

  registry.channelsPanel = new Panel("channels_panel", {
    name: "PBR Channels",
    id: "channels_panel",
    icon: "tv",
    display_condition: {
      modes: ["paint", "edit", "animate"],
      project: true,
    },
    toolbars: [
      new Toolbar("channel_assignment_toolbar", {
        id: "channel_assignment_toolbar",
        children: ["create_material_texture", "show_channel_menu"],
        name: "PBR Channel Controls",
      }),
    ],
    component,
    expand_button: true,
    growable: false,
    onFold() {},
    onResize() {},
    default_side: "left",
    default_position: {
      slot: "left_bar",
      float_position: [0, 0],
      float_size: [400, 300],
      height: 300,
      folded: true,
    },
    insert_after: "layers",
    insert_before: "color",
  });
});
