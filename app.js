'use strict';
(() => {
if (window.top !== window.self) { document.documentElement.classList.add('framed'); return; }

const $ = s => document.querySelector(s);
const main = $('#main'), ov = $('#overlay');
const APP_VERSION = 5;
const slug = t => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const enc = t => encodeURIComponent(t);
const SITES = [
  {k:'computrabajo', n:'Computrabajo', c:'#3F7FD9', url:q => `https://sv.computrabajo.com/trabajo-de-${slug(q)}`},
  {k:'tecoloco', n:'Tecoloco', c:'#F08A3C', url:q => `https://www.tecoloco.com.sv/empleos?Keywords=${enc(q)}`},
  {k:'linkedin', n:'LinkedIn', c:'#3E8FC7', url:q => `https://www.linkedin.com/jobs/search/?keywords=${enc(q)}&location=${enc('El Salvador')}`},
  {k:'jooble', n:'Jooble', c:'#5FBF7A', url:q => `https://sv.jooble.org/SearchResult?ukw=${enc(q)}`},
  {k:'toptrabajos', n:'TopTrabajos', c:'#E86A7E', url:q => `https://www.toptrabajos.com/empleos?q=${enc(q).replace(/%20/g, '+')}&pais=sv`},
  {k:'buscojobs', n:'BuscoJobs', c:'#C9A0E8', url:q => `https://www.buscojobs.com.sv/ofertas/${slug(q)}_`},
  {k:'facebook', n:'Facebook (recientes)', c:'#7B8FE8', url:q => `https://www.facebook.com/search/top?q=${enc(q)}&filters=eyJyZWNlbnRfcG9zdHM6MCI6IntcIm5hbWVcIjpcInJlY2VudF9wb3N0c1wiLFwiYXJnc1wiOlwiXCJ9In0%3D`}];
const DEFAULT_LINKS = [
  {n:'Ministerio de Trabajo', u:'https://oportunidades.mtps.gob.sv/home'},
  {n:'INCAF', u:'https://www.incaf.gob.sv/oportunidades/'},
  {n:'Tuchance', u:'https://www.tuchance.org.sv/chances/empleos-permanentes'},
  {n:'Cámara de Comercio', u:'https://app.camarasal.com/offers_available'},
  {n:'Crecer con Empleo', u:'https://app.crecerconempleo.com'},
  {n:'Mi Futuro Empleo', u:'https://sv.mifuturoempleo.com'},
  {n:'Saplic', u:'https://saplic.com/sv/busqueda-ofertas-empleo'},
  {n:'QuieroAplicar', u:'https://sv.quieroaplicar.com'},
  {n:'Grupo de Facebook 1', u:'https://www.facebook.com/groups/192469391268181/?sorting_setting=CHRONOLOGICAL'},
  {n:'Grupo de Facebook 2', u:'https://www.facebook.com/groups/483938870682421/?sorting_setting=CHRONOLOGICAL'},
  {n:'Grupo de Facebook 3', u:'https://www.facebook.com/groups/1651884641745913/?sorting_setting=CHRONOLOGICAL'},
  {n:'Grupo de Facebook 4', u:'https://www.facebook.com/groups/322302113232266/?sorting_setting=CHRONOLOGICAL'}];
const STATUS = [['saved','Guardada','#8E8E96'],['applied','Postulé','#6FB7E8'],['interview','Entrevista','#F0C45A'],['offer','Oferta','#5FD3A0'],['closed','No seleccionada','#5C5C63']];
const ST = Object.fromEntries(STATUS.map(([k, n, c]) => [k, {n, c}]));
const I = {plus:'<path d="M12 5v14M5 12h14"/>',back:'<path d="m15 6-6 6 6 6"/>',x:'<path d="M6 6l12 12M18 6 6 18"/>',gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/>',search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',ext:'<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>',down:'<path d="M12 4v12M7 11l5 5 5-5M5 20h14"/>',up:'<path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>',star:'<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>'};
const ic = (n, s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => Date.now().toString(36) + Array.from(crypto.getRandomValues(new Uint8Array(6)), b => (b % 36).toString(36)).join('');
const NO_SPELL = 'autocomplete="off" autocorrect="off" spellcheck="false"';
const pad2 = n => String(n).padStart(2, '0');
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; };
const parse = s => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d, 12); };
const daysTo = s => Math.round((parse(s) - parse(todayKey())) / 864e5);
const fmtShort = s => parse(s).toLocaleDateString('es-SV', {day:'numeric', month:'short'}).replace(/\./g, '');
const plural = (n, a, b) => `${n} ${n === 1 ? a : b}`;

/* ---------- Almacenamiento ---------- */
const DB = { db:null,
  open(){ return new Promise(res => { try { const r = indexedDB.open('empleos', 1);
    r.onupgradeneeded = () => { const d = r.result; d.createObjectStore('jobs', {keyPath:'id'}); d.createObjectStore('meta', {keyPath:'k'}); };
    r.onsuccess = () => { this.db = r.result; res(true); }; r.onerror = () => res(false); r.onblocked = () => res(false); } catch(e){ res(false); } }); },
  req(s, m, fn){ return new Promise((res, rej) => { try { const t = this.db.transaction(s, m), q = fn(t.objectStore(s)); let out;
    if (q) q.onsuccess = () => { out = q.result; }; t.oncomplete = () => res(out); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); } catch(e){ rej(e); } }); },
  get(s,k){ return this.req(s,'readonly',o=>o.get(k)); }, all(s){ return this.req(s,'readonly',o=>o.getAll()).then(r=>r||[]); }, put(s,v){ return this.req(s,'readwrite',o=>o.put(v)); }, del(s,k){ return this.req(s,'readwrite',o=>o.delete(k)); }, clear(s){ return this.req(s,'readwrite',o=>o.clear()); } };
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/, ID_RE = /^[a-z0-9]{6,40}$/;
const str = (v, n) => typeof v === 'string' ? v.slice(0, n) : '';
const safeUrl = u => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href.slice(0, 2000) : ''; } catch(e){ return ''; } };
const siteOf = u => { try { const h = new URL(u).hostname.replace(/^www\./, ''); if (/computrabajo/.test(h)) return 'Computrabajo'; if (/tecoloco/.test(h)) return 'Tecoloco'; if (/linkedin/.test(h)) return 'LinkedIn'; if (/google/.test(h)) return 'Google'; if (/indeed/.test(h)) return 'Indeed'; return h; } catch(e){ return ''; } };
function clean(j){ if (!j || !ID_RE.test(j.id)) return null; const title = str(j.title, 160).trim(); if (!title) return null;
  return {id:j.id, title, company:str(j.company, 100).trim(), url:safeUrl(j.url || ''), status:ST[j.status] ? j.status : 'saved', applied:DATE_RE.test(j.applied || '') ? j.applied : '', next:DATE_RE.test(j.next || '') ? j.next : '', nextNote:str(j.nextNote, 120), note:str(j.note, 2000), salary:str(j.salary, 60), created:+j.created || Date.now(), updated:+j.updated || Date.now()}; }
let jobs = [], searches = [], links = DEFAULT_LINKS.map(l => Object.assign({}, l)), query = '', view = {name:'search'}, hist = [], tab = 'search', filter = 'active', draft = null, installEvt = null;
async function saveJob(j){ j.updated = Date.now(); await DB.put('jobs', j); const k = jobs.findIndex(x => x.id === j.id); k < 0 ? jobs.push(j) : jobs[k] = j; }
const saveLinks = () => DB.put('meta', {k:'links', v:links, ver:5}).catch(() => {});
const saveSearches = () => DB.put('meta', {k:'searches', v:searches}).catch(() => {});

/* ---------- Superposiciones y botón atrás ---------- */
let ovState = false, pendingBack = false, wantPush = false, pendingCb = null, sheetRes = null;
function toast(m){ const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2600); }
function openOverlay(html, cls){ ov.className = cls; ov.innerHTML = html; ov.hidden = false; document.body.style.overflow = 'hidden'; if (!ovState){ ovState = true; if (pendingBack) wantPush = true; else history.pushState({ov:1}, ''); } }
function hideOverlay(){ ov.hidden = true; ov.innerHTML = ''; ov.className = ''; document.body.style.overflow = ''; }
function closeOverlay(cb){ hideOverlay(); if (ovState){ ovState = false; if (wantPush){ wantPush = false; if (cb) cb(); } else { pendingBack = true; pendingCb = cb || null; history.back(); } } else if (cb) cb(); }
function resolveSheet(v){ const r = sheetRes; sheetRes = null; closeOverlay(() => { if (r) r(v); }); }
function confirmBox(title, text, ok){ return new Promise(res => { sheetRes = v => res(!!v); openOverlay(`<div class="sheet" role="dialog" aria-modal="true"><h2>${esc(title)}</h2><p>${esc(text)}</p><button class="btn btn-danger" data-act="sheetOk">${esc(ok)}</button><button class="btn btn-ghost" data-act="sheetNo">Cancelar</button></div>`, 'dim'); }); }
function go(v){ hist.push(Object.assign({}, view, {y:window.scrollY})); view = v; history.pushState({d:hist.length}, ''); render(); window.scrollTo(0,0); }
function back(){ if (ovState) return resolveSheet(null); if (hist.length) history.back(); }
window.addEventListener('popstate', () => {
  if (pendingBack){ pendingBack = false; if (wantPush){ wantPush = false; history.pushState({ov:1}, ''); } const cb = pendingCb; pendingCb = null; if (cb) cb(); return; }
  if (ovState){ ovState = false; hideOverlay(); const r = sheetRes; sheetRes = null; if (r) r(null); return; }
  if (!hist.length) return; const v = hist.pop(), y = v.y || 0; delete v.y; view = v; draft = null; render(); window.scrollTo(0, y); });

/* ---------- Vistas ---------- */
const dueSoon = () => jobs.filter(j => j.next && j.status !== 'closed' && daysTo(j.next) <= 0).length;
function topBar(){ const n = dueSoon();
  return `<header class="bar"><h1 class="title">Empleos</h1><div class="bar-actions">${installEvt?'<button class="pill-btn" data-act="install">Instalar</button>':''}<button class="icon-btn" data-act="settings" aria-label="Ajustes">${ic('gear')}</button></div></header>
  <div class="seg" role="tablist"><button role="tab" class="${tab==='search'?'on':''}" data-tab="search">Buscar</button><button role="tab" class="${tab==='jobs'?'on':''}" data-tab="jobs">Mis postulaciones${n ? ` <span class="count">${n}</span>` : ''}</button></div>`; }
function viewSearch(){ let h = topBar();
  h += `<div class="search-box big">${ic('search',20)}<input id="q" type="search" placeholder="¿Qué trabajo buscas?" value="${esc(query)}" aria-label="Qué trabajo buscas" enterkeyhint="search" ${NO_SPELL}></div><div id="dyn">${searchDyn()}</div>`;
  h += `<div class="tip"><b>¿Encontraste una oferta que te interesa?</b><span>Ábrela en el navegador, toca «Compartir» y elige «Empleos». Se guarda en «Mis postulaciones» para darle seguimiento.</span></div>`;
  return h; }
function searchDyn(){ const q = query.trim(); let h = '';
  const chips = searches.map(s => `<button class="chip ${s === q ? 'on' : ''}" data-q="${esc(s)}">${esc(s)}</button>`).join('');
  const star = q && !searches.includes(q) ? `<button class="chip star" data-act="saveSearch">${ic('star',14)} Guardar «${esc(q)}»</button>` : '';
  h += chips || star ? `<div class="chips saved">${star}${chips}</div>` : `<p class="fine">Escribe un puesto, por ejemplo «maestro de inglés». Puedes guardarlo para tenerlo a un toque.</p>`;
  h += `<h2 class="section">${q ? `Buscar «${esc(q)}» en` : 'Escribe arriba y elige dónde buscar'}</h2><div class="sites">${SITES.map(s => q ? `<a class="site" href="${esc(s.url(q))}" target="_blank" rel="noopener noreferrer" data-c="${s.c}"><span class="site-ic">${esc(s.n.charAt(0))}</span><b>${esc(s.n)}</b></a>` : `<button class="site off" data-site="${s.k}" data-c="${s.c}"><span class="site-ic">${esc(s.n.charAt(0))}</span><b>${esc(s.n)}</b></button>`).join('')}</div>`;
  h += `<p class="fine">Se abre la página con tu búsqueda ya escrita. Si tienes la app de LinkedIn o Facebook, se abre ahí.</p>`;
  const LINK_COLORS = ['#B07BE8','#4AC1C9','#E8894A','#5FD3A0','#E86AA0','#C9A24A','#6AB0E8','#E8C24A','#9AA3AD','#8C9CE8','#E86A7E','#7BC86C'];
  h += `<h2 class="section">Accesos directos</h2>${links.length ? `<div class="sites">${links.map((l, i) => `<a class="site" href="${esc(l.u)}" target="_blank" rel="noopener noreferrer" data-c="${/facebook\.com\/groups/.test(l.u) ? '#7B8FE8' : LINK_COLORS[i % LINK_COLORS.length]}"><span class="site-ic">${esc(l.n.charAt(0).toUpperCase())}</span><b>${esc(l.n)}</b></a>`).join('')}</div>` : '<p class="fine">Agrega tus páginas o grupos favoritos en Ajustes.</p>'}<p class="fine">${query.trim() ? `Al abrir cualquier página, «${esc(query.trim())}» se copia solo para que lo pegues en su buscador.` : 'Si escribes arriba lo que buscas, se copia solo al abrir cualquier página, para que lo pegues en su buscador.'}</p><button class="link-btn edit-links" data-act="settings">Editar accesos directos</button>`;
  return h; }
function paintDyn(){ const d = $('#dyn'); if (d){ d.innerHTML = searchDyn(); paint(); } }
function jobRow(j){ const s = ST[j.status], next = j.next && j.status !== 'closed' ? (daysTo(j.next) < 0 ? 'Seguimiento pendiente' : daysTo(j.next) === 0 ? 'Seguimiento hoy' : `Seguimiento ${fmtShort(j.next)}`) : '';
  return `<button class="job" data-open="${esc(j.id)}"><span class="st-dot" data-c="${s.c}"></span><span class="job-main"><b>${esc(j.title)}</b><small>${esc([j.company, siteOf(j.url)].filter(Boolean).join(', '))}</small>${next ? `<small class="${daysTo(j.next) <= 0 ? 'due' : ''}">${next}</small>` : ''}</span><span class="st-tag" data-c="${s.c}">${s.n}</span></button>`; }
function viewJobs(){ let h = topBar();
  if (!jobs.length) return h + `<div class="empty"><div class="empty-mark">${ic('plus',30)}</div><h2>Aún no guardas ofertas</h2><p>Comparte una oferta desde el navegador hacia «Empleos», o agrégala a mano.</p><button class="btn btn-primary" data-act="add">Agregar oferta</button></div>`;
  const counts = Object.fromEntries(STATUS.map(([k]) => [k, jobs.filter(j => j.status === k).length]));
  h += `<div class="pipeline">${STATUS.filter(([k]) => k !== 'closed').map(([k, n, c]) => `<div data-c="${c}"><b>${counts[k]}</b><span>${n}</span></div>`).join('')}</div>`;
  h += `<div class="chips">${[['active','En proceso'], ...STATUS.map(([k, n]) => [k, n])].map(([k, n]) => `<button class="chip ${filter === k ? 'on' : ''}" data-filter="${k}">${n}</button>`).join('')}</div>`;
  const l = jobs.filter(j => filter === 'active' ? j.status !== 'closed' : j.status === filter).sort((a,b) => (a.next && a.status !== 'closed' ? a.next : '9999').localeCompare(b.next && b.status !== 'closed' ? b.next : '9999') || b.updated - a.updated);
  return h + (l.length ? `<div class="list">${l.map(jobRow).join('')}</div>` : '<p class="empty-sm">Nada por aquí.</p>') + `<button class="fab" data-act="add" aria-label="Agregar oferta">${ic('plus',28)}</button>`; }
function viewDetail(){ const j = jobs.find(x => x.id === view.id); if (!j){ view = {name:'jobs'}; return viewJobs(); }
  let h = `<header class="bar"><button class="icon-btn" data-act="back" aria-label="Volver">${ic('back')}</button><span class="spacer"></span><button class="pill-btn ghost" data-act="edit">Editar</button></header>`;
  h += `<h1 class="d-name">${esc(j.title)}</h1><p class="d-sub">${esc([j.company, siteOf(j.url), j.salary].filter(Boolean).join(', '))}</p>`;
  if (j.url) h += `<a class="btn btn-secondary" href="${esc(j.url)}" target="_blank" rel="noopener noreferrer">${ic('ext',18)} Abrir la oferta</a>`;
  h += `<h2 class="section">¿En qué va?</h2><div class="steps">${STATUS.map(([k, n, c]) => `<button class="step${j.status === k ? ' on' : ''}" data-status="${k}" data-c="${c}">${n}</button>`).join('')}</div>`;
  h += `<div class="box">${j.applied ? `<div class="row"><span>Postulé el</span><b>${fmtShort(j.applied)}</b></div>` : ''}<button class="row row-btn" data-act="setNext"><span>Próximo paso</span><b>${j.next ? `${esc(j.nextNote || 'Seguimiento')}, ${fmtShort(j.next)}` : 'Agregar'}</b></button></div>`;
  if (j.note) h += `<div class="box"><p class="fine">${esc(j.note)}</p></div>`;
  return h + `<button class="btn btn-danger-text mt" data-act="delete">Eliminar</button>`; }
function viewForm(){ const d = draft, edit = jobs.some(j => j.id === d.id);
  return `<header class="bar"><button class="icon-btn" data-act="back" aria-label="Cancelar">${ic('x')}</button><h1 class="title title-sm">${edit ? 'Editar oferta' : 'Nueva oferta'}</h1><button class="btn-save" data-act="save">Guardar</button></header>
  <label class="field"><span>Puesto</span><input id="f_title" value="${esc(d.title)}" maxlength="160" placeholder="Maestro de inglés" ${NO_SPELL}><em class="err" id="e_title"></em></label>
  <label class="field"><span>Empresa o institución</span><input id="f_company" value="${esc(d.company)}" maxlength="100" ${NO_SPELL}></label>
  <label class="field"><span>Enlace de la oferta</span><input id="f_url" type="url" inputmode="url" value="${esc(d.url)}" placeholder="https://" ${NO_SPELL}></label>
  <label class="field"><span>Salario (opcional)</span><input id="f_salary" value="${esc(d.salary)}" maxlength="60" placeholder="$600 a $800" ${NO_SPELL}></label>
  <label class="field"><span>Notas (opcional)</span><textarea id="f_note" rows="3" maxlength="2000" placeholder="Requisitos, contacto, cómo me fue…" ${NO_SPELL}>${esc(d.note)}</textarea></label>`; }
function viewSettings(){ const standalone = window.matchMedia('(display-mode: standalone)').matches;
  return `<header class="bar"><button class="icon-btn" data-act="back" aria-label="Volver">${ic('back')}</button><h1 class="title title-sm">Ajustes</h1><span class="spacer"></span></header>
  ${searches.length ? `<h2 class="section">Búsquedas guardadas</h2><div class="box">${searches.map((s, i) => `<div class="set-row"><span>${esc(s)}</span><button class="icon-btn" data-delq="${i}" aria-label="Quitar">${ic('x',18)}</button></div>`).join('')}</div>` : ''}
  <h2 class="section">Accesos directos</h2><div class="box">${links.map((l, i) => `<button class="set-row" data-editlink="${i}"><span>${esc(l.n)}<small>${esc(l.u.replace(/^https?:\/\/(www\.)?/, '').slice(0, 48))}</small></span><span class="chev">${ic('edit',16)}</span></button>`).join('')}<button class="set-row" data-editlink="-1"><span>Agregar acceso directo<small>Una página o un grupo de Facebook</small></span><span class="chev">${ic('plus',18)}</span></button></div>
  <h2 class="section">Instalación</h2><div class="box">${standalone?'<p class="fine">Ya estás usando la app instalada.</p>':installEvt?`<button class="set-row" data-act="install"><span>Instalar Empleos en el celular<small>Necesario para poder compartir ofertas hacia la app</small></span><span class="chev">${ic('down',18)}</span></button>`:'<p class="fine">Chrome todavía no ofrece instalarla. Abre la app en Chrome con internet, espera unos segundos y vuelve a entrar aquí.</p>'}</div>
  <h2 class="section">Copia de seguridad</h2><div class="box"><button class="set-row" data-act="exportBk"><span>Descargar copia</span><span class="chev">${ic('down',18)}</span></button><label class="set-row"><span>Restaurar una copia</span><span class="chev">${ic('up',18)}</span><input type="file" accept="application/json,.json" id="f_import" hidden></label></div>
  <h2 class="section">Privacidad</h2><div class="box"><p class="fine">Tus búsquedas y postulaciones se guardan solo en este celular. La app no se conecta a ninguna página: solo abre la búsqueda que eliges en tu navegador.</p></div>
  <button class="btn btn-danger-text mt" data-act="wipe">Borrar todo</button><p class="ver">Versión ${APP_VERSION}</p>`; }
function paint(){ document.querySelectorAll('[data-c]').forEach(e => e.style.setProperty('--c', e.dataset.c)); }
function render(){ main.innerHTML = ({search:viewSearch, jobs:viewJobs, detail:viewDetail, form:viewForm, settings:viewSettings}[view.name] || viewSearch)(); paint(); }

/* ---------- Acciones ---------- */
const newDraft = p => Object.assign({id:null, title:'', company:'', url:'', salary:'', note:'', status:'saved'}, p || {});
function linkBox(l){ return new Promise(res => { sheetRes = res; openOverlay(`<div class="sheet" role="dialog" aria-modal="true"><h2>${l ? 'Editar acceso directo' : 'Nuevo acceso directo'}</h2><label class="field"><span>Nombre</span><input id="l_n" value="${esc(l ? l.n : '')}" maxlength="60" placeholder="Empleos docentes SV" ${NO_SPELL}></label><label class="field"><span>Enlace</span><input id="l_u" type="url" inputmode="url" value="${esc(l ? l.u : '')}" placeholder="https://" ${NO_SPELL}><em class="err" id="l_err"></em></label><button class="btn btn-primary" data-act="linkOk">Guardar</button>${l ? '<button class="btn btn-danger-text" data-act="linkDel">Quitar</button>' : ''}<button class="btn btn-ghost" data-act="sheetNo">Cancelar</button></div>`, 'dim'); }); }
function nextBox(j){ return new Promise(res => { sheetRes = res; openOverlay(`<div class="sheet" role="dialog" aria-modal="true"><h2>Próximo paso</h2><label class="field"><span>Qué</span><input id="n_what" value="${esc(j.nextNote)}" maxlength="120" placeholder="Llamar para dar seguimiento, entrevista…" ${NO_SPELL}></label><label class="field"><span>Cuándo</span><input id="n_date" type="date" value="${j.next || ''}"></label><div class="quick-dates">${[['Mañana',1],['En 3 días',3],['En 1 semana',7]].map(([t, n]) => `<button type="button" class="chip" data-nd="${n}">${t}</button>`).join('')}</div><button class="btn btn-primary" data-act="nextOk">Guardar</button>${j.next ? '<button class="btn btn-ghost" data-act="nextClear">Quitar próximo paso</button>' : ''}<button class="btn btn-ghost" data-act="sheetNo">Cancelar</button></div>`, 'dim'); }); }
const A = {
  back(){ back(); },
  settings(){ go({name:'settings'}); },
  add(){ draft = newDraft(); go({name:'form'}); },
  edit(){ const j = jobs.find(x => x.id === view.id); if (!j) return; draft = Object.assign({}, j); go({name:'form'}); },
  saveSearch(){ const q = query.trim(); if (!q || searches.includes(q)) return; searches.unshift(q.slice(0, 60)); searches = searches.slice(0, 12); saveSearches(); paintDyn(); toast('Búsqueda guardada'); },
  async save(){ const title = $('#f_title').value.trim(); if (!title){ $('#e_title').textContent = 'Escribe el puesto.'; $('#f_title').focus(); return; }
    const ex = jobs.find(j => j.id === draft.id), raw = $('#f_url').value.trim();
    const rec = clean(Object.assign({}, ex || {}, draft, {id:ex ? ex.id : uid(), title, company:$('#f_company').value, url:raw ? (/^https?:\/\//i.test(raw) ? raw : 'https://' + raw) : '', salary:$('#f_salary').value, note:$('#f_note').value, created:ex ? ex.created : Date.now()}));
    await saveJob(rec); const isNew = !ex; draft = null;
    if (isNew){ tab = 'jobs'; view = {name:'detail', id:rec.id}; hist = [{name:'jobs'}]; history.pushState({d:1}, ''); render(); window.scrollTo(0,0); } else back();
    toast('Guardada'); },
  async setNext(){ const j = jobs.find(x => x.id === view.id); if (!j) return; const r = await nextBox(j); if (!r) return;
    if (r === 'clear'){ j.next = ''; j.nextNote = ''; } else { j.next = r.date; j.nextNote = r.what; } await saveJob(j); render(); toast('Listo'); },
  nextOk(){ const d = $('#n_date').value; if (!DATE_RE.test(d)) return toast('Elige la fecha.'); resolveSheet({date:d, what:$('#n_what').value.trim()}); },
  nextClear(){ resolveSheet('clear'); },
  linkOk(){ const n = $('#l_n').value.trim(), raw = $('#l_u').value.trim(), u = safeUrl(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw); if (!raw || !u){ $('#l_err').textContent = 'Revisa el enlace.'; return; } resolveSheet({n:n || new URL(u).hostname.replace(/^www\./, ''), u}); },
  linkDel(){ resolveSheet('del'); },
  async delete(){ const j = jobs.find(x => x.id === view.id); if (!j) return; if (!await confirmBox('¿Eliminar esta oferta?', 'Se borra con sus notas.', 'Eliminar')) return; await DB.del('jobs', j.id); jobs = jobs.filter(x => x.id !== j.id); back(); toast('Eliminada'); },
  sheetOk(){ resolveSheet(true); }, sheetNo(){ resolveSheet(null); },
  async install(){ if (!installEvt) return; const e = installEvt; installEvt = null; try { await e.prompt(); await e.userChoice; } catch(err){} render(); },
  exportBk(){ const url = URL.createObjectURL(new Blob([JSON.stringify({app:'empleos', v:1, created:new Date().toISOString(), jobs, searches, links})], {type:'application/json'})), a = document.createElement('a'); a.href = url; a.download = `empleos-copia-${todayKey()}.json`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000); toast('Copia descargada'); },
  async wipe(){ if (!await confirmBox('¿Borrar todo?', 'Se eliminan tus postulaciones y búsquedas guardadas.', 'Borrar todo')) return; await DB.clear('jobs'); jobs = []; searches = []; saveSearches(); toast('Todo borrado'); back(); }
};
async function importBk(file){ let d; try { d = JSON.parse(await file.text()); } catch(e){ return toast('Ese archivo no es una copia válida.'); }
  if (!d || d.app !== 'empleos' || !Array.isArray(d.jobs)) return toast('Ese archivo no es una copia válida.');
  let n = 0; for (const r of d.jobs){ const j = clean(r); if (!j) continue; await saveJob(j); n++; }
  if (Array.isArray(d.searches)) { d.searches.filter(s => typeof s === 'string' && s.trim()).forEach(s => { if (!searches.includes(s)) searches.push(s.slice(0, 60)); }); searches = searches.slice(0, 12); saveSearches(); }
  render(); toast(`${plural(n, 'oferta restaurada', 'ofertas restauradas')}`); }
function sharedDraft(){ const q = new URLSearchParams(location.search); if (!q.has('title') && !q.has('text') && !q.has('url')) return null;
  history.replaceState(null, '', location.pathname);
  const text = q.get('text') || '', url = safeUrl((q.get('url') || '').trim() || ((text.match(/https?:\/\/\S+/) || [''])[0]));
  let title = (q.get('title') || text.replace(/https?:\/\/\S+/g, '')).replace(/\s*[|\-–]\s*(Computrabajo|Tecoloco|LinkedIn|Indeed).*$/i, '').replace(/\s+/g, ' ').trim();
  return newDraft({title:title.slice(0, 160), url}); }

/* ---------- Eventos ---------- */
document.addEventListener('click', e => { const a = e.target.closest('a.site, a.link-row'), q = query.trim(); if (!a || !q) return;
  try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(q).catch(() => {}); } catch(err){}
  toast(`«${q}» copiado`); }, true);
document.addEventListener('click', async e => {
  const t = e.target.closest('[data-act],[data-tab],[data-q],[data-site],[data-open],[data-filter],[data-status],[data-nd],[data-delq],[data-link],[data-editlink]'); if (!t) return; const ds = t.dataset;
  if (ds.tab){ tab = ds.tab; view = {name:tab}; render(); window.scrollTo(0,0); return; }
  if (ds.q !== undefined){ query = ds.q; const i = $('#q'); if (i) i.value = query; paintDyn(); return; }
  if (ds.site){ const i = $('#q'); if (i) i.focus(); return toast('Escribe primero qué trabajo buscas.'); }
  if (ds.open) return go({name:'detail', id:ds.open});
  if (ds.filter){ filter = ds.filter; render(); return; }
  if (ds.status){ const j = jobs.find(x => x.id === view.id); if (!j) return; j.status = ds.status; if (ds.status === 'applied' && !j.applied) j.applied = todayKey(); await saveJob(j); render(); toast(ST[ds.status].n); return; }
  if (ds.nd){ const d = new Date(); d.setDate(d.getDate() + +ds.nd); $('#n_date').value = `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; return; }
  if (ds.link !== undefined){ const l = links[+ds.link]; if (l) window.open(l.u, '_blank', 'noopener'); return; }
  if (ds.editlink !== undefined){ const i = +ds.editlink, r = await linkBox(i >= 0 ? links[i] : null); if (!r) return; if (r === 'del') links.splice(i, 1); else if (i >= 0) links[i] = r; else links.push(r); saveLinks(); render(); toast(r === 'del' ? 'Acceso directo quitado' : 'Guardado'); return; }
  if (ds.delq !== undefined){ searches.splice(+ds.delq, 1); saveSearches(); render(); return; }
  if (ds.act && A[ds.act]) A[ds.act](t);
});
document.addEventListener('input', e => { const t = e.target; if (t.id === 'q'){ const had = !!query.trim(); query = t.value; if (had !== !!query.trim() || true){ const pos = t.selectionStart; render(); const n = $('#q'); if (n){ n.focus(); try { n.setSelectionRange(pos, pos); } catch(err){} } } } if (t.id === 'f_title') $('#e_title').textContent = ''; });
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'q'){ e.preventDefault(); e.target.blur(); } if (e.key === 'Escape' && ovState) resolveSheet(null); });
document.addEventListener('change', e => { const t = e.target; if (t.id === 'f_import'){ const f = t.files && t.files[0]; t.value = ''; if (f) importBk(f); } });
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; if (['search','settings'].includes(view.name)) render(); });
window.addEventListener('appinstalled', () => { installEvt = null; toast('Empleos instalada'); render(); });

/* ---------- Inicio ---------- */
(async () => {
  if ('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register('sw.js', {scope:'./'}).catch(() => {});
  if (!window.indexedDB || !await DB.open()){ main.innerHTML = '<div class="empty"><h2>No se puede guardar</h2><p>Este navegador no permite guardar datos. Si estás en modo incógnito, abre la app en una pestaña normal.</p></div>'; return; }
  try { jobs = (await DB.all('jobs')).map(clean).filter(Boolean); } catch(e){ jobs = []; }
  try { const l = await DB.get('meta', 'links'); if (l && Array.isArray(l.v)){ links = l.v.filter(x => x && typeof x.n === 'string' && safeUrl(x.u)).map(x => ({n:x.n.slice(0, 60), u:safeUrl(x.u)})).slice(0, 30);
    // páginas nuevas de la versión 4: se suman a tus accesos directos sin tocar los que ya editaste
    const OLD = {'Ministerio de Trabajo (Oportunidades)':'Ministerio de Trabajo', 'INCAF (Oportunidades)':'INCAF', 'Tuchance (empleos permanentes)':'Tuchance', 'Cámara de Comercio (PROmuévete)':'Cámara de Comercio'};
    if ((l.ver || 1) < 5){ links.forEach(x => { if (OLD[x.n]) x.n = OLD[x.n]; }); saveLinks(); }
    if ((l.ver || 1) < 4){ const known = new Set(links.map(x => x.u)); DEFAULT_LINKS.forEach(d => { if (!known.has(d.u)) links.push(Object.assign({}, d)); }); saveLinks(); } } } catch(e){}
  try { const s = await DB.get('meta', 'searches'); if (s && Array.isArray(s.v)) searches = s.v.filter(x => typeof x === 'string').slice(0, 12); } catch(e){}
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  history.replaceState({root:1}, '');
  const shared = sharedDraft(); if (shared){ draft = shared; tab = 'jobs'; hist = [{name:'jobs'}]; view = {name:'form'}; history.pushState({d:1}, ''); }
  if (searches.length && !shared) query = searches[0];
  render();
})();
})();
