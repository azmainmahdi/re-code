/* ---------- projects and importing (desktop only: uses the Tauri shell's file commands) ---------- */
const recentProjects=()=>{try{return JSON.parse(localStorage.getItem('recode-recent')||'[]');}catch{return [];}};
const baseName=p=>p.split(/[\\/]/).filter(Boolean).pop()||p;
function setProject(path){
  localStorage.setItem('recode-project',path);
  localStorage.setItem('recode-recent',JSON.stringify([path,...recentProjects().filter(x=>x!==path)].slice(0,6)));
  location.reload();
}
async function makeProject(path,name){
  await inv('make_dir',{path:pj(path,'transcripts')});
  await inv('write_text',{path:pj(path,DATA),text:JSON.stringify(Object.assign(blank(),{name,savedAt:Date.now()}),null,1)});
}
async function newProject(){
  const f=await TAURI.dialog.open({directory:true,title:'Pick or make an empty folder for the new project'});if(!f)return;
  if(await inv('exists',{path:pj(f,DATA)}))return setProject(f);
  const items=(await inv('list_dir',{path:f})).filter(([n])=>!n.startsWith('.'));
  if(items.length&&!confirm(`"${baseName(f)}" already has files in it. Start the project there anyway? Nothing in it is changed.`))return;
  await makeProject(f,baseName(f));setProject(f);
}
async function openProject(){
  const f=await TAURI.dialog.open({directory:true,title:'Open a project folder'});if(!f)return;
  if(await inv('exists',{path:pj(f,DATA)}))return setProject(f);
  toast(`No project in "${baseName(f)}".`,['Start one here',async()=>{await makeProject(f,baseName(f));setProject(f);}]);
}
async function openSample(){ // a made-up project, written fresh into the app's own data folder
  const dir=pj(await TAURI.path.appDataDir(),'Sample project');
  if(!await inv('exists',{path:pj(dir,DATA)})){
    await makeProject(dir,'Sample project (made-up data)');
    const s=Object.assign(blank(),{name:'Sample project (made-up data)'});
    for(const [name,text] of Object.entries(SAMPLE.transcripts)){
      await inv('write_text',{path:pj(dir,'transcripts',name+'.md'),text});
      s.roles[name]=['Interviewer'];
    }
    const th={};SAMPLE.themes.forEach((t,i)=>{th[t.name]=uid();s.themes.push({id:th[t.name],name:t.name,idea:t.idea,hue:i});});
    for(const c of SAMPLE.codes){
      const turns=TX.read(SAMPLE.transcripts[c.pid]).turns,ti=turns.findIndex(t=>t.text.includes(c.quote));if(ti<0)continue;
      const start=turns[ti].text.indexOf(c.quote),cid=Object.keys(s.codes).find(k=>s.codes[k].label===c.code)||uid(); // one code can sit on quotes from several people
      s.codes[cid]??={label:c.code,meaning:'',theme:c.theme?th[c.theme]:null,history:[{date:today(),note:`Created in round ${c.round||1}`}]};
      s.highlights.push({id:uid(),pid:c.pid,turn:ti,start,end:start+c.quote.length,text:c.quote,codeIds:[cid],note:c.note||'',round:c.round||1,at:new Date().toISOString()});
    }
    SAMPLE.diary.forEach(d=>s.diary.push({id:uid(),date:today(),pid:d.pid,text:d.text}));
    s.savedAt=Date.now();
    await inv('write_text',{path:pj(dir,DATA),text:JSON.stringify(s,null,1)});
  }
  setProject(dir);
}
function projectMenu(anchor){
  const r=recentProjects().filter(x=>x!==root);
  menu(anchor||$('[data-act=project]'),[
    {title:root?(S.name||baseName(root)):'No project open'},
    {icon:I('plus','s'),label:'New project',fn:newProject},
    {icon:I('folder-open','s'),label:'Open project',fn:openProject},
    {icon:I('book-open-text','s'),label:'Try the sample<small>Made-up interviews, to look around</small>',fn:openSample},
    ...(r.length?['-',{title:'Recent'},...r.map(p=>({label:`${esc(baseName(p))}<small>${esc(p)}</small>`,fn:()=>setProject(p)}))]:[]),
  ]);
}

/* import: read each file, show what was found, write it into transcripts/ in the Re;Code format */
const EXT=['md','markdown','txt','docx','vtt','srt'];
const safeName=n=>n.replace(/[\\/:*?"<>|]+/g,' ').replace(/\s+/g,' ').trim().slice(0,80)||'Transcript';
async function readAny(path){
  const ext=path.split('.').pop().toLowerCase();
  if(!EXT.includes(ext))throw new Error('This file type is not supported yet. Save it as .docx, .txt, .vtt or .srt.');
  return TX.read(ext==='docx'?await inv('docx_text',{path}):await inv('read_text',{path}),ext);
}
async function importFiles(){
  if(!root)return projectMenu();
  let fs=await TAURI.dialog.open({multiple:true,title:'Import transcripts',filters:[{name:'Transcripts',extensions:EXT}]});
  if(!fs)return;fs=[].concat(fs);if(!fs.length)return;
  const items=[],taken=new Set(Object.keys(T));
  for(const f of fs){
    let name=safeName(baseName(f).replace(/\.[^.]+$/,''));for(let k=2;taken.has(name);k++)name=safeName(baseName(f).replace(/\.[^.]+$/,''))+' '+k;taken.add(name);
    try{const r=await readAny(f);items.push({path:f,name,r,ask:new Set(r.interviewer),ren:{},skip:!r.turns.length});}
    catch(e){items.push({path:f,name,err:e.message||String(e),skip:true});}
  }
  importPreview(items);
}
function importPreview(items){
  const card=(it,k)=>{
    if(it.err)return `<div class="imp skip"><div class="imph"><b>${esc(baseName(it.path))}</b></div><p class="impw">${esc(it.err)}</p></div>`;
    const r=it.r,sp=Object.entries(r.speakers).sort((a,b)=>b[1]-a[1]);
    return `<div class="imp${it.skip?' skip':''}" data-k="${k}">
      <div class="imph"><input class="field" data-f="name" value="${esc(it.name)}" aria-label="Transcript name"><label class="impskip"><input type="checkbox" data-f="skip" ${it.skip?'':'checked'}> Add</label></div>
      <p class="impm">${plural(r.turns.length,'turn')} · ${r.sections.length?plural(r.sections.length,'section'):'no sections'} · ${r.timed?'with timestamps':'no timestamps'}</p>
      <div class="impsp"><div class="lab">Speakers <span>Tick who asks the questions. Rename any speaker here.</span></div>
      ${sp.map(([n,c])=>`<div class="spk"><input type="checkbox" data-ask="${esc(n)}" ${it.ask.has(n)?'checked':''} aria-label="${esc(n)} asks the questions"><input class="field" data-ren="${esc(n)}" value="${esc(it.ren[n]??n)}" aria-label="Speaker name"><small>${plural(c,'turn')}</small></div>`).join('')}</div>
      ${r.sections.length?`<div class="impsec">${r.sections.map(x=>`<span>${esc(x.title)}</span>`).join('')}</div>`:''}
      ${r.warnings.length?`<ul class="impw">${r.warnings.slice(0,8).map(w=>`<li>${esc(w)}</li>`).join('')}${r.warnings.length>8?`<li>and ${r.warnings.length-8} more</li>`:''}</ul>`:''}
    </div>`;};
  const n=()=>items.filter(x=>!x.skip&&!x.err).length;
  const m=modal(`<div class="row" style="margin-bottom:4px"><h2 style="flex:1;margin:0">Check what was found</h2><button class="btn icon ghost" data-act="close" aria-label="Close">${I('x')}</button></div>
    <p class="impm" style="margin:0 0 14px">Nothing is added until you confirm. Lines like <b>Name: text</b> become turns and <b>## Name</b> starts a section.</p>
    <div class="imps">${items.map(card).join('')}</div>
    <div class="row" style="justify-content:flex-end;margin-top:16px"><button class="btn ghost" data-act="close">Cancel</button><button class="btn acc" id="impGo"></button></div>`);
  m.querySelector('.box').style.width='min(720px,100%)';
  const gb=m.querySelector('#impGo'),label=()=>{gb.textContent=n()?`Add ${plural(n(),'transcript')}`:'Nothing to add';gb.disabled=!n();};label();
  m.addEventListener('input',e=>{const c=e.target.closest('.imp');if(!c)return;const it=items[+c.dataset.k];
    if(e.target.dataset.f==='name')it.name=e.target.value;
    else if(e.target.dataset.f==='skip'){it.skip=!e.target.checked;c.classList.toggle('skip',it.skip);label();}
    else if(e.target.dataset.ask!=null){const s=e.target.dataset.ask;e.target.checked?it.ask.add(s):it.ask.delete(s);}
    else if(e.target.dataset.ren!=null)it.ren[e.target.dataset.ren]=e.target.value.replace(/:/g,'').trim();});
  gb.onclick=async()=>{
    const add=items.filter(x=>!x.skip&&!x.err),used=new Set(Object.keys(T));
    for(const it of add){let nm=safeName(it.name);if(used.has(nm)){toast(`"${nm}" is already in this project. Pick another name.`);return;}used.add(nm);it.name=nm;}
    gb.disabled=true;
    try{
      for(const it of add){
        const rn=s=>it.ren[s]||s;it.r.turns.forEach(t=>t.spk=rn(t.spk));
        await inv('write_text',{path:pj(root,'transcripts',it.name+'.md'),text:TX.write(it.r)});
      }
      change(()=>{for(const it of add)S.roles[it.name]=[...it.ask].map(s=>it.ren[s]||s);},false);
      await loadTranscripts();m.remove();cur=add[0].name;go('code');
      toast(`Added ${plural(add.length,'transcript')}`);
    }catch(e){gb.disabled=false;toast('Could not add: '+e);}
  };
}

/* downloads go through a save dialog: a desktop web view has no download folder of its own */
async function download(name,text,type='text/csv;charset=utf-8'){
  const ext=name.split('.').pop();
  const f=await TAURI.dialog.save({defaultPath:name,filters:[{name:ext.toUpperCase(),extensions:[ext]}]});if(!f)return;
  try{await inv('write_text',{path:f,text:type.startsWith('text/csv')?'﻿'+text:text});toast('Saved '+baseName(f));}catch(e){toast('Could not save: '+e);}
}
