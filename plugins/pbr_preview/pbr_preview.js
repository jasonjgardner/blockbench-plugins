"use strict";(()=>{(()=>{let{MeshStandardMaterial:S}=THREE,E,j,P,w,I,D,y,N,_,u="pbr_preview",A="1.0.0",L="_NONE_",f={albedo:{id:"albedo",label:"Albedo",description:"The color of the material",map:"map"},metalness:{id:"metalness",label:"Metalness",description:"The material's metalness map",map:"metalnessMap"},emissive:{id:"emissive",label:"Emissive",description:"The material's emissive map",map:"emissiveMap"},roughness:{id:"roughness",label:"Roughness",description:"The material's roughness map",map:"roughnessMap"},height:{id:"height",label:"Height",description:"The material's height map",map:"bumpMap"},normal:{id:"normal",label:"Normal",description:"The material's normal map",map:"normalMap"},ao:{id:"ao",label:"Ambient Occlusion",description:"The material's ambient occlusion map",map:"aoMap"}};class t{static getMaterial(e={}){let n=t.getTexture("emissive");return new S({map:t.getTexture("albedo")??new THREE.CanvasTexture(Texture.all[0]?.canvas,void 0,void 0,void 0,THREE.NearestFilter,THREE.NearestFilter),aoMap:t.getTexture("ao"),normalMap:t.getTexture("normal"),roughnessMap:t.getTexture("roughness"),metalnessMap:t.getTexture("metalness"),bumpMap:t.getTexture("heightmap"),emissiveMap:n,emissiveIntensity:n?1:0,emissive:n?16777215:0,envMap:PreviewScene.active?.cubemap??null,envMapIntensity:1,...e})}static projectId(){return Project?Project.save_path??Project.model_identifier??Project.uuid??"default":"default"}static getProjectsData(){let e=localStorage.getItem(`${u}.pbr_textures`);return e?JSON.parse(e):{}}static getProjectData(){let e=t.projectId();return t.getProjectsData()[e]??{}}static saveTexture(e,n){let a=t.getProjectsData(),s=t.projectId();localStorage.setItem(`${u}.pbr_textures`,JSON.stringify({...a,[s]:{...a[s],[e]:n}}))}static removeTexture(e){let n=t.projectId(),a=t.getProjectsData(),s=t.getProjectData();delete s[e],localStorage.setItem(`${u}.pbr_textures`,JSON.stringify({...a,[n]:s}))}static findTexture(e){if(!Project)return null;let n=t.getProjectData(),a=new RegExp(`_${e}(.[^.]+)?$`,"i");return Project.textures?.find(s=>n[e]===s.uuid||a.test(s.name)&&n[e]!==L)??null}static getTexture(e){let n=t.findTexture(e);if(!n)return null;let a=new THREE.CanvasTexture(n.canvas,void 0,void 0,void 0,THREE.NearestFilter,THREE.NearestFilter);return a.needsUpdate=!0,a}static extractChannel(e,n){let a=e.canvas,s=a.width,o=a.height,l=a.getContext("2d");if(!l)return null;let d=document.createElement("canvas");d.width=s,d.height=o;let c=d.getContext("2d");if(!c)return null;let h={r:0,g:1,b:2,a:3}[n],{data:g}=l.getImageData(0,0,s,o),p=new Uint8ClampedArray(s*o*4);for(let x=0;x<g.length;x+=4)p[x]=g[x+h],p[x+1]=g[x+h],p[x+2]=g[x+h],p[x+3]=255;let v=new ImageData(p,s,o);return c.putImageData(v,0,0),d}static decodeMer(e=25.5){let n=t.findTexture("mer");if(!n)return{metalness:null,emissive:null,emissiveLevel:null,roughness:null,sss:null};let a=t.extractChannel(n,"r"),s=t.extractChannel(n,"g"),o=t.extractChannel(n,"b"),l=t.extractChannel(n,"a"),d=t.findTexture(f.albedo.id),c=document.createElement("canvas");c.width=d?.width??n.width,c.height=d?.height??n.height;let h=c.getContext("2d"),g=s?.getContext("2d"),p=d?.canvas.getContext("2d");if(!h||!p||!g)return{metalness:a,emissive:s,roughness:o,sss:l};let v=p.getImageData(0,0,c.width,c.height),x=g.getImageData(0,0,c.width,c.height),r=new Uint8ClampedArray(c.width*c.height*4);for(let i=0;i<v.data.length;i+=4){if(x.data[i]>e){r[i]=v.data[i],r[i+1]=v.data[i+1],r[i+2]=v.data[i+2],r[i+3]=255;continue}r[i]=0,r[i+1]=0,r[i+2]=0,r[i+3]=255}return h.putImageData(new ImageData(r,c.width,c.height),0,0),{metalness:a,emissive:c,emissiveLevel:s,roughness:o,sss:l}}static createMer(){let e=t.findTexture("metalness"),n=t.findTexture("emissive"),a=t.findTexture("roughness"),s=t.findTexture("sss"),o=Math.max(e?.width??0,n?.width??0,a?.width??0,Project?Project.texture_width:0),l=Math.max(e?.height??0,n?.height??0,a?.height??0,Project?Project.texture_height:0),d=document.createElement("canvas");d.width=o,d.height=l;let c=d.getContext("2d");if(!c)return null;let h=e?.img?t.extractChannel(e,"r"):null,g=n?.img?t.extractChannel(n,"g"):null,p=a?.img?t.extractChannel(a,"b"):null,v=s?.img?t.extractChannel(s,"a"):null,x=h?.getContext("2d")?.getImageData(0,0,o,l)??new ImageData(o,l),r=g?.getContext("2d")?.getImageData(0,0,o,l)??new ImageData(o,l),i=p?.getContext("2d")?.getImageData(0,0,o,l)??new ImageData(o,l),M=v?.getContext("2d")?.getImageData(0,0,o,l)??new ImageData(new Uint8ClampedArray(o*l*4).fill(255),o,l),b=new Uint8ClampedArray(o*l*4);for(let T=0;T<b.length;T+=4)b[T]=x.data[T],b[T+1]=r.data[T],b[T+2]=i.data[T],b[T+3]=M.data[T];return c.putImageData(new ImageData(b,o,l),0,0),d}static createNormalMap(e,n=!1){let a=e.canvas.getContext("2d");if(!a)return;let{width:s,height:o}=e,{data:l}=a.getImageData(0,0,s,o),d=document.createElement("canvas"),c=d.getContext("2d");if(!c)return;let h=(r,i)=>{let M=(r+i*s)*4;return l[M]/255};d.width=s,d.height=o,c.drawImage(e.img,0,0,s,o);let g=c.getImageData(0,0,s,o),p=g.data,v=r=>{let i=Math.sqrt(r[0]*r[0]+r[1]*r[1]+r[2]*r[2]);return[r[0]/i,r[1]/i,r[2]/i]};for(let r=0;r<o;r++)for(let i=0;i<s;i++){let M=h(Math.max(i-1,0),r),b=h(Math.min(i+1,s-1),r),T=h(i,Math.max(r-1,0)),O=h(i,Math.min(r+1,o-1)),z=b-M,F=O-T,R=v([-z,-F,1]),C=(r*s+i)*4;p[C]=(R[0]+1)/2*255,p[C+1]=(R[1]+1)/2*255,p[C+2]=(R[2]+1)/2*255,p[C+3]=n?h(i,r)*255:255}c.putImageData(g,0,0);let x=new Texture({name:`${e.name}_normal`,saved:!1,particle:!1,keep_size:!0}).fromDataURL(d.toDataURL());return Project&&Project.textures.push(x),x}}let H=m=>{let e=t.createMer();e&&e.toBlob(async n=>{if(!n)return;let[a,s]=Project?[`${Project.model_identifier.length>0?Project.model_identifier:Project.name}_mer`,Project.export_path]:["mer"];Blockbench.export({content:await n.arrayBuffer(),type:"PNG",name:a,extensions:["png"],resource_id:"mer",savetype:"image",startpath:s},m)})},$=({activate:m})=>Vue.extend({name:"DisplaySettingsPanel",template:`
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
      `,data(){return{toneMapping:Preview.selected.renderer.toneMapping,exposure:Preview.selected.renderer.toneMappingExposure,correctLights:Preview.selected.renderer.physicallyCorrectLights}},watch:{toneMapping:{handler(e){Preview.selected.renderer.toneMapping=e,m()},immediate:!0},correctLights:{handler(e){Preview.selected.renderer.physicallyCorrectLights=e,m()},immediate:!0},exposure:{handler(e){Preview.selected.renderer.toneMappingExposure=e},immediate:!0}}}),k=({activate:m})=>{let e=Vue.extend({name:"ChannelButton",props:{channel:Object},template:`
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
      `,data(){return{selectedTexture:null,projectTextures:[]}},mounted(){this.projectTextures=Project?Project.textures??Texture.all:Texture.all,this.selectedTexture=t.findTexture(this.channel.id)},methods:{assignId(n){return`channel_${n.toLowerCase().replace(/\s/g,"-")}`},setTexture(n){let a=this.projectTextures.find(s=>s.uuid===n.target.value);a&&(t.saveTexture(this.channel.id,a.uuid),this.selectedTexture=a,m({[this.channel.map]:new THREE.CanvasTexture(a.canvas)}))},unsetTexture(){t.saveTexture(this.channel.id,L),this.selectedTexture=null,m({[this.channel.map]:null})}}});return Vue.extend({name:"MaterialPanel",components:{ChannelButton:e},template:`
        <div>
          <div v-for="(channel, key) in channels" :key="key">
            <ChannelButton :channel="channel" />
          </div>
        </div>
      `,data(){return{channels:f}}})};class B{activate(e){let n=t.getMaterial(e);Outliner.elements.forEach(a=>{let s=a.getMesh();s.isObject3D&&!s.isMesh||(s.material=n)})}deactivate(){Canvas.updateAll()}}P=new Action(`${u}_generate_normal`,{icon:"altitude",name:"Generate Normal Map",description:"Generates a normal map from the height map",click(){let m=t.findTexture(f.height.id)??Texture.all.find(n=>n.selected);if(!m)return;let e=t.createNormalMap(m);e&&t.saveTexture("normal",e.uuid)}}),j=new Action(`${u}_create_mer`,{icon:"lightbulb_circle",name:"Generate MER",click(){H()}}),E=new Action(`${u}_decode_mer`,{icon:"arrow_split",name:"Decode MER",click(){let{metalness:m,emissive:e,roughness:n}=t.decodeMer();if(m){let a=new Texture({name:"metalness",saved:!1,particle:!1}).fromDataURL(m.toDataURL());Project.textures.push(a),t.saveTexture(f.metalness.id,a.uuid)}if(e){let a=new Texture({name:"emissive",saved:!1,particle:!1}).fromDataURL(e.toDataURL());Project.textures.push(a),t.saveTexture(f.emissive.id,a.uuid)}if(n){let a=new Texture({name:"roughness",saved:!1,particle:!1}).fromDataURL(n.toDataURL());Project.textures.push(a),t.saveTexture(f.roughness.id,a.uuid)}}});let U=()=>{if(!Project)return;let m=t.findTexture(f.normal.id)?.name,e=t.findTexture(f.height.id)?.name,n=t.findTexture(f.albedo.id)?.name,a=t.findTexture(f.metalness.id)?.name,s=t.findTexture(f.emissive.id)?.name,o=t.findTexture(f.roughness.id)?.name,l={};return n||(l.baseColor={type:"color",label:"Base Color",value:"#ff00ff"}),!a&&!s&&!o&&(l.metalness={label:"Metalness",type:"range",min:0,max:255,step:1,value:0},l.emissive={label:"Emissive",type:"range",min:0,max:255,step:1,value:0},l.roughness={label:"Roughness",type:"range",min:0,max:255,step:1,value:0}),m&&e&&(l.depthMap={type:"radio",label:"Depth Map",options:{normal:"Normal Map",heightmap:"Height"},value:"normal"}),_=new Dialog(`${u}_texture_set`,{id:`${u}_texture_set`,title:"Create Texture Set JSON",buttons:["Create","Cancel"],form:l,onConfirm(d){let c=Project.model_identifier.length>0?Project.model_identifier:Project.name,h=a||s||o,g={format_version:"1.16.200","minecraft:texture_set":{color:(n?pathToName(n,!1):d.baseColor.hexCode)??c,metalness_emissive_roughness:[d.metalness??0,d.emissive??0,d.roughness??255]}};d.depthMap==="normal"&&m?g["minecraft:texture_set"].normal=pathToName(m,!1):(!m||d.depthMap==="heightmap")&&e&&(g["minecraft:texture_set"].heightmap=pathToName(e,!1));let p=()=>Blockbench.export({content:JSON.stringify(g,null,2),type:"JSON",name:`${c}.texture_set`,extensions:["json"],resource_id:"texture_set",startpath:Project.export_path});if(h){H(v=>{g["minecraft:texture_set"].metalness_emissive_roughness=pathToName(v,!1),p()});return}p()}}),_.show(),_};BBPlugin.register(u,{version:A,title:"PBR Features",author:"Jason J. Gardner",description:"Create RTX/Deferred Rendering textures in Blockbench. Adds support for previewing PBR materials and exporting them in Minecraft-compatible formats.",tags:["PBR","RTX","Deferred Rendering"],icon:"icon.png",variant:"both",await_loading:!0,new_repository_format:!0,website:"https://github.com/jasonjgardner/blockbench-plugins",onload(){w=new B,N=Blockbench.addCSS(`
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
      `),I=new Mode(`${u}_mode`,{name:"PBR",icon:"flare",selectElements:!1,hidden_node_types:["texture_mesh"],onSelect(){w.activate(),three_grid.visible=!1,Blockbench.on("select_preview_scene",()=>w.activate()),D=new Panel(`${u}.display_settings`,{name:"Display Settings",id:`${u}.display_settings_panel`,icon:"display_settings",toolbars:[],display_condition:{modes:[`${u}_mode`],project:!0},component:$(w),expand_button:!0,onFold(){},onResize(){},default_side:"right",default_position:{slot:"right_bar",float_position:[0,0],float_size:[400,500],height:300,folded:!1},insert_after:"uv",insert_before:"paint"}),y=new Panel(`${u}.material`,{name:"Material",id:`${u}.material_panel`,icon:"stacks",toolbars:[],display_condition:{modes:[`${u}_mode`],project:!0},component:k(w),expand_button:!0,onFold(){},onResize(){},default_side:"left",default_position:{slot:"left_bar",float_position:[0,0],float_size:[400,500],height:600,folded:!1},insert_after:`${u}.display_settings`,insert_before:""})},onUnselect(){w.deactivate(),D?.delete(),y?.delete(),_?.delete(),three_grid.visible=!0}}),MenuBar.addAction(j,"file.export"),MenuBar.addAction(P,"tools"),MenuBar.addAction(E,"tools"),MenuBar.addAction(new Action(`${u}_create_texture_set`,{name:"Create Texture Set",icon:"layers",description:"Creates a texture set JSON file. Generates a MER when metalness, emissive, or roughness channels are set.",click(){U()}}),"file.export")},onunload(){I?.delete(),D?.delete(),y?.delete(),j?.delete(),E?.delete(),N?.delete(),_?.delete(),MenuBar.removeAction(`file.export.${u}_create_mer`),MenuBar.removeAction(`file.export.${u}_create_texture_set`),MenuBar.removeAction(`tools.${u}_generate_normal`)}})})();})();
