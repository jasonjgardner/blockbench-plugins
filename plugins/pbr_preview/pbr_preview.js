"use strict";(()=>{(()=>{let{MeshStandardMaterial:q}=THREE,C,j,P,b,H,I,y,D,L,_,p="pbr_preview",U="1.0.0",S="_NONE_",m={albedo:{id:"albedo",label:"Albedo",description:"The color of the material",map:"map"},metalness:{id:"metalness",label:"Metalness",description:"The material's metalness map",map:"metalnessMap"},emissive:{id:"emissive",label:"Emissive",description:"The material's emissive map",map:"emissiveMap"},roughness:{id:"roughness",label:"Roughness",description:"The material's roughness map",map:"roughnessMap"},height:{id:"height",label:"Height",description:"The material's height map",map:"bumpMap"},normal:{id:"normal",label:"Normal",description:"The material's normal map",map:"normalMap"},ao:{id:"ao",label:"Ambient Occlusion",description:"The material's ambient occlusion map",map:"aoMap"}};class n{static getMaterial(e={}){let t=n.getTexture(m.emissive.id),a=n.getTexture(m.roughness.id),s=n.getTexture(m.metalness.id);if(!t&&!a&&!s){let{metalness:r,emissive:l,roughness:c}=n.decodeMer();r&&(s=new THREE.CanvasTexture(r,void 0,void 0,void 0,THREE.NearestFilter,THREE.NearestFilter)),l&&(t=new THREE.CanvasTexture(l,void 0,void 0,void 0,THREE.NearestFilter,THREE.NearestFilter)),c&&(a=new THREE.CanvasTexture(c,void 0,void 0,void 0,THREE.NearestFilter,THREE.NearestFilter))}return new THREE.MeshStandardMaterial({map:n.getTexture("albedo")??new THREE.CanvasTexture(Texture.all[0]?.canvas,void 0,void 0,void 0,THREE.NearestFilter,THREE.NearestFilter),aoMap:n.getTexture(m.ao.id),normalMap:n.getTexture(m.normal.id),bumpMap:n.getTexture(m.height.id),metalnessMap:s,roughnessMap:a,emissiveMap:t,emissiveIntensity:t?1:0,emissive:t?16777215:0,envMap:PreviewScene.active?.cubemap??null,envMapIntensity:1,alphaTest:.5,...e})}static projectId(){return Project?Project.save_path??Project.model_identifier??Project.uuid??"default":"default"}static getProjectsData(){let e=localStorage.getItem(`${p}.pbr_textures`);return e?JSON.parse(e):{}}static getProjectData(){let e=n.projectId();return n.getProjectsData()[e]??{}}static saveTexture(e,t){let a=n.getProjectsData(),s=n.projectId();localStorage.setItem(`${p}.pbr_textures`,JSON.stringify({...a,[s]:{...a[s],[e]:t}}))}static removeTexture(e){let t=n.projectId(),a=n.getProjectsData(),s=n.getProjectData();delete s[e],localStorage.setItem(`${p}.pbr_textures`,JSON.stringify({...a,[t]:s}))}static findTexture(e){if(!Project)return null;let t=n.getProjectData(),a=new RegExp(`_${e}(.[^.]+)?$`,"i");return Project.textures?.find(s=>t[e]===s.uuid||a.test(s.name)&&t[e]!==S)??null}static getTexture(e){let t=n.findTexture(e);if(!t)return null;let a=new THREE.CanvasTexture(t.canvas,void 0,void 0,void 0,THREE.NearestFilter,THREE.NearestFilter);return a.needsUpdate=!0,a}static extractChannel(e,t){let a=e.canvas,s=a.width,r=a.height,l=a.getContext("2d");if(!l)return null;let c=document.createElement("canvas");c.width=s,c.height=r;let d=c.getContext("2d");if(!d)return null;let x={r:0,g:1,b:2,a:3}[t],{data:h}=l.getImageData(0,0,s,r),g=new Uint8ClampedArray(s*r*4);for(let f=0;f<h.length;f+=4)g[f]=h[f+x],g[f+1]=h[f+x],g[f+2]=h[f+x],g[f+3]=255;let v=new ImageData(g,s,r);return d.putImageData(v,0,0),c}static decodeMer(e=25.5){let t=n.findTexture("mer");if(!t)return{metalness:null,emissive:null,emissiveLevel:null,roughness:null,sss:null};let a=n.extractChannel(t,"r"),s=n.extractChannel(t,"g"),r=n.extractChannel(t,"b"),l=n.extractChannel(t,"a"),c=n.findTexture(m.albedo.id),d=document.createElement("canvas");d.width=c?.width??t.width,d.height=c?.height??t.height;let x=d.getContext("2d"),h=s?.getContext("2d"),g=c?.canvas.getContext("2d");if(!x||!g||!h)return{metalness:a,emissive:s,roughness:r,sss:l};let v=g.getImageData(0,0,d.width,d.height),f=h.getImageData(0,0,d.width,d.height),i=new Uint8ClampedArray(d.width*d.height*4);for(let o=0;o<v.data.length;o+=4){if(f.data[o]>e){i[o]=v.data[o],i[o+1]=v.data[o+1],i[o+2]=v.data[o+2],i[o+3]=255;continue}i[o]=0,i[o+1]=0,i[o+2]=0,i[o+3]=255}return x.putImageData(new ImageData(i,d.width,d.height),0,0),{metalness:a,emissive:d,emissiveLevel:s,roughness:r,sss:l}}static createMer(){let e=n.findTexture("metalness"),t=n.findTexture("emissive"),a=n.findTexture("roughness"),s=n.findTexture("sss"),r=Math.max(e?.width??0,t?.width??0,a?.width??0,Project?Project.texture_width:0),l=Math.max(e?.height??0,t?.height??0,a?.height??0,Project?Project.texture_height:0),c=document.createElement("canvas");c.width=r,c.height=l;let d=c.getContext("2d");if(!d)return null;let x=e?.img?n.extractChannel(e,"r"):null,h=t?.img?n.extractChannel(t,"g"):null,g=a?.img?n.extractChannel(a,"b"):null,v=s?.img?n.extractChannel(s,"a"):null,f=x?.getContext("2d")?.getImageData(0,0,r,l)??new ImageData(r,l),i=h?.getContext("2d")?.getImageData(0,0,r,l)??new ImageData(r,l),o=g?.getContext("2d")?.getImageData(0,0,r,l)??new ImageData(r,l),E=v?.getContext("2d")?.getImageData(0,0,r,l)??new ImageData(new Uint8ClampedArray(r*l*4).fill(255),r,l),w=new Uint8ClampedArray(r*l*4);for(let T=0;T<w.length;T+=4)w[T]=f.data[T],w[T+1]=i.data[T],w[T+2]=o.data[T],w[T+3]=E.data[T];return d.putImageData(new ImageData(w,r,l),0,0),c}static createNormalMap(e,t=!1){let a=e.canvas.getContext("2d");if(!a)return;let{width:s,height:r}=e,{data:l}=a.getImageData(0,0,s,r),c=document.createElement("canvas"),d=c.getContext("2d");if(!d)return;let x=(i,o)=>{let E=(i+o*s)*4;return l[E]/255};c.width=s,c.height=r,d.drawImage(e.img,0,0,s,r);let h=d.getImageData(0,0,s,r),g=h.data,v=i=>{let o=Math.sqrt(i[0]*i[0]+i[1]*i[1]+i[2]*i[2]);return[i[0]/o,i[1]/o,i[2]/o]};for(let i=0;i<r;i++)for(let o=0;o<s;o++){let E=x(Math.max(o-1,0),i),w=x(Math.min(o+1,s-1),i),T=x(o,Math.max(i-1,0)),G=x(o,Math.min(i+1,r-1)),V=w-E,X=G-T,N=v([-V,-X,1]),M=(i*s+o)*4;g[M]=(N[0]+1)/2*255,g[M+1]=(N[1]+1)/2*255,g[M+2]=(N[2]+1)/2*255,g[M+3]=t?x(o,i)*255:255}d.putImageData(h,0,0);let f=new Texture({name:`${e.name}_normal`,saved:!1,particle:!1,keep_size:!0}).fromDataURL(c.toDataURL());return Project&&Project.textures.push(f),f}}let A=u=>{let e=n.createMer();e&&e.toBlob(async t=>{if(!t)return;let[a,s]=Project?[`${Project.model_identifier.length>0?Project.model_identifier:Project.name}_mer`,Project.export_path]:["mer"];Blockbench.export({content:await t.arrayBuffer(),type:"PNG",name:a,extensions:["png"],resource_id:"mer",savetype:"image",startpath:s},u)})},F=({activate:u})=>Vue.extend({name:"DisplaySettingsPanel",template:`
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
      `,data(){return{toneMapping:Preview.selected.renderer.toneMapping,exposure:Preview.selected.renderer.toneMappingExposure,correctLights:Preview.selected.renderer.physicallyCorrectLights}},watch:{toneMapping:{handler(e){Preview.selected.renderer.toneMapping=e,u()},immediate:!0},correctLights:{handler(e){Preview.selected.renderer.physicallyCorrectLights=e,u()},immediate:!0},exposure:{handler(e){Preview.selected.renderer.toneMappingExposure=e},immediate:!0}}}),O=({activate:u})=>{let e=Vue.extend({name:"ChannelButton",props:{channel:Object},template:`
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
      `,data(){return{selectedTexture:null,projectTextures:[]}},mounted(){this.projectTextures=Project?Project.textures??Texture.all:Texture.all,this.selectedTexture=n.findTexture(this.channel.id)},methods:{assignId(t){return`channel_${t.toLowerCase().replace(/\s/g,"-")}`},setTexture(t){let a=this.projectTextures.find(s=>s.uuid===t.target.value);a&&(n.saveTexture(this.channel.id,a.uuid),this.selectedTexture=a,u({[this.channel.map]:new THREE.CanvasTexture(a.canvas)}))},unsetTexture(){n.saveTexture(this.channel.id,S),this.selectedTexture=null,u({[this.channel.map]:null})}}});return Vue.extend({name:"MaterialPanel",components:{ChannelButton:e},template:`
        <div>
          <div v-for="(channel, key) in channels" :key="key">
            <ChannelButton :channel="channel" />
          </div>
        </div>
      `,data(){return{channels:m}}})};class z{activate(e){if(Texture.all.length===0&&Modes.id!==`${p}_mode`)return;let t=n.getMaterial(e);Outliner.elements.forEach(a=>{let s=a.getMesh();s.isObject3D&&!s.isMesh||(s.material=t,s.material.needsUpdate=!0)})}deactivate(){Canvas.updateAll()}}P=new Action(`${p}_generate_normal`,{icon:"altitude",name:"Generate Normal Map",description:"Generates a normal map from the height map",click(){let u=n.findTexture(m.height.id)??Texture.all.find(t=>t.selected);if(!u)return;let e=n.createNormalMap(u);e&&n.saveTexture("normal",e.uuid)}}),j=new Action(`${p}_create_mer`,{icon:"lightbulb_circle",name:"Generate MER",click(){A()}}),C=new Action(`${p}_decode_mer`,{icon:"arrow_split",name:"Decode MER",click(){let{metalness:u,emissive:e,roughness:t}=n.decodeMer();if(u){let a=new Texture({name:"metalness",saved:!1,particle:!1}).fromDataURL(u.toDataURL());Project.textures.push(a),n.saveTexture(m.metalness.id,a.uuid)}if(e){let a=new Texture({name:"emissive",saved:!1,particle:!1}).fromDataURL(e.toDataURL());Project.textures.push(a),n.saveTexture(m.emissive.id,a.uuid)}if(t){let a=new Texture({name:"roughness",saved:!1,particle:!1}).fromDataURL(t.toDataURL());Project.textures.push(a),n.saveTexture(m.roughness.id,a.uuid)}}});let J=()=>{if(!Project)return;let u=n.findTexture(m.normal.id)?.name,e=n.findTexture(m.height.id)?.name,t=n.findTexture(m.albedo.id)?.name,a=n.findTexture(m.metalness.id)?.name,s=n.findTexture(m.emissive.id)?.name,r=n.findTexture(m.roughness.id)?.name,l={};return t||(l.baseColor={type:"color",label:"Base Color",value:"#ff00ff"}),!a&&!s&&!r&&(l.metalness={label:"Metalness",type:"range",min:0,max:255,step:1,value:0},l.emissive={label:"Emissive",type:"range",min:0,max:255,step:1,value:0},l.roughness={label:"Roughness",type:"range",min:0,max:255,step:1,value:0}),u&&e&&(l.depthMap={type:"radio",label:"Depth Map",options:{normal:"Normal Map",heightmap:"Height"},value:"normal"}),_=new Dialog(`${p}_texture_set`,{id:`${p}_texture_set`,title:"Create Texture Set JSON",buttons:["Create","Cancel"],form:l,onConfirm(c){let d=Project.model_identifier.length>0?Project.model_identifier:Project.name,x=a||s||r,h={format_version:"1.16.200","minecraft:texture_set":{color:(t?pathToName(t,!1):c.baseColor.hexCode)??d,metalness_emissive_roughness:[c.metalness??0,c.emissive??0,c.roughness??255]}};c.depthMap==="normal"&&u?h["minecraft:texture_set"].normal=pathToName(u,!1):(!u||c.depthMap==="heightmap")&&e&&(h["minecraft:texture_set"].heightmap=pathToName(e,!1));let g=()=>Blockbench.export({content:JSON.stringify(h,null,2),type:"JSON",name:`${d}.texture_set`,extensions:["json"],resource_id:"texture_set",startpath:Project.export_path});if(x){A(v=>{h["minecraft:texture_set"].metalness_emissive_roughness=pathToName(v,!1),g()});return}g()}}),_.show(),_},B=()=>{Settings.get("pbr_active")&&b.activate()},k=["undo","redo","setup_project","select_project","add_texture","finished_edit","update_view","update_texture_selection"],$=()=>{k.forEach(u=>{Blockbench.addListener(u,B)})},R=()=>{k.forEach(u=>{Blockbench.removeListener(u,B)})};I=new Setting("pbr_active",{category:"preview",name:"Enable PBR Preview",type:"boolean",value:!1,icon:"tonality",onChange(u){if(b.deactivate(),u){b.activate(),$();return}R()}}),BBPlugin.register(p,{version:U,title:"PBR Features",author:"Jason J. Gardner",description:"Create RTX/Deferred Rendering textures in Blockbench. Adds support for previewing PBR materials and exporting them in Minecraft-compatible formats.",tags:["PBR","RTX","Deferred Rendering"],icon:"icon.png",variant:"both",await_loading:!0,new_repository_format:!0,website:"https://github.com/jasonjgardner/blockbench-plugins",onload(){b=new z,L=Blockbench.addCSS(`
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
      `),H=new Mode(`${p}_mode`,{name:"PBR",icon:"flare",selectElements:!1,hidden_node_types:["texture_mesh"],onSelect(){b.activate(),three_grid.visible=!1,Blockbench.on("select_preview_scene",()=>b.activate()),y=new Panel(`${p}.display_settings`,{name:"Display Settings",id:`${p}.display_settings_panel`,icon:"display_settings",toolbars:[],display_condition:{modes:[`${p}_mode`],project:!0},component:F(b),expand_button:!0,onFold(){},onResize(){},default_side:"right",default_position:{slot:"right_bar",float_position:[0,0],float_size:[400,500],height:300,folded:!1},insert_after:"uv",insert_before:"paint"}),D=new Panel(`${p}.material`,{name:"Material",id:`${p}.material_panel`,icon:"stacks",toolbars:[],display_condition:{modes:[`${p}_mode`],project:!0},component:O(b),expand_button:!0,onFold(){},onResize(){},default_side:"left",default_position:{slot:"left_bar",float_position:[0,0],float_size:[400,500],height:600,folded:!1},insert_after:`${p}.display_settings`,insert_before:""})},onUnselect(){if(y?.delete(),D?.delete(),_?.delete(),three_grid.visible=!0,!Settings.get("pbr_active")){b.deactivate(),R();return}$()}}),MenuBar.addAction(j,"file.export"),MenuBar.addAction(P,"tools"),MenuBar.addAction(C,"tools"),MenuBar.addAction(new Action(`${p}_create_texture_set`,{name:"Create Texture Set",icon:"layers",description:"Creates a texture set JSON file. Generates a MER when metalness, emissive, or roughness channels are set.",click(){J()}}),"file.export"),MenuBar.addAction(new Toggle("toggle_pbr",{name:"PBR Preview",description:"Toggle PBR Preview",icon:"tonality",category:"view",condition:{modes:["edit","paint","animate"]},linked_setting:"pbr_active",click(){}}),"view")},onunload(){H?.delete(),y?.delete(),I?.delete(),D?.delete(),j?.delete(),C?.delete(),L?.delete(),_?.delete(),MenuBar.removeAction(`file.export.${p}_create_mer`),MenuBar.removeAction(`file.export.${p}_create_texture_set`),MenuBar.removeAction(`tools.${p}_generate_normal`),R()}})})();})();
