(() => {
  "use strict";
  const KEY = "notes_at_data_v1";
  const COLORS = ["#35b7ff","#8a75ff","#c16bff","#f05d9b","#ff766d","#ff9f43","#e8c94e","#32c8a2","#28a9c7","#4788ff","#a36be8","#7f91b5"];
  const $ = id => document.getElementById(id);
  const els = {
    layout: document.querySelector(".layout"), list: $("notesList"), count: $("noteCount"),
    search: $("searchInput"), title: $("noteTitle"), desc: $("noteDescription"),
    sections: $("sectionsList"), addNote: $("newNoteBtn"), addSection: $("addSectionBtn"),
    addFirst: $("addFirstSectionBtn"), deleteNote: $("deleteNoteBtn"), back: $("backBtn"),
    backup: $("backupBtn"), restore: $("restoreBtn"), restoreInput: $("restoreInput"),
    status: $("saveStatus"), toast: $("toast")
  };
  let state = loadState(), currentId = null, searchTerm = "", saveTimer = null, toastTimer = null;
  function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,8)}
  function freshNote(){const now=new Date().toISOString();return {id:uid(),title:"",description:"",sections:[],createdAt:now,updatedAt:now}}
  function loadState(){
    try { const parsed=JSON.parse(localStorage.getItem(KEY)||"null"); if(parsed&&Array.isArray(parsed.notes)) return parsed; } catch(e){}
    const note={id:uid(),title:"Моя первая заметка",description:"Здесь можно собирать мысли по отдельным цветным разделам.",sections:[{id:uid(),title:"Идеи",text:"Нажми на заголовок, чтобы свернуть или раскрыть текст.\n\nЦвет, название и содержимое раздела можно изменить.",color:COLORS[0],collapsed:false}],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
    return {notes:[note]};
  }
  function persist(){
    clearTimeout(saveTimer); els.status.textContent="Сохраняем…";
    saveTimer=setTimeout(()=>{try{localStorage.setItem(KEY,JSON.stringify(state));els.status.textContent="Сохранено на этом устройстве · "+new Date().toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"});}catch(e){els.status.textContent="Не удалось сохранить: память устройства заполнена";showToast("Не удалось сохранить. Экспортируй резервную копию.");}},120);
  }
  function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
  function dateLabel(v){try{return new Date(v).toLocaleDateString("ru-RU",{day:"numeric",month:"short"})}catch(e){return ""}}
  function contentOf(n){return [n.title,n.description,...n.sections.flatMap(s=>[s.title,s.text])].join(" ").toLowerCase()}
  function renderList(){
    const filtered=state.notes.filter(n=>contentOf(n).includes(searchTerm));
    els.count.textContent=`${state.notes.length} ${plural(state.notes.length,"заметка","заметки","заметок")}`;
    if(!filtered.length){els.list.innerHTML=`<div class="empty-list">${state.notes.length?"Ничего не найдено. Попробуй другой запрос.":"Пока нет заметок.<br>Нажми ＋, чтобы создать первую."}</div>`;return}
    els.list.innerHTML=filtered.slice().sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).map(n=>{
      const preview=n.description||n.sections.find(s=>s.text.trim())?.text||"Пустая заметка";
      const color=n.sections[0]?.color||COLORS[0];
      return `<button class="note-card ${n.id===currentId?"active":""}" data-note="${n.id}"><span class="note-mark" style="--note-color:${color}"></span><span class="note-card-copy"><span class="note-card-title">${esc(n.title||"Без названия")}</span><span class="note-card-preview">${esc(preview)}</span><span class="note-card-date">${dateLabel(n.updatedAt)} · ${n.sections.length} ${plural(n.sections.length,"раздел","раздела","разделов")}</span></span></button>`;
    }).join("");
  }
  function plural(n,a,b,c){const n10=n%10,n100=n%100;return n100>=11&&n100<=14?c:n10===1?a:n10>=2&&n10<=4?b:c}
  function getCurrent(){return state.notes.find(n=>n.id===currentId)}
  function markChanged(){const n=getCurrent();if(n)n.updatedAt=new Date().toISOString();persist();renderList()}
  function openNote(id){currentId=id;const n=getCurrent();if(!n)return;els.title.value=n.title;els.desc.value=n.description;renderSections();renderList();els.layout.classList.add("editing");}
  function newNote(){const n=freshNote();state.notes.unshift(n);currentId=n.id;persist();renderList();openNote(n.id);els.title.focus();showToast("Новая заметка создана")}
  function backToList(){els.layout.classList.remove("editing");renderList()}
  function renderSections(){
    const n=getCurrent();if(!n)return;
    els.sections.innerHTML=n.sections.map(s=>`<article class="section-card" style="--section-color:${s.color}" data-section="${s.id}">
      <div class="section-head">
        <button class="section-toggle" data-action="toggle" aria-expanded="${!s.collapsed}"><span class="section-chevron">${s.collapsed?"⌄":"⌃"}</span><span class="section-heading-text">${esc(s.title||"Без названия")}</span></button>
        <div class="section-actions"><button class="section-action" data-action="settings" title="Название и цвет" aria-label="Настройки раздела">•••</button><button class="section-action" data-action="delete" title="Удалить раздел" aria-label="Удалить раздел">×</button></div>
      </div>
      ${s.collapsed?"":`<div class="section-body"><textarea data-field="text" placeholder="Запиши здесь свои мысли…" aria-label="Текст раздела">${esc(s.text)}</textarea><div class="section-footer"><span>${s.text.length} символов</span><button class="section-action" data-action="settings">Изменить цвет и заголовок</button></div></div>`}
      ${s.settings?`<div class="section-settings"><label class="settings-label">Заголовок раздела<input class="section-edit-title" data-field="title" value="${esc(s.title)}" placeholder="Название раздела" maxlength="100"></label><span class="settings-label">Цвет заголовка</span><div class="color-picker">${COLORS.map(c=>`<button class="color-dot ${s.color===c?"selected":""}" style="background:${c}" data-action="color" data-color="${c}" aria-label="Выбрать цвет ${c}" title="${c}"></button>`).join("")}</div><div><button class="section-action" data-action="close-settings">Готово</button></div></div>`:""}
    </article>`).join("");
    els.addFirst.classList.toggle("hidden",n.sections.length>0);
  }
  function addSection(){const n=getCurrent();if(!n)return;const s={id:uid(),title:"Новый раздел",text:"",color:COLORS[n.sections.length%COLORS.length],collapsed:false,settings:true};n.sections.push(s);markChanged();renderSections();const input=els.sections.querySelector(`[data-section="${s.id}"] [data-field="title"]`);if(input){input.focus();input.select()}}
  function showToast(msg){els.toast.textContent=msg;els.toast.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>els.toast.classList.remove("show"),2300)}
  function downloadBackup(){
    const payload={app:"notes@",version:1,exportedAt:new Date().toISOString(),notes:state.notes};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`notes-at-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);showToast("Резервная копия подготовлена");
  }
  function importBackup(file){
    if(!file)return;const reader=new FileReader();
    reader.onload=()=>{try{const data=JSON.parse(reader.result);const notes=Array.isArray(data)?data:data.notes;if(!Array.isArray(notes)||!notes.every(n=>n&&typeof n==="object"&&Array.isArray(n.sections)))throw Error("bad");if(!confirm(`Импортировать ${notes.length} заметок? Текущие заметки будут заменены.`))return;state={notes:notes.map(n=>({...n,id:n.id||uid(),title:String(n.title||""),description:String(n.description||""),sections:n.sections.map(s=>({...s,id:s.id||uid(),title:String(s.title||""),text:String(s.text||""),color:COLORS.includes(s.color)?s.color:COLORS[0],collapsed:!!s.collapsed,settings:false})),createdAt:n.createdAt||new Date().toISOString(),updatedAt:n.updatedAt||new Date().toISOString()}))};currentId=state.notes[0]?.id||null;persist();renderList();if(currentId)openNote(currentId);else backToList();showToast("Копия импортирована");}catch(e){showToast("Файл не похож на резервную копию notes@")}};
    reader.readAsText(file);
  }
  els.list.addEventListener("click",e=>{const card=e.target.closest("[data-note]");if(card)openNote(card.dataset.note)});
  els.search.addEventListener("input",()=>{searchTerm=els.search.value.trim().toLowerCase();renderList()});
  els.addNote.addEventListener("click",newNote);
  els.addSection.addEventListener("click",addSection);els.addFirst.addEventListener("click",addSection);
  els.back.addEventListener("click",backToList);
  els.title.addEventListener("input",()=>{const n=getCurrent();if(n){n.title=els.title.value;markChanged()}});
  els.desc.addEventListener("input",()=>{const n=getCurrent();if(n){n.description=els.desc.value;markChanged()}});
  els.deleteNote.addEventListener("click",()=>{const n=getCurrent();if(!n)return;if(!confirm(`Удалить заметку «${n.title||"Без названия"}»? Это действие нельзя отменить.`))return;state.notes=state.notes.filter(x=>x.id!==currentId);currentId=null;persist();renderList();backToList();if(state.notes.length)showToast("Заметка удалена")});
  els.sections.addEventListener("input",e=>{const card=e.target.closest("[data-section]");if(!card)return;const n=getCurrent(),s=n?.sections.find(x=>x.id===card.dataset.section);if(!s)return;if(e.target.dataset.field==="text"){s.text=e.target.value;const counter=card.querySelector(".section-footer span");if(counter)counter.textContent=`${s.text.length} символов`;markChanged()}else if(e.target.dataset.field==="title"){s.title=e.target.value;const heading=card.querySelector(".section-heading-text");if(heading)heading.textContent=s.title||"Без названия";markChanged()}});
  els.sections.addEventListener("click",e=>{
    const btn=e.target.closest("[data-action]");if(!btn)return;const card=btn.closest("[data-section]"),n=getCurrent(),s=n?.sections.find(x=>x.id===card?.dataset.section);if(!s)return;
    switch(btn.dataset.action){
      case "toggle":s.collapsed=!s.collapsed;renderSections();persist();break;
      case "settings":s.settings=!s.settings;renderSections();break;
      case "close-settings":s.settings=false;renderSections();markChanged();break;
      case "color":s.color=btn.dataset.color;renderSections();markChanged();break;
      case "delete":if(confirm(`Удалить раздел «${s.title||"Без названия"}»?`)){n.sections=n.sections.filter(x=>x.id!==s.id);renderSections();markChanged()}break;
    }
  });
  els.backup.addEventListener("click",downloadBackup);
  els.restore.addEventListener("click",()=>els.restoreInput.click());
  els.restoreInput.addEventListener("change",()=>{importBackup(els.restoreInput.files[0]);els.restoreInput.value=""});
  window.addEventListener("beforeunload",()=>{if(saveTimer){clearTimeout(saveTimer);try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}}});
  if("serviceWorker" in navigator && location.protocol!=="file:"){window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}))}
  renderList();
  if(state.notes.length)openNote(state.notes.slice().sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))[0].id);
})();