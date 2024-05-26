"use strict";(()=>{(()=>{let j,A,S,R,N,L,I,H,y,U,O,F,C,G,D,k,Q,J,z,X,q,V,B={},l="pbr_preview",ae="1.0.0",K="_NONE_",c={albedo:{id:"albedo",label:"Albedo",description:"The color of the material",map:"map",icon:"tonality"},metalness:{id:"metalness",label:"Metalness",description:"The material's metalness map",map:"metalnessMap",icon:"brightness_6"},emissive:{id:"emissive",label:"Emissive",description:"The material's emissive map",map:"emissiveMap",icon:"wb_twilight"},roughness:{id:"roughness",label:"Roughness",description:"The material's roughness map",map:"roughnessMap",icon:"grain"},height:{id:"height",label:"Height",description:"The material's height map",map:"bumpMap",icon:"landscape"},normal:{id:"normal",label:"Normal",description:"The material's normal map",map:"normalMap",icon:"looks"},ao:{id:"ao",label:"Ambient Occlusion",description:"The material's ambient occlusion map",map:"aoMap",icon:"motion_mode"}},P=(a=!0)=>{let e=Project?Project.textures??Texture.all:Texture.all;return a?e.filter(t=>t.layers.length>0).flatMap(t=>t.layers):e};class h{constructor(e,t){this._scope=e??P(),this._materialUuid=t}merToCanvas(){let e=this.getTexture(c.emissive),t=this.getTexture(c.roughness),i=this.getTexture(c.metalness);if(!e&&!t&&!i){let{metalness:n,emissive:s,roughness:o}=this.decodeMer();n&&(i=h.makePixelatedCanvas(n)),s&&(e=h.makePixelatedCanvas(s)),o&&(t=h.makePixelatedCanvas(o))}return{emissiveMap:e,roughnessMap:t,metalnessMap:i}}getMaterial(e={}){let{emissiveMap:t,roughnessMap:i,metalnessMap:n}=this.merToCanvas();return new THREE.MeshStandardMaterial({map:this.getTexture(c.albedo)??h.makePixelatedCanvas(TextureLayer.selected?.canvas??Texture.all.find(s=>s.selected)?.canvas??Texture.all[0].canvas),aoMap:this.getTexture(c.ao),normalMap:this.getTexture(c.normal),bumpMap:this.getTexture(c.height),metalnessMap:n,roughnessMap:i,emissiveMap:t,emissiveIntensity:t?1:0,emissive:t?16777215:0,envMap:PreviewScene.active?.cubemap??null,envMapIntensity:1,alphaTest:.5,...e})}saveTexture(e,{uuid:t,extend:i}){Project&&(Project.pbr_materials||(Project.pbr_materials={}),Project.pbr_materials[this._materialUuid]||(Project.pbr_materials[this._materialUuid]={}),Project.pbr_materials[this._materialUuid][e.id]=t,i({channel:e.id}))}findTexture(e,t=!0){if(!Project)return null;let i=this._scope.find(r=>r.channel&&(r.channel===e||r.channel===e.id));if(i)return i;let n=typeof e=="string"?e:e.id;Project.pbr_materials??={};let s=Project.pbr_materials[this._materialUuid];if(!s&&t){let r=new RegExp(`_*${n}(.[^.]+)?$`,"i");return this._scope.find(u=>r.test(u.name))??null}let o=s?.[n];return o?this._scope.find(r=>r.uuid===o)??null:null}static makePixelatedCanvas(e){let t=new THREE.CanvasTexture(e,void 0,void 0,void 0,THREE.NearestFilter,THREE.NearestFilter);return t.needsUpdate=!0,t}getTexture(e){let t=this.findTexture(e);return t?h.makePixelatedCanvas(t.canvas):null}static extractChannel(e,t){let i=e.canvas,n=i.width,s=i.height,o=i.getContext("2d");if(!o)return null;let r=document.createElement("canvas");r.width=n,r.height=s;let u=r.getContext("2d");if(!u)return null;let m={r:0,g:1,b:2,a:3}[t],{data:f}=o.getImageData(0,0,n,s),x=new Uint8ClampedArray(n*s*4);for(let g=0;g<f.length;g+=4)x[g]=f[g+m],x[g+1]=f[g+m],x[g+2]=f[g+m],x[g+3]=255;let b=new ImageData(x,n,s);return u.putImageData(b,0,0),r}decodeMer(e=25.5){let t=this.findTexture("mer",!0);if(!t)return{metalness:null,emissive:null,emissiveLevel:null,roughness:null,sss:null};let i=h.extractChannel(t,"r"),n=h.extractChannel(t,"g"),s=h.extractChannel(t,"b"),o=h.extractChannel(t,"a"),r=document.createElement("canvas");r.width=t.img.width,r.height=t.img.height;let u=this.findTexture(c.albedo);u&&(r.width=u.img.width,r.height=u.img.height);let m=r.getContext("2d"),f=n?.getContext("2d"),x=u?.canvas.getContext("2d");if(!m||!x||!f)return{metalness:i,emissive:n,roughness:s,sss:o};let b=x.getImageData(0,0,r.width,r.height),g=f.getImageData(0,0,r.width,r.height),_=new Uint8ClampedArray(r.width*r.height*4);for(let p=0;p<b.data.length;p+=4){if(g.data[p]>e){_[p]=b.data[p],_[p+1]=b.data[p+1],_[p+2]=b.data[p+2],_[p+3]=255;continue}_[p]=0,_[p+1]=0,_[p+2]=0,_[p+3]=255}return m.putImageData(new ImageData(_,r.width,r.height),0,0),{metalness:i,emissive:r,emissiveLevel:n,roughness:s,sss:o}}createMer(e=!1){let t=this.findTexture(c.metalness,e),i=this.findTexture(c.emissive,e),n=this.findTexture(c.roughness,e),s=this.findTexture("sss",!1),o=Math.max(t?.img.width??0,i?.img.width??0,n?.img.width??0,Project?Project.texture_width:0),r=Math.max(t?.img.height??0,i?.img.height??0,n?.img.height??0,Project?Project.texture_height:0),u=document.createElement("canvas");u.width=o,u.height=r;let m=u.getContext("2d");if(!m)return null;let f=t?.img?h.extractChannel(t,"r"):null,x=i?.img?h.extractChannel(i,"g"):null,b=n?.img?h.extractChannel(n,"b"):null,g=s&&s?.img?h.extractChannel(s,"a"):null,_=f?.getContext("2d")?.getImageData(0,0,o,r)??new ImageData(o,r),p=x?.getContext("2d")?.getImageData(0,0,o,r)??new ImageData(o,r),d=b?.getContext("2d")?.getImageData(0,0,o,r)??new ImageData(o,r),v=g?.getContext("2d")?.getImageData(0,0,o,r)??new ImageData(new Uint8ClampedArray(o*r*4).fill(255),o,r),w=new Uint8ClampedArray(o*r*4);for(let T=0;T<w.length;T+=4)w[T]=_.data[T],w[T+1]=p.data[T],w[T+2]=d.data[T],w[T+3]=v.data[T];return m.putImageData(new ImageData(w,o,r),0,0),u}static createNormalMap(e,t=!1){let i=e.canvas.getContext("2d");if(!i)return null;let{width:n,height:s}=e.img,{data:o}=i.getImageData(0,0,n,s),r=document.createElement("canvas"),u=r.getContext("2d");if(!u)return null;let m=(d,v)=>{let w=(d+v*n)*4;return o[w]/255};r.width=n,r.height=s,u.drawImage(e.img,0,0,n,s);let f=u.getImageData(0,0,n,s),x=f.data,b=d=>{let v=Math.sqrt(d[0]*d[0]+d[1]*d[1]+d[2]*d[2]);return[d[0]/v,d[1]/v,d[2]/v]};for(let d=0;d<s;d++)for(let v=0;v<n;v++){let w=m(Math.max(v-1,0),d),T=m(Math.min(v+1,n-1),d),oe=m(v,Math.max(d-1,0)),le=m(v,Math.min(d+1,s-1)),ce=T-w,de=le-oe,$=b([-ce,-de,1]),E=(d*n+v)*4;x[E]=($[0]+1)/2*255,x[E+1]=($[1]+1)/2*255,x[E+2]=($[2]+1)/2*255,x[E+3]=t?m(v,d)*255:255}u.putImageData(f,0,0);let g=r.toDataURL(),_=`${e.name.replace(/_height(map)?/i,"")}_normal`;if(e instanceof TextureLayer){let d=new TextureLayer({name:_,data_url:g},e.texture);return e.texture.layers.push(d),d.select(),d}let p=new Texture({name:_,saved:!1,particle:!1,keep_size:!0}).fromDataURL(g);return Project&&Project.textures.push(p),p}}U=new Property(TextureLayer,"enum","channel",{default:K,values:Object.keys(c).map(a=>c[a].id)}),z=new Property(ModelProject,"object","pbr_materials",{default:{},exposed:!1}),X=new Property(ModelProject,"object","bb_materials",{default:{},exposed:!1});let W=a=>{let e=Texture.all.find(i=>i.selected);if(!e)return;let t=new h(e.layers_enabled?e.layers:Project?Project.textures:null,e.uuid).createMer(!1);t&&t.toBlob(async i=>{if(!i)return;let[n,s]=Project?[`${e.name??Project.getDisplayName()}_mer`,Project.export_path]:["mer"];Blockbench.export({content:await i.arrayBuffer(),type:"PNG",name:n,extensions:["png"],resource_id:"mer",savetype:"image",startpath:s},a)})},M=a=>{!Project||Texture.all.length===0&&Modes.id!==`${l}_mode`||Project.elements.forEach(e=>{e instanceof Cube&&Object.keys(e.faces).forEach(t=>{let n=e.faces[t].getTexture();if(!n)return;let s=Project.materials[n.uuid];s.isShaderMaterial&&!Project.bb_materials[n.uuid]&&(Project.bb_materials[n.uuid]=s);let o=new h(n.layers_enabled?n.layers.filter(r=>r.visible)??null:Project.textures,n.uuid).getMaterial(a);Project.materials[n.uuid]=THREE.ShaderMaterial.prototype.copy.call(o,s),Canvas.updateAllFaces(n)})})},Y=()=>{!Project||!Project.bb_materials||(Project.elements.forEach(a=>{a instanceof Cube&&Object.keys(a.faces).forEach(e=>{let i=a.faces[e].getTexture();if(!i)return;let n=Project.bb_materials[i.uuid];n&&(Project.materials[i.uuid]=n)})}),Canvas.updateAll())},ie=()=>{if(!Project)return;let a=P();Project.textures.forEach(e=>{let t=new h(a,e.uuid),i=t.findTexture(c.normal,!1)?.name,n=t.findTexture(c.height,!1)?.name,s=t.findTexture(c.albedo,!1)?.name,o=t.findTexture(c.metalness,!1)?.name,r=t.findTexture(c.emissive,!1)?.name,u=t.findTexture(c.roughness,!1)?.name,m={};return s||(m.baseColor={type:"color",label:"Base Color",value:"#ff00ff"}),!o&&!r&&!u&&(m.metalness={label:"Metalness",type:"range",min:0,max:255,step:1,value:0},m.emissive={label:"Emissive",type:"range",min:0,max:255,step:1,value:0},m.roughness={label:"Roughness",type:"range",min:0,max:255,step:1,value:0}),i&&n&&(m.depthMap={type:"radio",label:"Depth Map",options:{normal:"Normal Map",heightmap:"Height"},value:"normal"}),y=new Dialog(`${l}_texture_set`,{id:`${l}_texture_set`,title:"Create Texture Set JSON",buttons:["Create","Cancel"],form:m,onConfirm(f){let x=Project.model_identifier.length>0?Project.model_identifier:Project.getDisplayName(),b=o||r||u,g={format_version:"1.16.200","minecraft:texture_set":{color:(s?pathToName(s,!1):f.baseColor?.toHexString())??x,metalness_emissive_roughness:[f.metalness??0,f.emissive??0,f.roughness??255]}};f.depthMap==="normal"&&i?g["minecraft:texture_set"].normal=pathToName(i,!1):(!i||f.depthMap==="heightmap")&&n&&(g["minecraft:texture_set"].heightmap=pathToName(n,!1));let _=()=>Blockbench.export({content:JSON.stringify(g,null,2),type:"JSON",name:`${x}.texture_set`,extensions:["json"],resource_id:"texture_set",startpath:Project.export_path},()=>{Blockbench.showQuickMessage("Texture set created",2e3),y.hide()});if(b){W(p=>{g["minecraft:texture_set"].metalness_emissive_roughness=pathToName(p,!1),_()});return}_()},cancelIndex:1}),y.show(),y})},Z=["undo","redo","add_texture","finish_edit","finished_edit","load_project","select_preview_scene"],ee=()=>Settings.get("pbr_active")&&M(),te=()=>{Z.forEach(a=>{Blockbench.addListener(a,ee)})},ne=()=>{Z.forEach(a=>{Blockbench.removeListener(a,ee)})},re=()=>{I=new Setting("pbr_active",{category:"preview",name:"Enable PBR Preview",description:"Enables PBR preview in the editor",type:"toggle",default_value:!1,icon:"tonality",launch_setting:!0,onChange(a){if(a){M(),te();return}Y(),ne()}}),Q=new Setting("display_settings_correct_lights",{category:"preview",name:"Correct Lights",description:"Corrects the lighting in the preview for PBR materials",type:"toggle",default_value:!1,icon:"light_mode",onChange(a){Settings.get("pbr_active")&&(Preview.selected.renderer.physicallyCorrectLights=a,M())}}),J=new Setting("display_settings_tone_mapping",{category:"preview",name:"Tone Mapping",description:"Changes the tone mapping of the preview",type:"select",default_value:THREE.NoToneMapping,icon:"palette",condition:()=>(Modes.id==="edit"||Modes.id==="paint")&&Settings.get("pbr_active"),options:{[THREE.NoToneMapping]:"None",[THREE.LinearToneMapping]:"Linear",[THREE.ReinhardToneMapping]:"Reinhard",[THREE.CineonToneMapping]:"Cineon",[THREE.ACESFilmicToneMapping]:"ACES"},onChange(a){Settings.get("pbr_active")&&(Preview.selected.renderer.toneMapping=Number(a),M())}}),q=new Action(`${l}_activate_pbr`,{name:"Activate PBR",icon:"panorama_photosphere",category:"preview",description:"Applies PBR materials to the preview",linked_setting:"pbr_active",click(){}}),V=new Action(`${l}_deactivate_pbr`,{name:"Deactivate PBR",description:"Deactivates PBR materials in the preview",condition:()=>Settings.get("pbr_active"),icon:"panorama",category:"preview",click(){Y()}}),R=new Action(`${l}_generate_normal`,{icon:"altitude",name:"Generate Normal Map",description:"Generates a normal map from the height map",click(){let a=TextureLayer.selected??Texture.all.find(n=>n.selected),e=new h(P(),a.uuid),t=TextureLayer.selected??Texture.all.find(n=>n.selected)??e.findTexture(c.height,!0);if(!t){Blockbench.showQuickMessage("No height map found",2e3);return}let i=h.createNormalMap(t);if(i){e.saveTexture(c.normal,i),Blockbench.showQuickMessage("Normal map generated",2e3);return}Blockbench.showQuickMessage("Failed to generate normal map",2e3)}}),S=new Action(`${l}_create_mer`,{icon:"lightbulb_circle",name:"Generate MER",click(){W()}}),j=new Action(`${l}_decode_mer`,{icon:"arrow_split",name:"Decode MER",click(){let a=P(),e=TextureLayer.selected?.texture??Texture.all.find(s=>s.selected),t=new h(a,(e??a[0]).uuid),i=t.decodeMer();[c.metalness,c.emissive,c.roughness].forEach(s=>{let o=s.id,r=i[o];if(!r)return;let u=new TextureLayer({name:`${e?.name}_${o}`,data_url:r.toDataURL()},e);t.saveTexture(s,u)})}}),A=new Action(`${l}_create_texture_set`,{name:"Create Texture Set",icon:"layers",description:"Creates a texture set JSON file. Generates a MER when metalness, emissive, or roughness channels are set.",click(){ie()}}),Object.entries(c).forEach(([a,e])=>{B[a]=new Action(`${l}_assign_channel_${a}`,{icon:e.icon??"tv_options_edit_channels",name:`Assign to ${e.label.toLocaleLowerCase()} channel`,description:`Assign the selected layer to the ${e.label} channel`,category:"textures",click(t){let i=TextureLayer.selected;if(!i||!Project)return;Undo.initEdit({layers:[i]}),i.extend({channel:a});let n=i.texture;n.updateChangesAfterEdit(),Project.pbr_materials[n.uuid]||(Project.pbr_materials[n.uuid]={}),Object.entries(Project.pbr_materials[n.uuid]).forEach(([s,o])=>{o===i.uuid&&delete Project.pbr_materials[n.uuid][s]}),Project.pbr_materials[n.uuid][a]=i.uuid,Undo.finishEdit("Change channel assignment"),Blockbench.showQuickMessage(`Assigned "${i.name}" to ${e.label} channel`,2e3),M()}})}),N=new Action(`${l}_unassign_channel`,{icon:"cancel",name:"Unassign Channel",description:"Unassign the selected layer from the channel",category:"textures",click(){let a=TextureLayer.selected;if(!a||!Project)return;Undo.initEdit({layers:[a]});let{texture:e,channel:t}=a;e.updateChangesAfterEdit(),Project.pbr_materials[e.uuid]={},a.channel=K,Undo.finishEdit("Unassign channel"),Blockbench.showQuickMessage(`Unassigned "${a.name}" from ${t} channel`,2e3),M()}}),L=new Toggle("toggle_pbr",{name:"PBR Preview",description:"Toggle PBR Preview",icon:"panorama_photosphere",category:"view",condition:()=>Modes.id==="edit"||Modes.id==="paint",linked_setting:"pbr_active",default:!1,click(){},onChange(a){Blockbench.showQuickMessage(`PBR Preview is now ${a?"enabled":"disabled"}`,2e3)}}),k=new Setting("display_settings_exposure",{category:"preview",name:"Exposure",description:"Adjusts the exposure of the scene",type:"number",default_value:1,icon:"exposure",step:.1,min:-2,max:2,onChange(a){Settings.get("pbr_active")&&(Preview.selected.renderer.toneMappingExposure=Math.max(-2,Math.min(2,Number(a))))}}),C=new BarSlider(`${l}_exposure`,{category:"preview",name:"Exposure",description:"Adjusts the exposure of the scene",icon:"exposure",min:-2,max:2,step:.1,value:Settings.get("display_settings_exposure")??1,display_condition:{modes:["edit","paint","animate"],project:!0},onChange({value:a}){Settings.get("pbr_active")&&k.set(a)}}),C.addLabel(!0,C),D=new Toggle(`${l}_correct_lights`,{category:"preview",name:"Correct Lights",description:"Corrects the lighting in the preview",icon:"fluorescent",linked_setting:"display_settings_correct_lights",default:!1,onChange(a){Blockbench.showQuickMessage(`Physically corrected lighting is now ${a?"enabled":"disabled"}`,2e3)},click(){}}),O=new Menu(`${l}_channel_menu`,[...Object.keys(c).map(a=>`${l}_assign_channel_${a}`),`${l}_unassign_channel`],{onOpen(){M()}}),F=new Action(`${l}_show_channel_menu`,{icon:"texture",name:"Assign to PBR Channel",description:"Assign the selected layer to a channel",category:"textures",condition:()=>Modes.paint&&TextureLayer.selected,click(a){O.open(a)}}),G=new BarSelect(`${l}_tonemapping`,{category:"preview",name:"Tone Mapping",description:"Select the tone mapping function",icon:"palette",value:THREE.NoToneMapping,options:{[THREE.NoToneMapping]:{name:"No Tone Mapping"},[THREE.LinearToneMapping]:{name:"Linear"},[THREE.ReinhardToneMapping]:{name:"Reinhard"},[THREE.CineonToneMapping]:{name:"Cineon"},[THREE.ACESFilmicToneMapping]:{name:"ACES"}},onChange({value:a}){Settings.get("pbr_active")&&(Preview.selected.renderer.toneMapping=Number(a),M())}}),H=new Panel(`${l}_display_settings`,{name:"PBR Settings",id:`${l}_display_settings_panel`,icon:"display_settings",toolbars:[new Toolbar(`${l}_controls_toolbar`,{id:`${l}_controls_toolbar`,children:["toggle_pbr",`${l}_correct_lights`,`${l}_show_channel_menu`],name:"PBR"}),new Toolbar(`${l}_display_settings_toolbar`,{id:`${l}_display_settings_toolbar`,children:[`${l}_tonemapping`,`${l}_exposure`],name:"Display Settings"})],display_condition:{modes:["edit","paint","animate"],project:!0},component:{},expand_button:!0,onFold(){},onResize(){},default_side:"left",default_position:{slot:"left_bar",float_position:[0,0],float_size:[400,500],height:300,folded:!1},insert_after:"textures",insert_before:"paint"}),MenuBar.addAction(S,"file.export"),MenuBar.addAction(R,"tools"),MenuBar.addAction(j,"tools"),MenuBar.addAction(A,"file.export"),MenuBar.addAction(L,"view"),MenuBar.addAction(D,"preview"),Object.entries(B).forEach(([a,e])=>{MenuBar.addAction(e,"image")}),te()},se=()=>{Object.entries(B).forEach(([a,e])=>{e.delete()}),MenuBar.removeAction(`file.export.${l}_create_mer`),MenuBar.removeAction(`file.export.${l}_create_texture_set`),MenuBar.removeAction(`tools.${l}_generate_normal`),ne(),H?.delete(),y?.delete(),I?.delete(),S?.delete(),R?.delete(),L?.delete(),j?.delete(),A?.delete(),U?.delete(),F?.delete(),k?.delete(),C?.delete(),G?.delete(),D?.delete(),Q?.delete(),J?.delete(),q?.delete(),V?.delete(),N?.delete(),X?.delete(),z?.delete()};BBPlugin.register(l,{version:ae,title:"PBR Features",author:"Jason J. Gardner",description:"Create RTX/Deferred Rendering textures in Blockbench. Adds support for previewing PBR materials and exporting them in Minecraft-compatible formats.",tags:["PBR","RTX","Deferred Rendering"],icon:"icon.png",variant:"both",await_loading:!0,new_repository_format:!0,repository:"https://github.com/jasonjgardner/blockbench-plugins",has_changelog:!0,min_version:"4.10.1",onload:re,onunload:se})})();})();
