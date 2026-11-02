'use strict';
/* Nutri — registro de calorías y nutrientes. Todo se guarda en este dispositivo (localStorage). */
(function () {
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = (x, d = 0) => (+x || 0).toLocaleString('es-ES', {maximumFractionDigits: d, minimumFractionDigits: 0});
const r5 = x => Math.round(x / 5) * 5;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// ---------- fechas ----------
const dkey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parseKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return dkey(d); };
const today = () => dkey(new Date());
const MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const WD = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
function dayLabel(k) {
  const t = today();
  if (k === t) return 'Hoy';
  if (k === addDays(t, -1)) return 'Ayer';
  if (k === addDays(t, 1)) return 'Mañana';
  const d = parseKey(k); return `${cap(WD[d.getDay()])} ${d.getDate()}`;
}
const longDate = k => { const d = parseKey(k); return `${cap(WD[d.getDay()])}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`; };
const shortDate = k => { const d = parseKey(k); return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`; };

// ---------- estado ----------
const KEY = 'nutri_v1';
const def = () => ({profile: null, days: {}, weights: {}, custom: [], dishes: [], menu: null, shop: {}});
let S = (() => { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s) return Object.assign(def(), s); } catch (e) {} return def(); })();
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('No se pudo guardar: almacenamiento lleno'); } }
const U = {tab: 'today', day: today(), planSeg: 'goal', cal: null, wRange: 30, microOpen: true, open: {}};

// ---------- alimentos ----------
let FOODS = {}, FLIST = [];
const STOP = new Set(['de','del','la','el','los','las','con','en','al','a','y','para','un','una','unos','unas','crudo','cruda','crudos','crudas','grande','grandes','pequeno','pequena','mediano','mediana','trozo','trozos','poco','sopera','soperas','rasa','rasas','colmada','colmadas','plancha','horno','vapor','microondas','fresco_x']);
function norm(s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9% ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
function stem(w) {
  if (w.length <= 3) return w;
  if (w.endsWith('ces') && w.length > 5) return w.slice(0, -3) + 'z';
  if (w.endsWith('ones')) return w.slice(0, -2);
  if (/[rln]es$/.test(w) && w.length > 4) return w.slice(0, -2);
  if (w.endsWith('s')) return w.slice(0, -1);
  return w;
}
const toks = s => norm(s).split(' ').filter(w => w && !STOP.has(w)).map(stem);
function buildFoods() {
  FOODS = {}; FLIST = [];
  const add = f => { f.keys = [f.name, ...(f.aliases || [])].map(toks).filter(t => t.length); FOODS[f.id] = f; FLIST.push(f); };
  for (const r of FOOD_ROWS) {
    const [id, name, al, arr, unitG, unitName, base, cat, d] = r;
    const n = {}; NKEYS.forEach((k, i) => n[k] = arr[i]);
    add({id, name, aliases: al.split('|'), n, unitG, unitName, base, cat, d: d || 1});
  }
  for (const c of S.custom) add(Object.assign({aliases: [], cat: 'otros', d: 1, unitG: 0, unitName: ''}, c, {custom: true}));
}
function lev1(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, e = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++e > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return e + (a.length - i) + (b.length - j) <= 1;
}
function tokSim(a, b) {
  if (a === b) return 1;
  if (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a))) return 0.85;
  if (a.length >= 5 && b.length >= 5 && lev1(a, b)) return 0.8;
  return 0;
}
function scoreTokens(q, c) {
  let sq = 0, sc = 0;
  for (const a of q) { let b0 = 0; for (const b of c) b0 = Math.max(b0, tokSim(a, b)); sq += b0; }
  if (!sq) return 0;
  for (const b of c) { let b0 = 0; for (const a of q) b0 = Math.max(b0, tokSim(a, b)); sc += b0; }
  return 70 * sq / q.length + 30 * sc / c.length;
}
function matchFoods(text, n = 8, container = false) {
  const q = toks(text); if (!q.length) return [];
  const out = [];
  for (const f of FLIST) {
    let best = 0;
    f.keys.forEach((k, i) => { best = Math.max(best, scoreTokens(q, k) + (i === 0 ? 1 : 0)); });
    if (!best) continue;
    if (f.custom) best += 4;
    if (container && (f.unitName === 'lata' || f.unitName === 'bote')) best += 5;
    out.push([best, f]);
  }
  out.sort((a, b) => b[0] - a[0]);
  return out.slice(0, n);
}

// ---------- unidades ----------
const UNIT_MAP = {kg:'kg',kgs:'kg',kilo:'kg',kilos:'kg',kilogramo:'kg',kilogramos:'kg',g:'g',gr:'g',grs:'g',gramo:'g',gramos:'g',grm:'g',grms:'g',mg:'mg',ml:'ml',mililitro:'ml',mililitros:'ml',cl:'cl',centilitro:'cl',centilitros:'cl',dl:'dl',l:'l',lt:'l',lts:'l',litro:'l',litros:'l',
  cucharada:'cda',cucharadas:'cda',cda:'cda',cdas:'cda',cs:'cda',cucharadita:'cdta',cucharaditas:'cdta',cdta:'cdta',cdtas:'cdta',cc:'cdta',taza:'taza',tazas:'taza',vaso:'vaso',vasos:'vaso',
  pizca:'pizca',pizcas:'pizca',punado:'punado',punados:'punado',chorrito:'chorrito',chorro:'chorrito',chorritos:'chorrito',poco:'poco',poquito:'poco'};
const COUNT = new Set(['unidad','unidades','ud','uds','u','pieza','piezas','rebanada','rebanadas','loncha','lonchas','diente','dientes','onza','onzas','filete','filetes','cacito','cacitos','scoop','scoops','copa','copas','tercio','tercios','botellin','botellines','racion','raciones','porcion','porciones','bola','bolas','vasito','vasitos','barrita','barritas','sobre','sobres','x']);
const CONTAINER = new Set(['lata','latas','bote','botes','tarro','tarros','brick','paquete','bolsa']);
const NUMW = {un:1,una:1,uno:1,medio:0.5,media:0.5,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,diez:10,doce:12,cuarto:0.25,docena:12};
const UNIT_LABEL = {g:'g',kg:'kg',mg:'mg',ml:'ml',cl:'cl',dl:'dl',l:'L',cda:'cucharada',cdta:'cucharadita',taza:'taza',vaso:'vaso',pizca:'pizca',punado:'puñado',chorrito:'chorrito',poco:'poco'};
function defUnit(f) { if (f.id === 'sal' || f.id === 'especias') return 1; if (f.cat === 'despensa') return 10; return {carne:150, pescado:150, verdura:150, fruta:150, congelado:150, lacteos: f.base === 'ml' ? 250 : 125}[f.cat] || 100; }
function toBase(f, qty, unit) {
  const d = f.d || 1, liq = f.base === 'ml';
  const G = g => liq ? g / d : g, M = ml => liq ? ml : ml * d;
  const fluid = liq || d !== 1;
  switch (unit) {
    case 'g': return G(qty); case 'kg': return G(qty * 1000); case 'mg': return G(qty / 1000);
    case 'ml': return M(qty); case 'cl': return M(qty * 10); case 'dl': return M(qty * 100); case 'l': return M(qty * 1000);
    case 'cda': return f.unitName === 'cucharada' && f.unitG ? qty * f.unitG : fluid ? M(qty * 15) : G(qty * 15);
    case 'cdta': return f.unitName === 'cucharadita' && f.unitG ? qty * f.unitG : fluid ? M(qty * 5) : G(qty * 5);
    case 'taza': return liq ? M(qty * 240) : G(qty * 160);
    case 'vaso': return liq ? qty * (f.unitName === 'vaso' ? f.unitG : 250) : G(qty * 200);
    case 'pizca': return G(qty * 0.5); case 'punado': return G(qty * 30); case 'chorrito': return M(qty * 10); case 'poco': return G(qty * 10);
    default: return f.unitG ? qty * f.unitG : G(qty * defUnit(f));
  }
}
const baseU = f => f && f.base === 'ml' ? 'ml' : 'g';
function nOf(f, amt) { const n = {}; for (const k of NKEYS) if (f.n[k] != null && !isNaN(f.n[k])) n[k] = f.n[k] * amt / 100; return n; }
function addN(t, n, fr = 1) { for (const k in n) t[k] = (t[k] || 0) + n[k] * fr; return t; }

// Interpreta una línea tipo "200 g de arroz", "arroz 200g", "2 huevos", "media lata de atún"
function parseLine(seg) {
  let s = seg.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/(\d),(\d)/g, '$1.$2').replace(/[()\[\]:\-–=*•]/g, ' ')
    .replace(/(\d)([a-z])/g, '$1 $2').replace(/([a-z])(\d)/g, '$1 $2')
    .replace(/[^a-z0-9.\/% ]/g, ' ').replace(/\s+/g, ' ').trim();
  const T = s.split(' ').filter(Boolean);
  let qty = null, unit = null, container = false; const name = [];
  const isNum = t => /^\d+(\.\d+)?$/.test(t) || /^\d+\/\d+$/.test(t);
  const num = t => t.includes('/') ? (+t.split('/')[0]) / (+t.split('/')[1]) : +t;
  for (let i = 0; i < T.length; i++) {
    const t = T[i];
    if (qty == null && (isNum(t) || (NUMW[t] != null && name.length === 0))) {
      qty = isNum(t) ? num(t) : NUMW[t];
      if (T[i + 1] === 'y' && (T[i + 2] === 'medio' || T[i + 2] === 'media')) { qty += 0.5; i += 2; }
      const nx = T[i + 1];
      if (nx && UNIT_MAP[nx]) { unit = UNIT_MAP[nx]; i++; }
      else if (nx && COUNT.has(nx)) { unit = 'u'; i++; }
      else if (nx && CONTAINER.has(nx)) { unit = 'u'; container = true; }
      if (T[i + 1] === 'y' && (T[i + 2] === 'medio' || T[i + 2] === 'media')) { qty += 0.5; i += 2; }
      continue;
    }
    if (qty != null && unit == null && UNIT_MAP[t] && name.length) { unit = UNIT_MAP[t]; continue; }
    if (CONTAINER.has(t)) container = true;
    name.push(t);
  }
  while (name.length && ['de','del','y'].includes(name[0])) name.shift();
  const noQty = qty == null;
  if (noQty) qty = 1;
  if (!unit) unit = 'u';
  return {raw: seg.trim(), q: name.join(' '), qty, unit, container, noQty};
}
function splitDish(text) {
  return text.replace(/(\d),(\d)/g, '$1.$2').split(/\n|;|\+|,|\s+y\s+(?=(?:\d|un |una |medio |media |dos |tres ))|\s+e\s+(?=\d)/i).map(x => x.trim()).filter(x => x.length > 1);
}
function makeItem(p, fid) {
  const f = fid ? FOODS[fid] : null;
  const it = {raw: p.raw, q: p.q, qty: p.qty, unit: p.unit, fid: f ? f.id : null, warn: ''};
  if (f) {
    if (p.unit === 'u' && !f.unitG) it.warn = p.noQty ? `Sin cantidad: supongo ${defUnit(f)} ${baseU(f)}` : `1 unidad ≈ ${defUnit(f)} ${baseU(f)} (supuesto)`;
    else if (p.noQty) it.warn = 'Sin cantidad: supongo 1 unidad';
  }
  return calcItem(it);
}
function calcItem(it) {
  const f = FOODS[it.fid];
  if (!f) { it.amt = 0; it.n = {}; return it; }
  it.name = f.name; it.amt = toBase(f, +it.qty || 0, it.unit); it.n = nOf(f, it.amt); it.base = f.base;
  it.micro = f.n.ca != null;
  return it;
}

// ---------- nutrientes y objetivos ----------
const NM = {
  kcal:{l:'Energía',u:'kcal'}, p:{l:'Proteína',u:'g',col:'var(--prot)'}, c:{l:'Hidratos',u:'g',col:'var(--carb)'}, f:{l:'Grasa',u:'g',col:'var(--fat)'},
  fib:{l:'Fibra',u:'g',col:'var(--fib)', why:'Mejora el tránsito, la saciedad, la microbiota y el colesterol.', tip:'Legumbres, verdura, fruta entera (no zumo), avena y pan/pasta integral.'},
  s:{l:'Azúcares',u:'g'}, sf:{l:'Grasa saturada',u:'g'}, na:{l:'Sodio',u:'mg'},
  ca:{l:'Calcio',u:'mg', why:'Huesos y dientes, contracción muscular y transmisión nerviosa.', tip:'Lácteos, sardinas en lata (con espina), tofu, bebidas vegetales enriquecidas, almendras.'},
  fe:{l:'Hierro',u:'mg', why:'Transporta oxígeno en la sangre; si falta aparecen cansancio y anemia.', tip:'Legumbres, mejillones, carne roja, espinacas. Tómalo con vitamina C (pimiento, naranja, kiwi) y evita café o té justo en la comida.'},
  mg:{l:'Magnesio',u:'mg', why:'Participa en la producción de energía, la función muscular y el descanso.', tip:'Frutos secos, semillas, legumbres, avena, integrales y chocolate negro.'},
  k:{l:'Potasio',u:'mg', why:'Contrarresta el sodio y ayuda a mantener una tensión arterial sana.', tip:'Patata, legumbres, plátano, verdura de hoja, tomate y yogur.'},
  zn:{l:'Zinc',u:'mg', why:'Sistema inmune, cicatrización y síntesis de proteínas (también de testosterona).', tip:'Carne, marisco, legumbres, pipas de calabaza, avena y queso.'},
  vc:{l:'Vitamina C',u:'mg', why:'Antioxidante, necesaria para el colágeno y la inmunidad; multiplica la absorción del hierro vegetal.', tip:'Pimiento (sobre todo rojo), kiwi, naranja, fresas y brócoli. Mejor en crudo o poco cocinado.'},
  va:{l:'Vitamina A',u:'µg', why:'Visión, piel y sistema inmune.', tip:'Zanahoria, boniato, calabaza, espinacas y huevo (se absorbe mejor con algo de aceite).'},
  vd:{l:'Vitamina D',u:'µg', why:'Absorción del calcio, salud ósea, función muscular e inmunidad.', tip:'Pescado azul (salmón, sardinas, caballa) y huevo. La piel la fabrica con el sol; en invierno y en latitudes del norte es casi imposible llegar solo con comida y suele recomendarse un suplemento: coméntalo con tu médico.'},
  b12:{l:'Vitamina B12',u:'µg', why:'Formación de glóbulos rojos y salud del sistema nervioso.', tip:'Carne, pescado, marisco, huevo y lácteos. Si comes poco producto animal necesitarás suplemento.'},
  fol:{l:'Folato (B9)',u:'µg', why:'División celular y formación de glóbulos rojos.', tip:'Legumbres, verdura de hoja verde, brócoli, espárragos y naranja.'},
};
const MICROS = ['fib','ca','fe','mg','k','zn','vc','va','vd','b12','fol'];
const LIMITS = ['na','sf','s'];
const ACTS = [[1.2,'Sedentario','Trabajo sentado, casi sin ejercicio'],[1.375,'Ligero','Ejercicio 1-3 días/semana'],[1.55,'Moderado','Ejercicio 3-5 días/semana'],[1.725,'Activo','Ejercicio intenso 6-7 días/semana'],[1.9,'Muy activo','Trabajo físico o dos entrenos al día']];
const PLANS = [
  {id:'cut', name:'Perder grasa', ic:'🔥', delta:-0.20, pk:2.2, fat:0.25, desc:'Déficit del 20 %. Ritmo de ~0,5-1 % de tu peso por semana. Proteína alta y entreno de fuerza para no perder músculo.'},
  {id:'cut_soft', name:'Perder grasa suave', ic:'🌿', delta:-0.10, pk:1.8, fat:0.28, desc:'Déficit del 10 %. Más lento, con menos hambre y más fácil de mantener meses.'},
  {id:'recomp', name:'Recomposición', ic:'⚖️', delta:-0.05, pk:2.0, fat:0.27, desc:'Casi mantenimiento con mucha proteína: perder algo de grasa y ganar músculo a la vez. Funciona sobre todo si empiezas a entrenar fuerza o vuelves tras un parón.'},
  {id:'maintain', name:'Mantener peso', ic:'🟰', delta:0, pk:1.4, fat:0.30, desc:'Comer lo que gastas. Ideal para consolidar el peso actual y mejorar la calidad de la dieta.'},
  {id:'lean', name:'Ganar músculo (limpio)', ic:'💪', delta:0.10, pk:1.8, fat:0.25, desc:'Superávit del 10 % (~0,25-0,5 % del peso/semana). Maximiza músculo minimizando la grasa ganada.'},
  {id:'bulk', name:'Ganar músculo (rápido)', ic:'🏋️', delta:0.15, pk:1.8, fat:0.25, desc:'Superávit del 15 %. Para principiantes delgados o quien no consigue subir de peso. Ganarás algo más de grasa.'},
];
function microTargets(m, age) {
  return {
    ca: (!m && age > 50) || age > 70 ? 1200 : 1000,
    fe: m ? 8 : (age > 50 ? 8 : 18),
    mg: m ? (age > 30 ? 420 : 400) : (age > 30 ? 320 : 310),
    k: m ? 3400 : 2600, zn: m ? 11 : 8, vc: m ? 90 : 75, va: m ? 900 : 700,
    vd: age > 70 ? 20 : 15, b12: 2.4, fol: 400,
  };
}
function latestWeight() { const ks = Object.keys(S.weights).sort(); return ks.length ? S.weights[ks[ks.length - 1]] : null; }
function targets(p, planId) {
  p = p || S.profile; if (!p) return null;
  planId = planId || p.plan || 'maintain';
  const w = (p === S.profile && latestWeight()) || p.weight, h = p.height, a = p.age, m = p.sex === 'm';
  const bmr = 10 * w + 6.25 * h - 5 * a + (m ? 5 : -161);
  const tdee = bmr * p.act;
  const pl = PLANS.find(x => x.id === planId) || PLANS[3];
  let kcal = tdee * (1 + pl.delta), floored = false;
  const floor = Math.max(m ? 1500 : 1200, bmr);
  if (pl.delta < 0 && kcal < floor) { kcal = floor; floored = true; }
  kcal = Math.round(kcal / 10) * 10;
  const bmi = w / (h / 100) ** 2, refW = bmi > 27 ? 27 * (h / 100) ** 2 : w;
  let pk = pl.pk; if (pl.id === 'maintain' && p.act >= 1.55) pk = 1.6;
  const prot = Math.round(pk * refW);
  let fat = Math.round(Math.max(kcal * pl.fat / 9, 0.6 * w));
  let carb = Math.round((kcal - prot * 4 - fat * 9) / 4);
  if (carb < 100) { fat = Math.round(Math.max(0.5 * w, (kcal - prot * 4 - 100 * 4) / 9)); carb = Math.round((kcal - prot * 4 - fat * 9) / 4); }
  return Object.assign({
    w, bmr, tdee, kcal, p: prot, f: fat, c: carb, pk, refW, bmi, plan: pl, floored,
    fib: Math.max(25, Math.round(14 * kcal / 1000)), sf: Math.round(kcal * 0.10 / 9), s: Math.round(90 * kcal / 2000), na: 2000,
    water: Math.round(Math.max(m ? 2000 : 1600, w * 28) / 50) * 50,
    weekly: (kcal - tdee) * 7 / 7700,
  }, microTargets(m, a));
}

// ---------- totales ----------
const MEALT = [['desayuno','Desayuno','☀️'],['comida','Comida','🍽️'],['merienda','Merienda','🍎'],['cena','Cena','🌙'],['snack','Picoteo','🥜']];
function mealN(m) { const t = {}; const fr = (m.se || 1) / (m.st || 1); for (const it of m.items) addN(t, it.n, fr); return t; }
function dayN(k) { const t = {kcal: 0, p: 0, c: 0, f: 0}; const d = S.days[k]; if (d) for (const m of d.meals) addN(t, mealN(m)); return t; }
function microCoverage(k) {
  const d = S.days[k]; if (!d) return 1; let tot = 0, ok = 0;
  for (const m of d.meals) for (const it of m.items) { const kc = it.n.kcal || 0; tot += kc; if (it.micro) ok += kc; }
  return tot ? ok / tot : 1;
}
const hasData = k => S.days[k] && S.days[k].meals.length;

// ---------- UI genérica ----------
function toast(msg) { document.querySelectorAll('.toast').forEach(x => x.remove()); const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); }
const SH = [];
function openSheet(id, render) {
  const old = document.getElementById('sh-' + id); if (old) old.remove();
  const i = SH.findIndex(x => x.id === id); if (i >= 0) SH.splice(i, 1);
  SH.push({id, render});
  const el = document.createElement('div'); el.className = 'sheet'; el.id = 'sh-' + id; el.innerHTML = render();
  $('#sheets').appendChild(el);
}
function refresh(id) {
  const s = SH.find(x => x.id === id), el = document.getElementById('sh-' + id); if (!s || !el) return;
  const sb = el.querySelector('.sb'), top = sb ? sb.scrollTop : 0;
  el.innerHTML = s.render(); const nb = el.querySelector('.sb'); if (nb) nb.scrollTop = top;
}
function closeSheet(id) {
  if (!id && SH.length) id = SH[SH.length - 1].id;
  const i = SH.findIndex(x => x.id === id); if (i < 0) return;
  SH.splice(i, 1); const el = document.getElementById('sh-' + id);
  if (el) { el.classList.add('closing'); setTimeout(() => el.remove(), 190); }
}
const frame = (id, title, body, footer = '') =>
  `<div class="sh"><button class="iconbtn" onclick="A.close('${id}')" aria-label="Cerrar">✕</button><h2>${title}</h2><span style="width:38px"></span></div>
   <div class="sb"><div>${body}</div></div>${footer ? `<div class="sf"><div>${footer}</div></div>` : ''}`;

function bar(label, val, tgt, unit, col, limit = false) {
  const pct = tgt ? val / tgt : 0, over = limit ? pct > 1 : (col && pct > 1.15);
  return `<div class="bar"><div class="lab"><b>${label}</b><span class="num muted">${fmt(val, val < 10 && unit !== 'kcal' ? 1 : 0)} / ${fmt(tgt, tgt < 10 ? 1 : 0)} ${unit}</span></div>
    <div class="track ${over ? 'over' : ''}"><i style="width:${Math.min(100, pct * 100)}%;background:${col || (pct >= .9 ? 'var(--good)' : pct >= .6 ? 'var(--warn)' : 'var(--accent)')}"></i></div></div>`;
}
function ring(val, tgt, size = 132) {
  const r = size / 2 - 9, c = 2 * Math.PI * r, pct = tgt ? Math.min(1, val / tgt) : 0, over = val > tgt * 1.05;
  return `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--card2)" stroke-width="12"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${over ? 'var(--bad)' : 'var(--accent)'}" stroke-width="12" stroke-linecap="round"
    stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct)}" style="transition:stroke-dashoffset .5s"/></svg>`;
}
const mac = n => `<div class="macros num"><span><i class="dot" style="background:var(--prot)"></i>P <b>${fmt(n.p)}</b></span><span><i class="dot" style="background:var(--carb)"></i>H <b>${fmt(n.c)}</b></span><span><i class="dot" style="background:var(--fat)"></i>G <b>${fmt(n.f)}</b></span></div>`;

// ---------- iconos ----------
const IC = {
  today:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/></svg>',
  cal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  weight:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 19l5-6 4 3 7-9"/><path d="M15 7h5v5"/></svg>',
  plan:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3c3 3 6 5 6 10a6 6 0 0 1-12 0c0-2 1-4 2-5 0 2 1 3 2 3 0-4 2-6 2-8z"/></svg>',
};

// ---------- render principal ----------
function render() {
  if (!S.profile) { $('#tabs').style.display = 'none'; $('#view').innerHTML = onboarding(); return; }
  $('#tabs').style.display = '';
  const v = {today: viewToday, cal: viewCal, weight: viewWeight, plan: viewPlan}[U.tab] || viewToday;
  $('#view').innerHTML = v();
  $('#tabs').innerHTML = [['today','Hoy'],['cal','Calendario'],['plus',''],['weight','Peso'],['plan','Plan']].map(([id, l]) =>
    id === 'plus' ? `<button class="plus" onclick="A.add()" aria-label="Añadir comida">${IC.plus}</button>`
      : `<button class="${U.tab === id ? 'on' : ''}" onclick="A.tab('${id}')">${IC[id]}<span>${l}</span></button>`).join('');
}

// ---------- HOY ----------
function viewToday() {
  const k = U.day, T = targets(), n = dayN(k), d = S.days[k] || {meals: [], water: 0};
  const left = T.kcal - n.kcal;
  let h = `<div class="top"><div class="daynav"><button class="iconbtn" onclick="A.shift(-1)">‹</button>
      <div style="min-width:96px;text-align:center"><h1 style="font-size:24px">${dayLabel(k)}</h1><div class="t">${longDate(k)}</div></div>
      <button class="iconbtn" onclick="A.shift(1)">›</button></div>
      <button class="iconbtn" onclick="A.more()" aria-label="Más">⋯</button></div>`;
  h += `<div class="card"><div class="hero"><div class="ring">${ring(n.kcal, T.kcal)}<div class="c"><div class="big num">${fmt(n.kcal)}</div>
      <div class="tiny muted">de ${fmt(T.kcal)} kcal</div><div class="tiny" style="margin-top:3px;color:${left >= 0 ? 'var(--good)' : 'var(--bad)'}">${left >= 0 ? 'Quedan ' + fmt(left) : 'Te pasas ' + fmt(-left)}</div></div></div>
      <div class="bars">${bar('Proteína', n.p, T.p, 'g', 'var(--prot)')}${bar('Hidratos', n.c, T.c, 'g', 'var(--carb)')}${bar('Grasa', n.f, T.f, 'g', 'var(--fat)')}${bar('Fibra', n.fib || 0, T.fib, 'g', 'var(--fib)')}</div></div>
      <div class="small muted" style="margin-top:8px">${T.plan.ic} Plan: <b style="color:var(--text)">${T.plan.name}</b>${n.kcal ? ` · Te faltan <b style="color:var(--text)">${fmt(Math.max(0, T.p - n.p))} g</b> de proteína` : ''}</div></div>`;
  // micronutrientes
  h += `<div class="card"><div class="row between" onclick="A.toggleMicro()" style="cursor:pointer"><h2 style="font-size:16px">Vitaminas y minerales</h2><span class="muted small">${U.microOpen ? 'Ocultar' : 'Ver'} ▾</span></div>`;
  if (U.microOpen) {
    h += `<div class="micro" style="margin-top:6px">${MICROS.filter(x => x !== 'fib').map(x => bar(NM[x].l, n[x] || 0, T[x], NM[x].u)).join('')}</div>
      <h3 style="margin:14px 0 2px">Límites (no pasarse)</h3><div class="micro">${bar('Sodio', n.na || 0, T.na, 'mg', null, true)}${bar('Grasa sat.', n.sf || 0, T.sf, 'g', null, true)}${bar('Azúcares', n.s || 0, T.s, 'g', null, true)}</div>`;
    const cov = microCoverage(k); if (cov < 0.8) h += `<p class="tiny muted">⚠️ El ${fmt((1 - cov) * 100)} % de las calorías de hoy vienen de alimentos sin datos de vitaminas/minerales, así que estas barras se quedan cortas.</p>`;
  }
  h += `</div>`;
  // agua
  const wpct = Math.min(1, (d.water || 0) / T.water);
  h += `<div class="card tight"><div class="row"><div class="grow"><div class="row between small"><b>💧 Agua</b><span class="muted num">${fmt(d.water || 0)} / ${fmt(T.water)} ml</span></div>
      <div class="track" style="margin-top:6px"><i style="width:${wpct * 100}%;background:var(--prot)"></i></div></div>
      <button class="btn small" onclick="A.water(-250)">−</button><button class="btn small" onclick="A.water(250)">+250</button></div></div>`;
  // comidas
  for (const [t, label, ic] of MEALT) {
    const ms = d.meals.filter(m => m.type === t);
    const kc = ms.reduce((a, m) => a + mealN(m).kcal, 0);
    if (!ms.length && t === 'snack') continue;
    h += `<div class="mtype"><span>${ic} ${label}${ms.length ? ` · ${fmt(kc)} kcal` : ''}</span><button class="btn ghost small" style="height:22px;padding:0" onclick="A.add('${t}')">＋ Añadir</button></div>`;
    for (const m of ms) {
      const mn = mealN(m), open = U.open[m.id];
      h += `<div class="meal"><div class="hd" onclick="A.openMeal('${m.id}')" style="cursor:pointer"><div class="grow"><div class="ttl">${esc(m.name)}</div>${mac(mn)}</div><div class="k num">${fmt(mn.kcal)} kcal</div></div>`;
      if (open) {
        h += `<div class="items">${m.items.map(it => `<div class="it"><span>${esc(it.name)} · ${fmt(it.qty, 2)} ${esc(unitText(it))}</span><span class="num">${fmt((it.n.kcal || 0) * (m.se || 1) / (m.st || 1))} kcal</span></div>`).join('')}
          ${(m.st || 1) !== 1 || (m.se || 1) !== 1 ? `<div class="tiny muted" style="margin-top:4px">Plato de ${fmt(m.st, 2)} raciones · has comido ${fmt(m.se, 2)}</div>` : ''}
          <div class="row wrap" style="margin-top:8px;gap:6px"><button class="btn small" onclick="A.editMeal('${m.id}')">✏️ Editar</button><button class="btn small" onclick="A.dupMeal('${m.id}')">⧉ Repetir hoy</button><button class="btn small danger" onclick="A.delMeal('${m.id}')">Borrar</button></div></div>`;
      }
      h += `</div>`;
    }
  }
  h += `<div style="margin-top:18px"><button class="btn block ${d.meals.length ? 'primary' : ''}" onclick="A.report('${k}')">📋 ${d.closed ? 'Ver informe del día' : 'Terminar el día: ¿qué me falta?'}</button></div>`;
  if (!d.meals.length) h += `<p class="empty small">Pulsa <b>＋</b> y escribe lo que has cocinado, por ejemplo:<br><i>200 g arroz, 150 g pollo, 1 cebolla, 1 cucharada de aceite</i></p>`;
  return h;
}
function unitText(it) {
  if (it.unit === 'u') { const f = FOODS[it.fid]; return f && f.unitName ? f.unitName : 'ud.'; }
  return UNIT_LABEL[it.unit] || it.unit;
}

// ---------- AÑADIR COMIDA ----------
let D = null; // borrador
function autoType() { const h = new Date().getHours() + new Date().getMinutes() / 60; return h < 11 ? 'desayuno' : h < 16.5 ? 'comida' : h < 19.5 ? 'merienda' : 'cena'; }
function newDraft(type) { return {editId: null, day: U.day, type: type || autoType(), name: '', text: '', items: [], st: 1, se: 1, last: (type || autoType()) === 'cena', saveDish: false, mode: 'text', sq: ''}; }
function draftTotals() { const t = {kcal: 0, p: 0, c: 0, f: 0}; const fr = (+D.se || 1) / (+D.st || 1); for (const it of D.items) addN(t, it.n, fr); return t; }
function sheetAdd() {
  const T = draftTotals(), bad = D.items.some(i => !i.fid);
  let b = `<div class="chips" style="margin-top:6px">${MEALT.map(([t, l, ic]) => `<button class="chip ${D.type === t ? 'on' : ''}" onclick="A.dset('type','${t}')">${ic} ${l}</button>`).join('')}</div>
    <input class="f" placeholder="Nombre del plato (opcional)" value="${esc(D.name)}" oninput="A.dval('name',this.value)">
    <div class="seg">${[['text','✍️ Escribir'],['search','🔎 Buscar'],['dish','⭐ Mis platos']].map(([m, l]) => `<button class="${D.mode === m ? 'on' : ''}" onclick="A.dset('mode','${m}')">${l}</button>`).join('')}</div>`;
  if (D.mode === 'text') {
    b += `<textarea class="f" id="dtext" placeholder="Escribe un ingrediente por línea o separados por comas:&#10;200 g arroz&#10;150 g pechuga de pollo&#10;1 cebolla&#10;2 cucharadas de aceite&#10;250 ml leche" oninput="A.dval('text',this.value)">${esc(D.text)}</textarea>
      <button class="btn primary block" style="margin-top:8px" onclick="A.parse()">Calcular calorías y nutrientes</button>
      <p class="tiny muted">Entiendo g, kg, ml, L, unidades, latas, cucharadas, cucharaditas, vasos, pizcas… Las cantidades son del alimento <b>en crudo</b> salvo que pongas "cocido".</p>`;
  } else if (D.mode === 'search') {
    b += `<input class="f" id="dsq" placeholder="Busca: avena, yogur griego, atún…" value="${esc(D.sq)}" oninput="A.dsearch(this.value)" autocomplete="off">
      <div id="dsres">${searchResults(D.sq, 'A.dpick')}</div>`;
  } else {
    b += S.dishes.length ? S.dishes.map(x => `<div class="res" onclick="A.useDish('${x.id}')"><div class="grow"><div class="nm">${esc(x.name)}</div><div class="tiny muted">${x.items.length} ingredientes · ${fmt(x.st, 2)} raciones · ${fmt(dishKcal(x) / (x.st || 1))} kcal/ración</div></div><span class="muted">＋</span></div>`).join('')
      : `<p class="empty small">Aún no tienes platos guardados. Al guardar una comida marca <b>"Guardar en Mis platos"</b> y la próxima vez la añades con un toque.</p>`;
  }
  if (D.items.length) {
    b += `<h3>Ingredientes (${D.items.length})</h3>` + D.items.map((it, i) => itemRow(it, i)).join('');
    if (bad) b += `<div class="note">Hay ingredientes que no reconozco (en rojo). Toca su nombre para elegir otro alimento, buscarlo en Open Food Facts o crearlo con sus calorías: se guardará para la próxima vez.</div>`;
    b += `<div class="card tight"><div class="row small"><span class="grow">El plato rinde</span><input class="f" style="width:70px;padding:7px" type="text" inputmode="decimal" value="${D.st}" onchange="A.dnum('st',this.value)"><span>raciones</span></div>
      <div class="row small" style="margin-top:8px"><span class="grow">Me he comido</span><input class="f" style="width:70px;padding:7px" type="text" inputmode="decimal" value="${D.se}" onchange="A.dnum('se',this.value)"><span>raciones</span></div></div>
      <div id="dtot">${totHTML()}</div>
      <label class="row small" style="margin:10px 2px"><input type="checkbox" ${D.saveDish ? 'checked' : ''} onchange="A.dval('saveDish',this.checked)"> Guardar en <b>Mis platos</b> para repetirlo</label>
      <label class="row small" style="margin:10px 2px"><input type="checkbox" ${D.last ? 'checked' : ''} onchange="A.dval('last',this.checked)"> Es mi última comida del día → dime qué me falta</label>`;
  }
  const foot = `<button class="btn primary block" ${!D.items.length || bad ? 'disabled style="opacity:.45"' : ''} onclick="A.saveMeal()">${D.editId ? 'Guardar cambios' : 'Añadir a ' + dayLabel(D.day).toLowerCase()}</button>`;
  return frame('add', D.editId ? 'Editar comida' : 'Nueva comida', b, foot);
}
function totHTML() {
  const T = draftTotals(), part = (+D.se || 1) / (+D.st || 1);
  return `<div class="tot num"><div><b>${fmt(T.kcal)}</b><span>kcal</span></div><div><b style="color:var(--prot)">${fmt(T.p)}</b><span>prot. g</span></div><div><b style="color:var(--carb)">${fmt(T.c)}</b><span>hidr. g</span></div><div><b style="color:var(--fat)">${fmt(T.f)}</b><span>grasa g</span></div></div>
      <p class="tiny muted" style="text-align:center">${part !== 1 ? `<b style="color:var(--text)">Lo que te has comido (${fmt(part * 100)} % del plato)</b><br>` : ''}Fibra ${fmt(T.fib || 0, 1)} g · Azúcares ${fmt(T.s || 0, 1)} g · Sodio ${fmt(T.na || 0)} mg · Calcio ${fmt(T.ca || 0)} mg · Hierro ${fmt(T.fe || 0, 1)} mg · Vit. C ${fmt(T.vc || 0)} mg</p>`;
}
function updRow(i) {
  const it = D.items[i], f = FOODS[it.fid], row = document.getElementById('ir' + i);
  if (row && f) { row.querySelector('.kc').textContent = fmt(it.n.kcal || 0); row.querySelector('small').textContent = (it.raw || '') + (it.unit !== 'g' && it.unit !== 'ml' ? ` · ${fmt(it.amt)} ${baseU(f)}` : ''); row.classList.remove('warn'); }
  const t = document.getElementById('dtot'); if (t) t.innerHTML = totHTML();
}
function itemRow(it, i) {
  const f = FOODS[it.fid];
  const units = f ? ['g', 'ml', 'u', 'cda', 'cdta', 'kg', 'l'] : ['g'];
  if (!units.includes(it.unit)) units.push(it.unit);
  const ul = u => u === 'u' ? (f && f.unitName ? f.unitName : 'unidad') : UNIT_LABEL[u];
  return `<div class="irow ${!f ? 'bad' : it.warn ? 'warn' : ''}" id="ir${i}"><div class="nm" onclick="A.pickFor(${i})">${f ? esc(f.name) : '❓ ' + esc(it.q || it.raw)}<small>${!f ? 'Toca para elegir o crear' : esc(it.warn || (it.raw || '') + (it.unit !== 'g' && it.unit !== 'ml' ? ` · ${fmt(it.amt)} ${baseU(f)}` : ''))}</small></div>
    <input type="text" inputmode="decimal" value="${+it.qty}" onchange="A.iqty(${i},this.value)">
    <select onchange="A.iunit(${i},this.value)">${units.map(u => `<option value="${u}" ${u === it.unit ? 'selected' : ''}>${ul(u)}</option>`).join('')}</select>
    <div class="kc num">${f ? fmt(it.n.kcal || 0) : '—'}</div><button class="x" onclick="A.idel(${i})">×</button></div>`;
}
function searchResults(q, cb) {
  q = (q || '').trim();
  const list = q ? matchFoods(q, 14).map(x => x[1]) : S.custom.map(c => FOODS[c.id]).filter(Boolean).slice(-10).reverse();
  let h = list.map(f => `<div class="res" onclick="${cb}('${f.id}')"><div class="grow"><div class="nm">${esc(f.name)} ${f.custom ? '<span class="pill">mío</span>' : ''}</div>
     <div class="tiny muted num">${fmt(f.n.kcal)} kcal · P ${fmt(f.n.p, 1)} · H ${fmt(f.n.c, 1)} · G ${fmt(f.n.f, 1)} por 100 ${baseU(f)}</div></div><span class="muted">＋</span></div>`).join('');
  if (q && !list.length) h += `<p class="empty small">No está en la base de datos.</p>`;
  h += `<div class="grid2" style="margin-top:12px"><button class="btn small" onclick="A.offOpen(${cb === 'A.dpick' ? "'d'" : "'p'"})">🌐 Open Food Facts</button><button class="btn small" onclick="A.newFood(${cb === 'A.dpick' ? "'d'" : "'p'"})">➕ Crear alimento</button></div>
    <p class="tiny muted">Open Food Facts es una base de datos abierta con millones de productos de supermercado (con su etiqueta nutricional).</p>`;
  return h;
}
function dishKcal(x) { return x.items.reduce((a, it) => a + (it.n.kcal || 0), 0); }

// ---------- Selector de alimento / crear / Open Food Facts ----------
let PICK = null; // {cb, q}
function sheetPick() {
  return frame('pick', 'Elegir alimento', `<input class="f" id="pq" placeholder="Buscar alimento" value="${esc(PICK.q)}" oninput="A.pq(this.value)" autocomplete="off" style="margin-top:8px"><div id="pres">${searchResults(PICK.q, 'A.picked')}</div>`);
}
function pickTarget(where) { return where === 'd' ? (fid => { D.items.push(calcItem({raw: '', q: '', qty: FOODS[fid].unitG ? 1 : 100, unit: FOODS[fid].unitG ? 'u' : baseU(FOODS[fid]), fid})); refresh('add'); toast('Añadido: ' + FOODS[fid].name); }) : PICK.cb; }

let NF = null; // nuevo alimento
function blankFood(name) { return {id: null, name: name || '', base: 'g', per: 100, unitG: '', unitName: 'unidad', salt: '', n: {}, src: '', where: 'p'}; }
function sheetNewFood() {
  const fld = (k, l, u) => `<div><label class="l">${l} (${u})</label><input class="f" type="text" inputmode="decimal" value="${NF.n[k] ?? ''}" oninput="A.nfn('${k}',this.value)"></div>`;
  const b = `<label class="l">Nombre</label><input class="f" value="${esc(NF.name)}" oninput="A.nf('name',this.value)" placeholder="Ej: Hamburguesa vegetal Mercadona">
    <label class="l">Los valores son por</label><div class="row"><input class="f" style="width:90px" type="text" inputmode="decimal" value="${NF.per}" oninput="A.nf('per',this.value)">
      <div class="seg grow" style="margin:0">${['g', 'ml'].map(x => `<button class="${NF.base === x ? 'on' : ''}" onclick="A.nfBase('${x}')">${x === 'g' ? 'gramos' : 'mililitros'}</button>`).join('')}</div></div>
    <p class="tiny muted">Copia la tabla nutricional de la etiqueta (normalmente "por 100 g").</p>
    <div class="grid2">${fld('kcal', 'Energía', 'kcal')}${fld('p', 'Proteína', 'g')}${fld('c', 'Hidratos', 'g')}${fld('s', '…de los cuales azúcares', 'g')}${fld('f', 'Grasa', 'g')}${fld('sf', '…de las cuales saturadas', 'g')}${fld('fib', 'Fibra', 'g')}
      <div><label class="l">Sal (g)</label><input class="f" type="text" inputmode="decimal" value="${NF.salt}" oninput="A.nf('salt',this.value)"></div></div>
    <label class="l">Si se cuenta por unidades: 1 unidad pesa (${NF.base}) — opcional</label>
    <div class="grid2"><input class="f" type="text" inputmode="decimal" placeholder="Ej: 60" value="${NF.unitG}" oninput="A.nf('unitG',this.value)"><input class="f" placeholder="Nombre: unidad, galleta…" value="${esc(NF.unitName)}" oninput="A.nf('unitName',this.value)"></div>
    <details style="margin-top:14px"><summary class="small" style="color:var(--accent)">Vitaminas y minerales (opcional)</summary><div class="grid2">${['ca', 'fe', 'mg', 'k', 'zn', 'vc', 'va', 'vd', 'b12', 'fol'].map(k => fld(k, NM[k].l, NM[k].u)).join('')}</div>
      <p class="tiny muted">Si lo dejas vacío, este alimento no sumará vitaminas ni minerales.</p></details>
    ${NF.src ? `<p class="tiny muted">Datos importados de ${esc(NF.src)}. Revísalos antes de guardar.</p>` : ''}`;
  return frame('food', NF.id ? 'Editar alimento' : 'Nuevo alimento', b, `<button class="btn primary block" onclick="A.saveFood()">Guardar alimento</button>`);
}
let OFF = {q: '', res: null, loading: false, err: ''};
function sheetOff() {
  let b = `<div class="row" style="margin-top:8px"><input class="f grow" id="offq" placeholder="Producto o marca" value="${esc(OFF.q)}" onkeydown="if(event.key==='Enter')A.offSearch()"><button class="btn primary" onclick="A.offSearch()">Buscar</button></div>
    <div class="row" style="margin-top:8px"><input class="f grow" id="offcode" inputmode="numeric" placeholder="o el código de barras"><button class="btn" onclick="A.offCode()">Ver</button>${'BarcodeDetector' in window ? `<button class="btn" onclick="A.scan()">📷</button>` : ''}</div>
    <video id="scanv" playsinline muted style="display:none;width:100%;border-radius:14px;margin-top:10px"></video>`;
  if (OFF.loading) b += `<p class="empty">Buscando…</p>`;
  else if (OFF.err) b += `<p class="empty small">${esc(OFF.err)}</p>`;
  else if (OFF.res) b += OFF.res.length ? OFF.res.map((p, i) => `<div class="res" onclick="A.offPick(${i})"><div class="grow"><div class="nm">${esc(p.name)}</div><div class="tiny muted num">${esc(p.brand)}${p.brand ? ' · ' : ''}${p.n.kcal != null ? fmt(p.n.kcal) + ' kcal' : 'sin kcal'} · P ${fmt(p.n.p || 0, 1)} · H ${fmt(p.n.c || 0, 1)} · G ${fmt(p.n.f || 0, 1)} /100 ${p.base}</div></div><span class="muted">＋</span></div>`).join('') : `<p class="empty small">Sin resultados. Prueba otro nombre o crea el alimento a mano.</p>`;
  return frame('off', 'Open Food Facts', b);
}
const OFF_FIELDS = 'code,product_name,product_name_es,brands,nutriments,quantity,serving_quantity';
function offMap(p) {
  const nu = p.nutriments || {}, g = k => { const v = nu[k + '_100g']; return v == null || v === '' || isNaN(+v) ? undefined : +v; };
  let kcal = g('energy-kcal'); if (kcal == null && g('energy') != null) kcal = g('energy') / 4.184;
  const mul = (k, m) => g(k) == null ? undefined : g(k) * m;
  const n = {kcal, p: g('proteins'), c: g('carbohydrates'), s: g('sugars'), f: g('fat'), sf: g('saturated-fat'), fib: g('fiber'),
    na: g('sodium') != null ? g('sodium') * 1000 : g('salt') != null ? g('salt') * 400 : undefined,
    ca: mul('calcium', 1000), fe: mul('iron', 1000), mg: mul('magnesium', 1000), k: mul('potassium', 1000), zn: mul('zinc', 1000), vc: mul('vitamin-c', 1000),
    va: mul('vitamin-a', 1e6), vd: mul('vitamin-d', 1e6), b12: mul('vitamin-b12', 1e6), fol: mul('vitamin-b9', 1e6) ?? mul('folates', 1e6)};
  for (const k in n) if (n[k] == null) delete n[k]; else n[k] = Math.round(n[k] * 100) / 100;
  const base = /\d\s*(ml|cl|l)\b/i.test(p.quantity || '') ? 'ml' : 'g';
  return {name: (p.product_name_es || p.product_name || 'Producto sin nombre').trim(), brand: (p.brands || '').split(',')[0].trim(), n, base, unitG: +p.serving_quantity || '', code: p.code};
}

// ---------- informe del día ----------
function portionOf(f) {
  const id = f.id;
  if (['lentejas_coc', 'garbanzos_coc', 'alubias_coc', 'alubias_rojas', 'tofu'].includes(id)) return 200;
  if (['pan', 'pan_int', 'pan_molde'].includes(id)) return 60;
  if (['queso_curado', 'queso_lonchas', 'queso_rallado', 'mozzarella', 'queso_untar', 'queso_fresco'].includes(id)) return 40;
  if (['chia', 'pipas'].includes(id)) return 15;
  if (['almendras', 'nueces', 'frutos_secos', 'cacahuetes'].includes(id)) return 30;
  if (id === 'chocolate_negro') return 20;
  if (id === 'espinacas') return 100;
  if (f.unitName === 'lata' && f.cat === 'pescado') return f.unitG;
  if (f.cat === 'fruta' && f.unitG) return f.unitG;
  if (f.cat === 'huevos') return 110;
  return {cereal: 80, legumbre: 80, carne: 150, pescado: 150, lacteos: f.base === 'ml' ? 250 : 125, verdura: 150, fruta: 150, congelado: 150, despensa: 30}[f.cat] || 100;
}
const NO_SUGGEST = new Set(['especias', 'sal', 'soja_salsa', 'caldo', 'higado', 'harina', 'pan_rallado', 'cacao_soluble', 'mantequilla', 'aceite_oliva', 'aceite_girasol', 'nata', 'aceitunas', 'proteina_whey', 'soja_text', 'limon']);
function richFoods(key, n = 4) {
  return FOOD_ROWS.map(r => FOODS[r[0]]).filter(f => f && !NO_SUGGEST.has(f.id) && !['otros', 'bebida'].includes(f.cat))
    .map(f => { const por = portionOf(f); return {f, por, v: f.n[key] * por / 100}; }).sort((a, b) => b.v - a.v).slice(0, n);
}
function lowNutrients(k, T) {
  const n = dayN(k); return ['p', ...MICROS].filter(x => (n[x] || 0) < T[x] * 0.7);
}
function sheetReport(k) {
  const T = targets(), n = dayN(k), d = S.days[k];
  if (!d || !d.meals.length) return frame('rep', 'Informe del día', `<p class="empty">No hay comidas registradas este día.</p>`);
  const pct = x => (n[x] || 0) / T[x];
  const keys = ['p', ...MICROS];
  const low = keys.filter(x => pct(x) < 0.6), mid = keys.filter(x => pct(x) >= 0.6 && pct(x) < 0.9), ok = keys.filter(x => pct(x) >= 0.9);
  const score = Math.round(keys.reduce((a, x) => a + Math.min(1, pct(x)), 0) / keys.length * 100);
  const kr = n.kcal / T.kcal;
  let b = `<p class="muted small" style="text-align:center;margin-top:10px">${longDate(k)}</p>
    <div class="card" style="text-align:center"><div class="ring" style="margin:0 auto">${ring(score, 100)}<div class="c"><div class="big num">${score}</div><div class="tiny muted">cobertura de<br>nutrientes</div></div></div>
    <p class="small">${score >= 85 ? '¡Muy buen día! Tu cuerpo tiene casi todo lo que necesita.' : score >= 65 ? 'Buen día, pero hay algunos huecos que puedes cubrir.' : 'Hoy han faltado bastantes nutrientes. Mira abajo cómo cubrirlos.'}</p></div>`;
  // energía y macros
  let ek = '';
  const plan = T.plan;
  if (kr < 0.85) ek = `Te has quedado en <b>${fmt(n.kcal)} kcal</b> (${fmt(T.kcal - n.kcal)} menos de tu objetivo). ${plan.delta < 0 ? 'Un día así no pasa nada, pero si se repite perderás músculo, tendrás más hambre y te costará más mantenerlo.' : 'Para tu objetivo necesitas llegar a las calorías: añade un snack denso (frutos secos, pan con crema de cacahuete, avena con leche).'}`;
  else if (kr > 1.1) ek = `Has tomado <b>${fmt(n.kcal)} kcal</b>, ${fmt(n.kcal - T.kcal)} por encima de tu objetivo. ${plan.delta < 0 ? 'Lo que cuenta es la media semanal: compénsalo suavemente los próximos días (sin saltarte comidas).' : 'Dentro de un volumen, pasarse un poco algún día no es grave.'}`;
  else ek = `Energía en su sitio: <b>${fmt(n.kcal)}</b> de ${fmt(T.kcal)} kcal. 👌`;
  b += `<h3>Energía y macros</h3><div class="card"><div class="rep"><div class="ic">${kr < 0.85 || kr > 1.1 ? '⚠️' : '✅'}</div><div>${ek}</div></div>
    <div class="rep"><div class="ic">${pct('p') >= 0.9 ? '✅' : '⚠️'}</div><div><b>Proteína ${fmt(n.p)} / ${fmt(T.p)} g.</b> ${pct('p') >= 0.9 ? 'Objetivo cumplido.' : `Te faltan ${fmt(T.p - n.p)} g. Intenta meter 25-40 g de proteína en cada comida: 3 huevos ≈ 19 g, 1 lata de atún ≈ 14 g, 150 g de pollo ≈ 34 g, un skyr ≈ 16 g, 200 g de garbanzos ≈ 18 g.`}</div></div>
    <div class="rep"><div class="ic">ℹ️</div><div class="small">Hidratos ${fmt(n.c)} / ${fmt(T.c)} g · Grasa ${fmt(n.f)} / ${fmt(T.f)} g · Fibra ${fmt(n.fib || 0)} / ${fmt(T.fib)} g</div></div></div>`;
  const block = (x, ic) => {
    const nm = NM[x], foods = richFoods(x).map(r => `${r.f.name.replace(/ \(.*\)/, '')} (${fmt(r.por)} ${baseU(r.f)}: ${fmt(r.v, r.v < 10 ? 1 : 0)} ${nm.u})`).join(' · ');
    return `<div class="rep"><div class="ic">${ic}</div><div><b>${nm.l}: ${fmt(n[x] || 0, (n[x] || 0) < 10 ? 1 : 0)} / ${fmt(T[x])} ${nm.u}</b> <span class="muted small">(${fmt(pct(x) * 100)} %)</span>
      ${nm.why ? `<p class="small muted">${nm.why}</p>` : ''}${nm.tip ? `<p class="small">💡 ${nm.tip}</p>` : ''}${foods ? `<p class="tiny muted">Más ricos en ${nm.l.toLowerCase()} por ración: ${esc(foods)}</p>` : ''}</div></div>`;
  };
  const lowM = low.filter(x => x !== 'p'), midM = mid.filter(x => x !== 'p');
  if (lowM.length) b += `<h3>Te ha faltado</h3><div class="card">${lowM.map(x => block(x, '❌')).join('')}</div>`;
  if (midM.length) b += `<h3>Te has quedado cerca</h3><div class="card">${midM.map(x => block(x, '🟡')).join('')}</div>`;
  const okM = ok.filter(x => x !== 'p');
  if (okM.length) b += `<h3>Bien cubierto</h3><div class="card small">✅ ${okM.map(x => NM[x].l).join(', ')}</div>`;
  const ex = [];
  if ((n.na || 0) > T.na) ex.push(`<b>Sodio ${fmt(n.na)} mg</b> (límite ${fmt(T.na)} mg ≈ 5 g de sal). Suele venir de embutidos, pan, quesos, salsas y precocinados. Cocina con especias, limón o ajo en lugar de sal.`);
  if ((n.sf || 0) > T.sf) ex.push(`<b>Grasa saturada ${fmt(n.sf)} g</b> (máx. ${fmt(T.sf)} g, 10 % de la energía). Cambia embutido, mantequilla y bollería por aceite de oliva, pescado, legumbres o frutos secos.`);
  if ((n.s || 0) > T.s) ex.push(`<b>Azúcares ${fmt(n.s)} g</b> (referencia ${fmt(T.s)} g, incluye los de fruta y lácteos). Vigila refrescos, zumos, bollería y yogures azucarados.`);
  if (ex.length) b += `<h3>Cuidado con</h3><div class="card">${ex.map(x => `<div class="rep"><div class="ic">🧂</div><div class="small">${x}</div></div>`).join('')}</div>`;
  const cov = microCoverage(k);
  if (cov < 0.8) b += `<div class="note">⚠️ El ${fmt((1 - cov) * 100)} % de las calorías de hoy vienen de alimentos sin datos de vitaminas y minerales (productos creados o de Open Food Facts), así que algunos "te falta" pueden ser falsos.</div>`;
  // patrón semanal
  const freq = {}; let nd = 0;
  for (let i = 0; i < 7; i++) { const kk = addDays(k, -i); if (!hasData(kk)) continue; nd++; for (const x of lowNutrients(kk, T)) freq[x] = (freq[x] || 0) + 1; }
  const rec = Object.entries(freq).filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]).slice(0, 4);
  if (nd >= 3) b += `<h3>Lo que más te falta últimamente</h3><div class="card small">${rec.length ? rec.map(([x, c]) => `<div class="rep"><div class="ic">📌</div><div><b>${NM[x].l}</b>: bajo en ${c} de tus últimos ${nd} días registrados. ${x === 'p' ? 'Añade una fuente de proteína a cada comida.' : NM[x].tip}</div></div>`).join('') : `¡Nada se repite! En tus últimos ${nd} días no hay un nutriente que falte de forma habitual.`}</div>`;
  b += `<p class="tiny muted">Objetivos: Ingestas Dietéticas de Referencia (IOM/NASEM) para tu sexo y edad. "Te ha faltado" = menos del 60 %; "cerca" = 60-90 %. Un día puntual no importa: lo que cuenta es la media de la semana.</p>`;
  if (!d.closed) { d.closed = true; save(); }
  return frame('rep', 'Informe del día', b);
}

// ---------- CALENDARIO ----------
function viewCal() {
  const T = targets();
  if (!U.cal) { const t = new Date(); U.cal = [t.getFullYear(), t.getMonth()]; }
  const [y, m] = U.cal, first = new Date(y, m, 1), days = new Date(y, m + 1, 0).getDate();
  const off = (first.getDay() + 6) % 7, tk = today();
  let h = `<div class="top"><h1>Calendario</h1></div>
    <div class="card"><div class="row between" style="margin-bottom:10px"><button class="iconbtn" style="background:var(--card2)" onclick="A.calm(-1)">‹</button><h2>${cap(MONTHS[m])} ${y}</h2><button class="iconbtn" style="background:var(--card2)" onclick="A.calm(1)">›</button></div>
    <div class="cal">${['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(x => `<div class="wd">${x}</div>`).join('')}${'<div class="cd empty"></div>'.repeat(off)}`;
  let sumK = 0, nK = 0, sumP = 0, ws = [];
  for (let dd = 1; dd <= days; dd++) {
    const k = dkey(new Date(y, m, dd)), has = hasData(k), n = has ? dayN(k) : null, w = S.weights[k];
    let cls = '';
    if (has) { const r = Math.abs(1 - n.kcal / T.kcal); cls = r <= 0.1 ? 'g' : r <= 0.25 ? 'a' : 'r'; sumK += n.kcal; sumP += n.p; nK++; }
    if (w) ws.push(w);
    h += `<button class="cd ${cls} ${k === tk ? 'today' : ''}" onclick="A.dayInfo('${k}')"><span class="n">${dd}</span>${w ? `<span class="w num">${fmt(w, 1)}</span>` : ''}${has ? `<span class="kc num">${n.kcal >= 1000 ? fmt(n.kcal / 1000, 1) + 'k' : fmt(n.kcal)}</span>` : ''}</button>`;
  }
  h += `</div><div class="legend"><span><i class="dot" style="background:var(--good)"></i>±10 % del objetivo</span><span><i class="dot" style="background:var(--warn)"></i>±10-25 %</span><span><i class="dot" style="background:var(--bad)"></i>>25 %</span><span>Número pequeño = peso (kg)</span></div></div>`;
  h += `<h3>Resumen del mes</h3><div class="grid2">
    <div class="stat"><b class="num">${nK ? fmt(sumK / nK) : '—'}</b><span>kcal de media (objetivo ${fmt(T.kcal)})</span></div>
    <div class="stat"><b class="num">${nK ? fmt(sumP / nK) : '—'} g</b><span>proteína de media (objetivo ${fmt(T.p)})</span></div>
    <div class="stat"><b class="num">${nK}</b><span>días registrados</span></div>
    <div class="stat"><b class="num">${ws.length > 1 ? (ws[ws.length - 1] - ws[0] > 0 ? '+' : '') + fmt(ws[ws.length - 1] - ws[0], 1) + ' kg' : '—'}</b><span>cambio de peso en el mes</span></div></div>`;
  return h;
}
function sheetDay(k) {
  const T = targets(), d = S.days[k], n = dayN(k), w = S.weights[k];
  let b = `<p class="muted small" style="text-align:center;margin-top:10px">${longDate(k)}</p>`;
  b += `<div class="grid2"><div class="stat"><b class="num">${fmt(n.kcal)}</b><span>kcal de ${fmt(T.kcal)}</span></div><div class="stat"><b class="num">${w ? fmt(w, 1) + ' kg' : '—'}</b><span>peso</span></div></div>`;
  if (d && d.meals.length) {
    b += `<div class="card">${bar('Proteína', n.p, T.p, 'g', 'var(--prot)')}${bar('Hidratos', n.c, T.c, 'g', 'var(--carb)')}${bar('Grasa', n.f, T.f, 'g', 'var(--fat)')}${bar('Fibra', n.fib || 0, T.fib, 'g', 'var(--fib)')}</div>`;
    for (const [t, l, ic] of MEALT) for (const m of d.meals.filter(x => x.type === t)) { const mn = mealN(m); b += `<div class="meal"><div class="hd"><div class="grow"><div class="tiny muted">${ic} ${l}</div><div class="ttl">${esc(m.name)}</div>${mac(mn)}</div><div class="k num">${fmt(mn.kcal)}</div></div></div>`; }
  } else b += `<p class="empty small">Sin comidas registradas.</p>`;
  const foot = `<div class="grid2">${d && d.meals.length ? `<button class="btn" onclick="A.report('${k}')">📋 Informe</button>` : '<span></span>'}<button class="btn primary" onclick="A.goDay('${k}')">Abrir este día</button></div>`;
  return frame('day', dayLabel(k), b, foot);
}

// ---------- PESO ----------
function weightSeries() { return Object.keys(S.weights).sort().map(k => ({k, w: S.weights[k]})); }
function movAvg(pts) { return pts.map(p => { const from = addDays(p.k, -6); const win = pts.filter(q => q.k >= from && q.k <= p.k); return {k: p.k, w: win.reduce((a, q) => a + q.w, 0) / win.length}; }); }
function trendPerWeek(pts) {
  if (pts.length < 3) return null;
  const last = pts[pts.length - 1].k, from = addDays(last, -27), P = pts.filter(p => p.k >= from);
  if (P.length < 3) return null;
  const t0 = parseKey(P[0].k).getTime(), xs = P.map(p => (parseKey(p.k).getTime() - t0) / 864e5), ys = P.map(p => p.w);
  const mx = xs.reduce((a, b) => a + b) / xs.length, my = ys.reduce((a, b) => a + b) / ys.length;
  let num = 0, den = 0; xs.forEach((x, i) => { num += (x - mx) * (ys[i] - my); den += (x - mx) ** 2; });
  return den && xs[xs.length - 1] >= 6 ? num / den * 7 : null;
}
function chart(pts) {
  if (pts.length < 2) return `<p class="empty small">Registra tu peso al menos dos días para ver el gráfico.</p>`;
  const W = 340, H = 190, L = 34, R = 10, Tp = 12, B = 24;
  const avg = movAvg(pts);
  const t0 = parseKey(pts[0].k).getTime(), t1 = parseKey(pts[pts.length - 1].k).getTime(), span = Math.max(1, t1 - t0);
  const vals = pts.map(p => p.w); let lo = Math.min(...vals), hi = Math.max(...vals); const padv = Math.max(0.4, (hi - lo) * 0.12); lo -= padv; hi += padv;
  const X = k => L + (parseKey(k).getTime() - t0) / span * (W - L - R), Y = w => Tp + (hi - w) / (hi - lo) * (H - Tp - B);
  let g = '';
  for (let i = 0; i <= 3; i++) { const v = lo + (hi - lo) * i / 3, y = Y(v); g += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="var(--line)" stroke-width="1"/><text x="${L - 5}" y="${y + 3.5}" font-size="10" fill="var(--muted)" text-anchor="end">${fmt(v, 1)}</text>`; }
  const mid = pts[Math.floor(pts.length / 2)].k;
  [[pts[0].k, 'start'], [mid, 'middle'], [pts[pts.length - 1].k, 'end']].forEach(([k, a]) => g += `<text x="${X(k)}" y="${H - 6}" font-size="10" fill="var(--muted)" text-anchor="${a}">${shortDate(k)}</text>`);
  const line = arr => arr.map((p, i) => `${i ? 'L' : 'M'}${X(p.k).toFixed(1)},${Y(p.w).toFixed(1)}`).join('');
  g += `<path d="${line(pts)}" fill="none" stroke="var(--muted)" stroke-opacity=".45" stroke-width="1.3"/>`;
  g += pts.map(p => `<circle cx="${X(p.k).toFixed(1)}" cy="${Y(p.w).toFixed(1)}" r="${pts.length > 60 ? 1.8 : 3}" fill="var(--text)" fill-opacity=".75"/>`).join('');
  g += `<path d="${line(avg)}" fill="none" stroke="var(--accent)" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>`;
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block">${g}</svg><div class="legend"><span><i class="dot" style="background:var(--text)"></i>Peso diario</span><span><i class="dot" style="background:var(--accent)"></i>Media de 7 días (la que importa)</span></div>`;
}
function viewWeight() {
  const T = targets(), all = weightSeries(), tk = today();
  const from = U.wRange ? addDays(tk, -U.wRange) : '0000';
  const pts = all.filter(p => p.k >= from), last = all[all.length - 1];
  const at = k => { const p = all.filter(x => x.k <= k); return p.length ? p[p.length - 1].w : null; };
  const w7 = last ? at(addDays(last.k, -7)) : null, w30 = last ? at(addDays(last.k, -30)) : null;
  const tr = trendPerWeek(all);
  const sign = x => (x > 0 ? '+' : '') + fmt(x, 2);
  let h = `<div class="top"><h1>Peso</h1></div>
    <div class="card"><label class="l" style="margin-top:0">Peso de ${dayLabel(U.day).toLowerCase()} (kg)</label>
    <div class="row"><input class="f" id="wIn" type="text" inputmode="decimal" step="0.1" placeholder="${last ? fmt(last.w, 1) : '70,0'}" value="${S.weights[U.day] ?? ''}" style="font-size:22px;font-weight:700">
    <button class="btn primary" onclick="A.saveW()">Guardar</button></div>
    <p class="tiny muted">Pésate por la mañana, en ayunas y después de ir al baño. El peso diario fluctúa ±1 kg por agua y comida: fíjate en la media de 7 días.</p></div>
    <div class="card"><div class="seg" style="margin-top:0">${[[30, '30 días'], [90, '90 días'], [365, '1 año'], [0, 'Todo']].map(([r, l]) => `<button class="${U.wRange === r ? 'on' : ''}" onclick="A.wr(${r})">${l}</button>`).join('')}</div>${chart(pts)}</div>
    <div class="grid2">
      <div class="stat"><b class="num">${last ? fmt(last.w, 1) + ' kg' : '—'}</b><span>actual · IMC ${fmt(T.bmi, 1)}</span></div>
      <div class="stat"><b class="num">${tr != null ? sign(tr) + ' kg' : '—'}</b><span>tendencia por semana</span></div>
      <div class="stat"><b class="num">${w7 != null && last ? sign(last.w - w7) : '—'}</b><span>últimos 7 días (kg)</span></div>
      <div class="stat"><b class="num">${w30 != null && last ? sign(last.w - w30) : '—'}</b><span>últimos 30 días (kg)</span></div></div>`;
  const exp = T.weekly;
  let msg = `Con tu plan (<b>${T.plan.name}</b>) lo esperable es <b>${sign(exp)} kg/semana</b>.`;
  if (tr != null) {
    const diff = tr - exp;
    if (Math.abs(diff) <= 0.2) msg += ' Tu tendencia va según lo previsto. 👌';
    else if (T.plan.delta < 0 && diff > 0.2) msg += ' Bajas más lento de lo previsto: revisa que registres todo (aceite, salsas, bebidas). Si sigue así 2-3 semanas, baja ~150 kcal al día o muévete más.';
    else if (T.plan.delta < 0) msg += ' Bajas más rápido de lo previsto: si notas cansancio o pierdes fuerza, sube ~150 kcal.';
    else if (T.plan.delta > 0 && diff < -0.2) msg += ' Subes más lento de lo previsto: añade ~150-200 kcal al día (un puñado de frutos secos o un vaso de leche extra).';
    else if (T.plan.delta > 0) msg += ' Subes más rápido de lo previsto: probablemente ganas más grasa de la necesaria, baja ~150 kcal.';
    else msg += diff > 0 ? ' Estás subiendo un poco: ajusta ~100-150 kcal a la baja.' : ' Estás bajando un poco: añade ~100-150 kcal.';
  }
  h += `<div class="note blue">${msg} <span class="muted">Tus objetivos se recalculan solos con tu último peso.</span></div>`;
  if (all.length) h += `<h3>Historial</h3><div class="card tight">${all.slice(-40).reverse().map((p, i, arr) => { const prev = arr[i + 1]; return `<div class="kv"><span>${longDate(p.k)}</span><span class="num">${fmt(p.w, 1)} kg ${prev ? `<span class="tiny ${p.w - prev.w > 0 ? '' : 'muted'}">(${sign(p.w - prev.w)})</span>` : ''} <button class="muted" style="margin-left:6px" onclick="A.delW('${p.k}')">×</button></span></div>`; }).join('')}</div>`;
  return h;
}

// ---------- PLAN ----------
function planCards(p) {
  return PLANS.map(pl => {
    const T = targets(p, pl.id), on = p.plan === pl.id;
    return `<div class="card plan ${on ? 'on' : ''}" onclick="A.choose('${pl.id}')"><div class="row between"><h2 style="font-size:16.5px">${pl.ic} ${pl.name}</h2>${on ? '<span class="pill" style="background:var(--accent);color:#1a0d02">Tu plan</span>' : ''}</div>
      <p class="small muted">${pl.desc}</p>
      <div class="row wrap small num" style="gap:12px"><b style="font-size:18px">${fmt(T.kcal)} kcal</b><span><i class="dot" style="background:var(--prot)"></i>P ${T.p} g</span><span><i class="dot" style="background:var(--carb)"></i>H ${T.c} g</span><span><i class="dot" style="background:var(--fat)"></i>G ${T.f} g</span></div>
      <div class="tiny muted" style="margin-top:4px">${pl.delta ? `≈ ${T.weekly > 0 ? '+' : ''}${fmt(T.weekly, 2)} kg por semana` : 'Peso estable'}${T.floored ? ' · ajustado al mínimo seguro (no bajar de tu metabolismo basal)' : ''}</div></div>`;
  }).join('');
}
function viewPlan() {
  const seg = `<div class="seg">${[['goal', 'Objetivo'], ['menu', 'Menú 7 días'], ['shop', 'Lista compra']].map(([s, l]) => `<button class="${U.planSeg === s ? 'on' : ''}" onclick="A.pseg('${s}')">${l}</button>`).join('')}</div>`;
  return `<div class="top"><h1>Plan</h1><button class="iconbtn" onclick="A.more()">⋯</button></div>${seg}` + (U.planSeg === 'menu' ? viewMenu() : U.planSeg === 'shop' ? viewShop() : viewGoal());
}
function viewGoal() {
  const p = S.profile, T = targets(), act = ACTS.find(a => a[0] === p.act) || ACTS[0];
  let h = `<div class="card"><div class="row between"><h2 style="font-size:16px">Tus datos</h2><button class="btn small" onclick="A.profile()">Editar</button></div>
    <div class="grid3" style="margin-top:10px;text-align:center"><div class="stat"><b class="num">${fmt(T.w, 1)}</b><span>kg</span></div><div class="stat"><b class="num">${p.height}</b><span>cm</span></div><div class="stat"><b class="num">${p.age}</b><span>años</span></div></div>
    <p class="small muted" style="margin-top:10px">${p.sex === 'm' ? 'Hombre' : 'Mujer'} · Actividad: ${act[1]} (${act[2].toLowerCase()}) · IMC ${fmt(T.bmi, 1)}</p>
    <div class="kv"><span>Metabolismo basal <span class="tiny muted">(Mifflin-St Jeor)</span></span><span class="num">${fmt(T.bmr)} kcal</span></div>
    <div class="kv"><span>Gasto total diario <span class="tiny muted">(basal × ${String(p.act).replace('.', ',')})</span></span><span class="num">${fmt(T.tdee)} kcal</span></div></div>
    <h3>Elige tu plan</h3>${planCards(p)}`;
  h += `<h3>Tus objetivos diarios · ${T.plan.name}</h3><div class="card">
    <div class="kv"><span>Energía</span><span class="num">${fmt(T.kcal)} kcal</span></div>
    <div class="kv"><span>Proteína</span><span class="num">${T.p} g <span class="tiny muted">(${fmt(T.p / T.w, 1)} g/kg · ${fmt(T.p * 4 / T.kcal * 100)} %)</span></span></div>
    <div class="kv"><span>Hidratos</span><span class="num">${T.c} g <span class="tiny muted">(${fmt(T.c / T.w, 1)} g/kg · ${fmt(T.c * 4 / T.kcal * 100)} %)</span></span></div>
    <div class="kv"><span>Grasa</span><span class="num">${T.f} g <span class="tiny muted">(${fmt(T.f * 9 / T.kcal * 100)} %)</span></span></div>
    <div class="kv"><span>Fibra</span><span class="num">≥ ${T.fib} g</span></div>
    <div class="kv"><span>Agua (bebida)</span><span class="num">≈ ${fmt(T.water / 1000, 1)} L <span class="tiny muted">+0,5 L por hora de ejercicio</span></span></div>
    <div class="kv"><span>Grasa saturada</span><span class="num">&lt; ${T.sf} g</span></div>
    <div class="kv"><span>Azúcares totales</span><span class="num">&lt; ${T.s} g <span class="tiny muted">(añadidos &lt; ${fmt(T.kcal * 0.1 / 4)} g)</span></span></div>
    <div class="kv"><span>Sodio</span><span class="num">&lt; 2.000 mg <span class="tiny muted">(5 g de sal)</span></span></div></div>
    <div class="card">${MICROS.filter(x => x !== 'fib').map(x => `<div class="kv"><span>${NM[x].l}</span><span class="num">${fmt(T[x])} ${NM[x].u}</span></div>`).join('')}</div>`;
  h += `<h3>Por qué estos números</h3><div class="card small">
    <p><b>Gasto energético.</b> El metabolismo basal se calcula con la ecuación de Mifflin-St Jeor, la más precisa en adultos según la revisión de Frankenfield y col. (2005). Se multiplica por un factor de actividad (FAO/OMS/UNU) para obtener lo que gastas al día. Es una estimación (±10 %): tu peso real dirá si hay que ajustar.</p>
    <p><b>Déficit o superávit.</b> Se aplica como % de tu gasto. Perder ~0,5-1 % del peso por semana conserva mejor la masa muscular que ir más rápido (Garthe y col., 2011). Para ganar músculo basta un superávit pequeño (~5-15 %): más solo añade grasa (Iraki y col., 2019). Aproximación usada: 7.700 kcal ≈ 1 kg; en la práctica el ritmo se frena con las semanas por adaptación (Hall y col., 2011).</p>
    <p><b>Proteína.</b> Con entreno de fuerza, ~1,6 g/kg/día maximiza la ganancia muscular, con margen hasta 2,2 g/kg (Morton y col., 2018). En déficit conviene más (1,8-2,7 g/kg de masa magra) para no perder músculo (Helms y col., 2014). La ISSN recomienda 1,4-2,0 g/kg a personas activas (Jäger y col., 2017). ${T.bmi > 27 ? 'Como tu IMC es mayor de 27, se calcula sobre un peso de referencia (IMC 27) para no sobreestimarla.' : ''} Repártela en 3-5 tomas de 20-40 g.</p>
    <p><b>Grasa.</b> 20-35 % de la energía (EFSA/IOM), nunca menos de ~0,5-0,6 g/kg para mantener la función hormonal. Prioriza aceite de oliva, frutos secos y pescado azul.</p>
    <p><b>Hidratos.</b> El resto de calorías. Son el combustible del entrenamiento; elige sobre todo integrales, legumbres, patata, fruta y verdura.</p>
    <p><b>Fibra.</b> 14 g por cada 1.000 kcal (IOM), mínimo 25 g (EFSA). Más fibra se asocia a menos mortalidad, diabetes y enfermedad cardiovascular (Reynolds y col., 2019, The Lancet).</p>
    <p><b>Vitaminas y minerales.</b> Ingestas Dietéticas de Referencia (IOM/NASEM) para tu sexo y edad. Límites de la OMS: sodio &lt; 2 g/día, azúcares libres &lt; 10 % de la energía y grasa saturada &lt; 10 %.</p>
    <p><b>Agua.</b> EFSA (2010): 2,5 L/día los hombres y 2,0 L las mujeres en total, de los que ~80 % viene de bebidas.</p></div>
    <h3>Claves para que funcione</h3><div class="card small">
    <p>🏋️ <b>Entrena fuerza</b> 2-4 días por semana: es la señal que hace que el cuerpo use la proteína para construir o conservar músculo.</p>
    <p>😴 <b>Duerme 7-9 h</b>: dormir poco aumenta el hambre y hace que en un déficit pierdas más músculo.</p>
    <p>📏 <b>Pesa y apunta todo</b> durante unas semanas, también el aceite y las bebidas: es lo que más se olvida.</p>
    <p>📈 <b>Ajusta con datos</b>: si en 2-3 semanas tu peso medio no se mueve como se espera, sube o baja 100-200 kcal.</p>
    <p>🥦 <b>Verdura o fruta en cada comida</b> y legumbre 3-4 veces por semana cubre la mayoría de vitaminas y minerales.</p></div>
    <h3>Fuentes</h3><ul class="src">${SOURCES.map(([t, q]) => `<li><a href="https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(q)}" target="_blank" rel="noopener">${esc(t)}</a></li>`).join('')}
    <li><a href="https://www.efsa.europa.eu/en/topics/topic/dietary-reference-values" target="_blank" rel="noopener">EFSA — Dietary Reference Values (valores de referencia europeos)</a></li>
    <li><a href="https://www.ncbi.nlm.nih.gov/books/NBK545442/" target="_blank" rel="noopener">NASEM (2019) — Dietary Reference Intakes for Sodium and Potassium</a></li>
    <li><a href="https://fdc.nal.usda.gov/" target="_blank" rel="noopener">USDA FoodData Central</a> y <a href="https://www.bedca.net/" target="_blank" rel="noopener">BEDCA</a> — composición de alimentos</li></ul>
    <p class="tiny muted">Esta app es orientativa y no sustituye el consejo de un dietista-nutricionista o médico, sobre todo si tienes alguna enfermedad, estás embarazada o tienes antecedentes de trastornos alimentarios.</p>`;
  return h;
}
const SOURCES = [
  ['Mifflin MD y col. (1990). A new predictive equation for resting energy expenditure in healthy individuals. Am J Clin Nutr.', 'Mifflin new predictive equation for resting energy expenditure in healthy individuals'],
  ['Frankenfield D y col. (2005). Comparison of predictive equations for resting metabolic rate in healthy adults. J Am Diet Assoc.', 'Frankenfield comparison of predictive equations for resting metabolic rate in healthy nonobese and obese adults'],
  ['Morton RW y col. (2018). Protein supplementation and resistance training-induced gains in muscle mass and strength. Br J Sports Med.', 'Morton systematic review meta-analysis meta-regression effect of protein supplementation on resistance training-induced gains'],
  ['Jäger R y col. (2017). ISSN Position Stand: protein and exercise. J Int Soc Sports Nutr.', 'International Society of Sports Nutrition Position Stand: protein and exercise 2017'],
  ['Helms ER y col. (2014). Evidence-based recommendations for natural bodybuilding contest preparation: nutrition. J Int Soc Sports Nutr.', 'Evidence-based recommendations for natural bodybuilding contest preparation: nutrition and supplementation'],
  ['Garthe I y col. (2011). Effect of two different weight-loss rates on body composition and strength in elite athletes. IJSNEM.', 'Garthe effect of two different weight-loss rates on body composition and strength and power-related performance in elite athletes'],
  ['Iraki J y col. (2019). Nutrition recommendations for bodybuilders in the off-season. Sports.', 'Iraki nutrition recommendations for bodybuilders in the off-season narrative review'],
  ['Hall KD y col. (2011). Quantification of the effect of energy imbalance on bodyweight. The Lancet.', 'Hall quantification of the effect of energy imbalance on bodyweight'],
  ['Reynolds A y col. (2019). Carbohydrate quality and human health: systematic reviews and meta-analyses. The Lancet.', 'Reynolds carbohydrate quality and human health a series of systematic reviews and meta-analyses'],
];

// ---------- MENÚ 7 DÍAS ----------
function scaleRecipe(rec, kT, pT) {
  const it = rec.items.map(([id, g, role]) => ({id, g, role, f: FOODS[id]})).filter(x => x.f);
  const sum = (roles, key) => it.filter(x => roles.includes(x.role)).reduce((a, x) => a + (x.f.n[key] || 0) * x.g / 100, 0);
  const KP = sum('P', 'kcal'), PP = sum('P', 'p'), KC = sum('C', 'kcal'), PC = sum('C', 'p'), KF = sum('VF', 'kcal'), PF = sum('VF', 'p');
  let a = 1, b = 1;
  const det = KP * PC - KC * PP;
  if (KP > 0 && KC > 0 && Math.abs(det) > 1e-6) {
    a = ((kT - KF) * PC - KC * (pT - PF)) / det;
    a = clamp(a, 0.6, 2.6);
    b = clamp((kT - KF - a * KP) / KC, 0.3, 3);
    const k = KF + a * KP + b * KC;
    if (k > kT * 1.04 || k < kT * 0.96) a = clamp((kT - KF - b * KC) / KP, 0.6, 2.6);
  } else { a = b = clamp((kT - KF) / Math.max(1, KP + KC), 0.4, 3); }
  return it.map(x => [x.id, roundG(x.f, x.g * (x.role === 'P' ? a : x.role === 'C' ? b : 1))]);
}
function roundG(f, g) {
  if ((f.cat === 'huevos' || (f.unitName === 'lata' && f.cat === 'pescado')) && f.unitG) return Math.max(1, Math.round(g / f.unitG)) * f.unitG;
  return g >= 20 ? r5(g) : Math.max(1, Math.round(g));
}
function itemsN(items) { const t = {kcal: 0, p: 0, c: 0, f: 0}; for (const [id, g] of items) if (FOODS[id]) addN(t, nOf(FOODS[id], g)); return t; }
function slotTargets(T, bf) {
  return bf ? {b: [T.kcal * 0.25, T.p * 0.22], l: [T.kcal * 0.35, T.p * 0.33], d: [T.kcal * 0.30, T.p * 0.33]} : {l: [T.kcal * 0.35, T.p * 0.35], d: [T.kcal * 0.30, T.p * 0.35]};
}
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function genMenu(bf) {
  const T = targets(); bf = bf ?? (S.menu ? S.menu.bf : false);
  const st = slotTargets(T, bf);
  const L = shuffle(RECIPES.filter(r => r.tags.includes('comida')));
  let Dp = shuffle(RECIPES.filter(r => r.tags.includes('cena')));
  const Bp = shuffle(BREAKFASTS);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const l = L[i % L.length];
    let j = Dp.findIndex(r => r.id !== l.id && (i === 0 || r.id !== days[i - 1].l.rid));
    if (j < 0) { Dp = shuffle(RECIPES.filter(r => r.tags.includes('cena'))); j = Dp.findIndex(r => r.id !== l.id); }
    const d = Dp.splice(j, 1)[0];
    const day = {l: {rid: l.id, items: scaleRecipe(l, ...st.l)}, d: {rid: d.id, items: scaleRecipe(d, ...st.d)}};
    if (bf) { const b = Bp[i % Bp.length]; day.b = {rid: b.id, items: scaleRecipe(b, ...st.b)}; }
    days.push(day);
  }
  S.menu = {start: today(), plan: S.profile.plan, kcal: T.kcal, p: T.p, bf, days}; S.shop = {}; save();
}
const recById = id => RECIPES.find(r => r.id === id) || BREAKFASTS.find(r => r.id === id);
function viewMenu() {
  if (!S.menu) genMenu(false);
  const M = S.menu, T = targets(), st = slotTargets(T, M.bf);
  let h = '';
  if (Math.abs(M.kcal - T.kcal) > 80 || M.plan !== S.profile.plan) h += `<div class="note">Tus objetivos han cambiado desde que se hizo este menú. <button class="btn small primary" style="margin-top:6px" onclick="A.regen()">Recalcular menú</button></div>`;
  h += `<div class="card small"><p style="margin-top:0">Menú económico para <b>${T.plan.name.toLowerCase()}</b> desde el ${longDate(M.start).toLowerCase()}. Cada plato está ajustado a ~<b>${fmt(st.l[0])} kcal</b> en la comida y ~<b>${fmt(st.d[0])} kcal</b> en la cena${M.bf ? `, ~${fmt(st.b[0])} en el desayuno` : ''}, con mucha proteína.</p>
    <p class="muted">${M.bf ? 'El resto' : `Te quedan ~${fmt(T.kcal - st.l[0] - st.d[0])} kcal`} para ${M.bf ? 'snacks' : 'desayuno y snacks'} (fruta, yogur, frutos secos, tostadas…). Cantidades en crudo y por persona.</p>
    <label class="row" style="margin-top:8px"><input type="checkbox" ${M.bf ? 'checked' : ''} onchange="A.bf(this.checked)"> Incluir desayunos en el menú y la lista</label>
    <div class="grid2" style="margin-top:10px"><button class="btn small" onclick="A.regen()">🔄 Menú nuevo</button><button class="btn small" onclick="A.pseg('shop')">🛒 Lista de la compra</button></div></div>
    <div class="note blue">💡 Para ahorrar tiempo y dinero: cocina el doble de la comida y guarda la mitad en táper, compra marca blanca, legumbre en bote o seca, y pescado y verdura congelados (mismos nutrientes, más baratos y no se estropean).</div>`;
  M.days.forEach((d, i) => {
    const k = addDays(M.start, i), dn = itemsN([...(d.b ? d.b.items : []), ...d.l.items, ...d.d.items]);
    h += `<div class="day"><div class="dh"><h2 style="font-size:16px">${cap(WD[parseKey(k).getDay()])} <span class="muted small">${shortDate(k)}</span></h2><span class="tiny muted num">${fmt(dn.kcal)} kcal · P ${fmt(dn.p)} g</span></div>
      ${(M.bf ? [['b', 'Desayuno']] : []).concat([['l', 'Comida'], ['d', 'Cena']]).map(([s, l]) => recBlock(d[s], i, s, l, k)).join('')}</div>`;
  });
  return h;
}
function recBlock(slot, i, s, label, k) {
  const r = recById(slot.rid), n = itemsN(slot.items);
  return `<div class="rec"><details><summary><div class="tp">${label}</div><div class="row between"><b>${esc(r.name)}</b><span class="small num" style="white-space:nowrap">${fmt(n.kcal)} kcal</span></div>
    <div class="macros num"><span>P <b>${fmt(n.p)}</b> g</span><span>H <b>${fmt(n.c)}</b> g</span><span>G <b>${fmt(n.f)}</b> g</span><span style="margin-left:auto;color:var(--accent)">Ver receta ▾</span></div></summary>
    <div class="ing">${slot.items.map(([id, g]) => esc(ingText(FOODS[id], g))).join(' · ')}</div>
    <p class="small">${esc(r.steps)}</p>
    <div class="row wrap" style="gap:6px"><button class="btn small" onclick="A.swap(${i},'${s}')">🔄 Cambiar plato</button><button class="btn small" onclick="A.logRec(${i},'${s}')">＋ Añadir a ${dayLabel(k).toLowerCase()}</button></div></details></div>`;
}
function ingText(f, g) {
  const nm = f.name.replace(/ \(.*\)/, '').toLowerCase();
  if (f.cat === 'huevos' && f.unitG) { const n = Math.round(g / f.unitG); return f.id === 'clara' ? `${n} clara${n > 1 ? 's' : ''}` : `${n} huevo${n > 1 ? 's' : ''}`; }
  if (f.unitName === 'lata' && f.cat === 'pescado') { const n = Math.round(g / f.unitG); return `${n} lata${n > 1 ? 's' : ''} de ${nm.replace(/ en lata.*/, '')} (${fmt(g)} g escurrido)`; }
  return `${fmt(g)} ${baseU(f)} ${nm}`;
}
// lista de la compra
const SHOP_CATS = [['verdura', '🥬 Verdura y hortalizas'], ['fruta', '🍎 Fruta'], ['carne', '🍗 Carne'], ['pescado', '🐟 Pescado y latas'], ['huevos', '🥚 Huevos'], ['lacteos', '🥛 Lácteos'], ['legumbre', '🫘 Legumbres y tofu'], ['cereal', '🍞 Pan, arroz y pasta'], ['congelado', '🧊 Congelados'], ['despensa', '🫙 Despensa'], ['bebida', '🥤 Bebidas'], ['otros', '📦 Otros']];
const PANTRY = new Set(['aceite_oliva', 'aceite_girasol', 'especias', 'sal', 'vinagre', 'soja_salsa']);
function shopAgg() {
  const agg = {}; if (!S.menu) return agg;
  for (const d of S.menu.days) for (const s of ['b', 'l', 'd']) if (d[s]) for (const [id, g] of d[s].items) agg[id] = (agg[id] || 0) + g;
  return agg;
}
function buyText(f, g) {
  const liq = f.base === 'ml';
  if (f.cat === 'huevos' && f.unitG) { const n = Math.ceil(g / f.unitG - 0.05); return f.id === 'clara' ? `${n} claras` : `${n} huevos${n > 6 ? ` (${n > 12 ? Math.ceil(n / 12) + ' docenas' : '1 docena'})` : ''}`; }
  if (f.unitName === 'lata' || f.unitName === 'bote') { const n = Math.ceil(g / f.unitG - 0.1); return `${n} ${f.unitName}${n > 1 ? 's' : ''}${f.unitName === 'bote' ? ' (de 400 g)' : f.id === 'tomate_trit' ? ' (de 400 g)' : ''}`; }
  if (liq) return g >= 1000 ? `${fmt(Math.ceil(g / 250) * 0.25, 2)} L` : `${Math.ceil(g / 50) * 50} ml`;
  if (f.unitG && ['verdura', 'fruta'].includes(f.cat)) { const n = Math.ceil(g / f.unitG - 0.15); return `${Math.max(1, n)} ud. (≈ ${fmt(r5(g))} g)`; }
  if ((f.id === 'pan' || f.id === 'pan_int') && g >= 200) return `${fmt(Math.ceil(g / 50) * 50)} g (≈ ${Math.max(1, Math.round(g / 250))} barra${Math.round(g / 250) > 1 ? 's' : ''})`;
  return g >= 1000 ? `${fmt(Math.ceil(g / 100) / 10, 1)} kg` : `${Math.ceil(g / 50) * 50} g`;
}
function shopList() {
  const agg = shopAgg(), groups = {};
  for (const id in agg) { const f = FOODS[id]; if (!f) continue; const cat = PANTRY.has(id) ? 'pantry' : f.cat; (groups[cat] = groups[cat] || []).push([f, agg[id]]); }
  return groups;
}
function viewShop() {
  if (!S.menu) genMenu(false);
  const groups = shopList(), tot = Object.values(groups).flat().filter(([f]) => !PANTRY.has(f.id)).length, done = Object.values(groups).flat().filter(([f]) => S.shop[f.id] && !PANTRY.has(f.id)).length;
  let h = `<div class="card small"><div class="row between"><span>Para las <b>${S.menu.days.length * (S.menu.bf ? 3 : 2)} comidas</b> del menú (1 persona)</span><b class="num">${done}/${tot}</b></div>
    <div class="track" style="margin-top:8px"><i style="width:${tot ? done / tot * 100 : 0}%;background:var(--good)"></i></div>
    <div class="grid2" style="margin-top:10px"><button class="btn small" onclick="A.shareShop()">📤 Compartir / copiar</button><button class="btn small" onclick="A.shopReset()">Desmarcar todo</button></div></div>`;
  for (const [cat, label] of SHOP_CATS) {
    if (!groups[cat]) continue;
    h += `<h3>${label}</h3><div class="card tight">${groups[cat].sort((a, b) => a[0].name.localeCompare(b[0].name)).map(([f, g]) => `<div class="shop ${S.shop[f.id] ? 'done' : ''}" onclick="A.shopT('${f.id}')"><div class="cb">${S.shop[f.id] ? '✓' : ''}</div><div class="grow nm">${esc(f.name.replace(/ \((crudo|cruda|crudos)\)/, ''))}</div><div class="small muted num" style="text-align:right">${buyText(f, g)}</div></div>`).join('')}</div>`;
  }
  if (groups.pantry) h += `<h3>🧂 Comprueba que tienes en casa</h3><div class="card tight">${groups.pantry.map(([f, g]) => `<div class="shop ${S.shop[f.id] ? 'done' : ''}" onclick="A.shopT('${f.id}')"><div class="cb">${S.shop[f.id] ? '✓' : ''}</div><div class="grow nm">${esc(f.name)}</div><div class="small muted num">${f.id === 'aceite_oliva' || f.id === 'aceite_girasol' ? '≈ ' + fmt(Math.ceil(g / 0.92 / 10) * 10) + ' ml' : '≈ ' + fmt(Math.ceil(g)) + ' ' + baseU(f)}</div></div>`).join('')}</div>`;
  h += `<p class="tiny muted">Cantidades redondeadas hacia arriba según cómo se suele vender cada producto. Ahorra eligiendo marca blanca, comprando a granel la legumbre seca, el arroz y la avena, y aprovechando las ofertas de pollo y pescado congelado.</p>`;
  return h;
}
function shopText() {
  const groups = shopList(); let t = '🛒 Lista de la compra (menú 7 días)\n';
  for (const [cat, label] of SHOP_CATS) if (groups[cat]) { t += `\n${label}\n`; for (const [f, g] of groups[cat]) t += `${S.shop[f.id] ? '✓' : '☐'} ${f.name.replace(/ \((crudo|cruda)\)/, '')}: ${buyText(f, g)}\n`; }
  if (groups.pantry) t += `\n🧂 Despensa: ${groups.pantry.map(([f]) => f.name).join(', ')}\n`;
  return t;
}

// ---------- MÁS / ajustes ----------
function sheetMore() {
  const b = `<div class="card tight">
    <div class="res" onclick="A.profile()"><div class="grow"><div class="nm">👤 Mis datos</div><div class="tiny muted">Sexo, edad, altura, peso y actividad</div></div><span class="muted">›</span></div>
    <div class="res" onclick="A.myFoods()"><div class="grow"><div class="nm">🥫 Mis alimentos</div><div class="tiny muted">${S.custom.length} creados por ti · consultar la base de datos</div></div><span class="muted">›</span></div>
    <div class="res" onclick="A.myDishes()"><div class="grow"><div class="nm">⭐ Mis platos</div><div class="tiny muted">${S.dishes.length} guardados</div></div><span class="muted">›</span></div>
    <div class="res" style="border:0" onclick="A.tab('plan');A.close('more')"><div class="grow"><div class="nm">🎯 Plan y objetivos</div><div class="tiny muted">${targets().plan.name}</div></div><span class="muted">›</span></div></div>
    <h3>Copia de seguridad</h3><div class="card small"><p style="margin-top:0">Tus datos se guardan solo en este móvil. Haz una copia de vez en cuando (por ejemplo, guárdala en Drive o envíatela por correo) para no perderlos si cambias de móvil o borras la app.</p>
    <div class="grid2"><button class="btn small" onclick="A.exportData()">⬇️ Exportar copia</button><label class="btn small">⬆️ Importar<input type="file" accept="application/json,.json" style="display:none" onchange="A.importData(this.files[0])"></label></div>
    <button class="btn small danger block" style="margin-top:10px" onclick="A.wipe()">Borrar todos los datos</button></div>
    <p class="tiny muted" style="text-align:center">Nutri · base de datos USDA/BEDCA + Open Food Facts</p>`;
  return frame('more', 'Más', b);
}
function profileForm(p, btn) {
  return `<label class="l">Sexo</label><div class="seg" style="margin:0">${[['m', 'Hombre'], ['f', 'Mujer']].map(([s, l]) => `<button class="${p.sex === s ? 'on' : ''}" onclick="A.pf('sex','${s}')">${l}</button>`).join('')}</div>
    <div class="grid3"><div><label class="l">Edad</label><input class="f" type="text" inputmode="numeric" value="${p.age || ''}" oninput="A.pf('age',this.value)" placeholder="25"></div>
    <div><label class="l">Altura (cm)</label><input class="f" type="text" inputmode="numeric" value="${p.height || ''}" oninput="A.pf('height',this.value)" placeholder="175"></div>
    <div><label class="l">Peso (kg)</label><input class="f" type="text" inputmode="decimal" step="0.1" value="${p.weight || ''}" oninput="A.pf('weight',this.value)" placeholder="72"></div></div>
    <label class="l">Nivel de actividad</label>${ACTS.map(([v, l, d]) => `<div class="res" onclick="A.pf('act',${v},true)"><div class="cb" style="width:20px;height:20px;border-radius:99px;border:2px solid ${p.act === v ? 'var(--accent)' : 'var(--line)'};background:${p.act === v ? 'var(--accent)' : 'transparent'}"></div><div class="grow"><div class="nm">${l}</div><div class="tiny muted">${d}</div></div></div>`).join('')}
    <button class="btn primary block" style="margin-top:16px" onclick="A.saveProfile()">${btn}</button>`;
}
let PF = null;
function onboarding() {
  if (!PF) PF = {sex: 'm', age: '', height: '', weight: '', act: 1.375};
  return `<div style="padding-top:30px"><div style="font-size:44px">🥗</div><h1>Nutri</h1><p class="muted">Apunta lo que comes, mira tus calorías y nutrientes y aprende qué le falta a tu cuerpo. Primero, unos datos para calcular lo que necesitas:</p>
    <div class="card" id="pfcard">${profileForm(PF, 'Calcular mis necesidades')}</div><p class="tiny muted">Todo se guarda solo en tu dispositivo.</p></div>`;
}
function sheetProfile() { return frame('prof', 'Mis datos', `<div id="pfcard">${profileForm(PF, 'Guardar')}</div>`); }
function sheetFoods(q = '') {
  return frame('foods', 'Mis alimentos', `<button class="btn primary block" style="margin-top:8px" onclick="A.newFood('x')">➕ Crear alimento</button>
    <h3>Creados por ti</h3><div class="card tight">${S.custom.length ? S.custom.slice().reverse().map(c => `<div class="res"><div class="grow" onclick="A.editFood('${c.id}')"><div class="nm">${esc(c.name)}</div><div class="tiny muted num">${fmt(c.n.kcal)} kcal · P ${fmt(c.n.p || 0, 1)} · H ${fmt(c.n.c || 0, 1)} · G ${fmt(c.n.f || 0, 1)} /100 ${c.base}${c.src ? ' · ' + esc(c.src) : ''}</div></div><button class="muted" onclick="A.delFood('${c.id}')">🗑</button></div>`).join('') : '<p class="empty small">Aún no has creado ninguno. Cuando un ingrediente no esté en la base de datos, créalo con su etiqueta y la app lo recordará.</p>'}</div>
    <h3>Consultar base de datos (${FOOD_ROWS.length} alimentos)</h3><input class="f" placeholder="Buscar…" oninput="A.dbq(this.value)"><div id="dbres" class="card tight" style="margin-top:8px"><p class="tiny muted">Escribe para buscar.</p></div>`);
}
function sheetDishes() {
  return frame('dishes', 'Mis platos', S.dishes.length ? `<div class="card tight">${S.dishes.map(x => `<div class="res"><div class="grow"><div class="nm">${esc(x.name)}</div><div class="tiny muted">${x.items.map(i => esc(i.name)).join(', ')}</div><div class="tiny muted num">${fmt(dishKcal(x) / (x.st || 1))} kcal por ración · ${fmt(x.st, 2)} raciones</div></div><button class="muted" onclick="A.delDish('${x.id}')">🗑</button></div>`).join('')}</div>`
    : `<p class="empty small">Al guardar una comida marca "Guardar en Mis platos" y aparecerá aquí para repetirla con un toque.</p>`);
}

// ---------- acciones ----------
const A = window.A = {
  tab(t) { U.tab = t; if (t === 'today') U.day = U.day || today(); render(); window.scrollTo(0, 0); },
  shift(n) { U.day = addDays(U.day, n); render(); },
  more() { openSheet('more', sheetMore); },
  close(id) { closeSheet(id); },
  toggleMicro() { U.microOpen = !U.microOpen; render(); },
  water(ml) { const d = S.days[U.day] = S.days[U.day] || {meals: [], water: 0}; d.water = Math.max(0, (d.water || 0) + ml); save(); render(); },
  openMeal(id) { U.open[id] = !U.open[id]; render(); },
  // añadir
  add(type) { D = newDraft(type); openSheet('add', sheetAdd); setTimeout(() => { const t = $('#dtext'); if (t) t.focus(); }, 300); },
  dset(k, v) { D[k] = v; if (k === 'type' && !D.editId) D.last = v === 'cena'; refresh('add'); },
  dval(k, v) { D[k] = v; },
  dnum(k, v) { D[k] = Math.max(0.25, +String(v).replace(',', '.') || 1); const t = document.getElementById('dtot'); if (t) t.innerHTML = totHTML(); },
  parse() {
    const text = D.text.trim(); if (!text) { toast('Escribe primero los ingredientes'); return; }
    D.items = D.items.filter(i => i.src !== 'text');
    for (const seg of splitDish(text)) {
      const p = parseLine(seg); if (!p.q) continue;
      const m = matchFoods(p.q, 1, p.container)[0];
      const it = makeItem(p, m && m[0] >= 52 ? m[1].id : null); it.src = 'text'; D.items.push(it);
    }
    if (!D.name) { const nm = D.items.filter(i => i.fid).slice(0, 3).map(i => FOODS[i.fid].name.replace(/ \(.*\)/, '').toLowerCase()); if (nm.length) D.name = cap(nm.join(', ')); }
    refresh('add');
    const bad = D.items.filter(i => !i.fid).length; toast(bad ? `${bad} ingrediente(s) sin reconocer` : `${D.items.length} ingredientes calculados ✓`);
  },
  dsearch(q) { D.sq = q; const el = $('#dsres'); if (el) el.innerHTML = searchResults(q, 'A.dpick'); },
  dpick(fid) { pickTarget('d')(fid); },
  iqty(i, v) { D.items[i].qty = +String(v).replace(',', '.') || 0; D.items[i].warn = ''; calcItem(D.items[i]); updRow(i); },
  iunit(i, u) { D.items[i].unit = u; D.items[i].warn = ''; calcItem(D.items[i]); updRow(i); },
  idel(i) { D.items.splice(i, 1); refresh('add'); },
  pickFor(i) {
    const it = D.items[i];
    PICK = {q: it.q || (FOODS[it.fid] && FOODS[it.fid].name) || '', cb: fid => {
      const f = FOODS[fid]; it.fid = fid; it.warn = '';
      if (it.unit === 'u' && !f.unitG) { it.unit = baseU(f); if (it.qty <= 10) it.qty = defUnit(f); }
      if ((it.unit === 'ml' && f.base === 'g' && f.d === 1) || (it.unit === 'g' && f.base === 'ml')) it.unit = baseU(f);
      calcItem(it); closeSheet('pick'); refresh('add');
    }};
    openSheet('pick', sheetPick);
  },
  pq(q) { PICK.q = q; const el = $('#pres'); if (el) el.innerHTML = searchResults(q, 'A.picked'); },
  picked(fid) { PICK.cb(fid); },
  useDish(id) {
    const x = S.dishes.find(d => d.id === id); if (!x) return;
    for (const it of x.items) { const c = JSON.parse(JSON.stringify(it)); c.src = 'dish'; if (FOODS[c.fid]) calcItem(c); D.items.push(c); }
    D.st = x.st || 1; D.se = 1; if (!D.name) D.name = x.name; D.mode = 'text'; refresh('add'); toast('Plato añadido: ajusta las raciones que has comido');
  },
  saveMeal() {
    if (!D.items.length || D.items.some(i => !i.fid)) return;
    const items = D.items.map(({raw, q, qty, unit, fid, name, amt, n, base, micro}) => ({raw, q, qty, unit, fid, name, amt, n, base, micro}));
    const meal = {id: D.editId || uid(), type: D.type, name: D.name.trim() || cap(items.slice(0, 3).map(i => i.name.replace(/ \(.*\)/, '').toLowerCase()).join(', ')), items, st: +D.st || 1, se: +D.se || 1, t: Date.now()};
    const day = S.days[D.day] = S.days[D.day] || {meals: [], water: 0};
    const ix = day.meals.findIndex(m => m.id === meal.id);
    if (ix >= 0) day.meals[ix] = meal; else day.meals.push(meal);
    if (D.saveDish) S.dishes.push({id: uid(), name: meal.name, items: JSON.parse(JSON.stringify(items)), st: meal.st});
    day.closed = false; save();
    const k = D.day, last = D.last;
    closeSheet('add'); U.tab = 'today'; U.day = k; render();
    toast(`${meal.name}: ${fmt(mealN(meal).kcal)} kcal ✓`);
    if (last) setTimeout(() => A.report(k), 350);
  },
  editMeal(id) {
    const m = S.days[U.day].meals.find(x => x.id === id); if (!m) return;
    D = Object.assign(newDraft(m.type), {editId: m.id, name: m.name, items: JSON.parse(JSON.stringify(m.items)).map(i => Object.assign(i, {src: 'edit'})), st: m.st || 1, se: m.se || 1, last: false});
    openSheet('add', sheetAdd);
  },
  dupMeal(id) {
    const m = S.days[U.day].meals.find(x => x.id === id); if (!m) return;
    const t = today(), c = JSON.parse(JSON.stringify(m)); c.id = uid(); c.t = Date.now();
    (S.days[t] = S.days[t] || {meals: [], water: 0}).meals.push(c); save(); U.day = t; render(); toast('Añadido a hoy');
  },
  delMeal(id) { if (!confirm('¿Borrar esta comida?')) return; const d = S.days[U.day]; d.meals = d.meals.filter(x => x.id !== id); save(); render(); },
  report(k) { closeSheet('day'); openSheet('rep', () => sheetReport(k)); },
  // alimentos propios
  newFood(where, preset) {
    NF = Object.assign(blankFood(where === 'x' ? '' : (where === 'd' ? D.sq : PICK ? PICK.q : '')), preset || {}, {where});
    openSheet('food', sheetNewFood);
  },
  editFood(id) {
    const c = S.custom.find(x => x.id === id); if (!c) return;
    NF = {id: c.id, name: c.name, base: c.base, per: 100, unitG: c.unitG || '', unitName: c.unitName || 'unidad', salt: c.n.na != null ? Math.round(c.n.na / 400 * 100) / 100 : '', n: Object.assign({}, c.n), src: c.src || '', where: 'x'};
    delete NF.n.na; openSheet('food', sheetNewFood);
  },
  nf(k, v) { NF[k] = v; },
  nfn(k, v) { if (v === '') delete NF.n[k]; else NF.n[k] = +String(v).replace(',', '.'); },
  nfBase(b) { NF.base = b; refresh('food'); },
  saveFood() {
    if (!NF.name.trim()) { toast('Ponle un nombre'); return; }
    if (NF.n.kcal == null || isNaN(NF.n.kcal)) { toast('Falta la energía (kcal)'); return; }
    const per = +String(NF.per).replace(',', '.') || 100, n = {};
    for (const k in NF.n) if (!isNaN(NF.n[k])) n[k] = Math.round(NF.n[k] * 100 / per * 1000) / 1000;
    for (const k of ['p', 'c', 'f']) if (n[k] == null) n[k] = 0;
    const salt = +String(NF.salt).replace(',', '.'); if (NF.salt !== '' && !isNaN(salt)) n.na = salt * 400 * 100 / per;
    const food = {id: NF.id || 'c_' + uid(), name: NF.name.trim(), base: NF.base, n, unitG: +NF.unitG || 0, unitName: +NF.unitG ? (NF.unitName || 'unidad') : '', src: NF.src || '', cat: 'otros'};
    const ix = S.custom.findIndex(x => x.id === food.id); if (ix >= 0) S.custom[ix] = food; else S.custom.push(food);
    save(); buildFoods(); closeSheet('food'); closeSheet('off');
    toast('Guardado en Mis alimentos ✓');
    if (NF.where === 'd') pickTarget('d')(food.id); else if (NF.where === 'p' && PICK) PICK.cb(food.id);
    else if (SH.find(x => x.id === 'foods')) refresh('foods');
  },
  delFood(id) { if (!confirm('¿Borrar este alimento? Las comidas ya registradas no cambian.')) return; S.custom = S.custom.filter(x => x.id !== id); save(); buildFoods(); refresh('foods'); },
  myFoods() { openSheet('foods', sheetFoods); },
  dbq(q) { const el = $('#dbres'); if (!el) return; const r = q.trim() ? matchFoods(q, 12).map(x => x[1]) : []; el.innerHTML = r.length ? r.map(f => `<div class="res"><div class="grow"><div class="nm">${esc(f.name)}</div><div class="tiny muted num">${fmt(f.n.kcal)} kcal · P ${fmt(f.n.p, 1)} · H ${fmt(f.n.c, 1)} · G ${fmt(f.n.f, 1)} · Fibra ${fmt(f.n.fib || 0, 1)} /100 ${baseU(f)}${f.unitG ? ` · 1 ${f.unitName} = ${fmt(f.unitG)} ${baseU(f)}` : ''}</div></div></div>`).join('') : '<p class="tiny muted">Sin resultados.</p>'; },
  myDishes() { openSheet('dishes', sheetDishes); },
  delDish(id) { S.dishes = S.dishes.filter(x => x.id !== id); save(); refresh('dishes'); },
  // Open Food Facts
  offOpen(where) { OFF = {q: where === 'd' ? D.sq : PICK ? PICK.q : '', res: null, loading: false, err: '', where}; openSheet('off', sheetOff); if (OFF.q) A.offSearch(); },
  async offSearch() {
    const el = $('#offq'); if (el) OFF.q = el.value.trim(); if (!OFF.q) return;
    OFF.loading = true; OFF.err = ''; refresh('off');
    try {
      const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(OFF.q)}&search_simple=1&action=process&json=1&page_size=24&sort_by=unique_scans_n&fields=${OFF_FIELDS}`;
      let prods;
      try { const r = await fetch(url); if (!r.ok) throw new Error(r.status); prods = (await r.json()).products; }
      catch (e) { const r = await fetch(`https://search.openfoodfacts.org/search?q=${encodeURIComponent(OFF.q)}&page_size=24&fields=${OFF_FIELDS}`); if (!r.ok) throw e; prods = (await r.json()).hits; }
      OFF.res = (prods || []).map(offMap).filter(p => p.n.kcal != null);
    } catch (e) { OFF.err = 'No se ha podido conectar con Open Food Facts. Comprueba la conexión o inténtalo en un minuto.'; }
    OFF.loading = false; refresh('off');
  },
  async offCode(code) {
    code = code || ($('#offcode') && $('#offcode').value.trim()); if (!code) return;
    OFF.loading = true; refresh('off');
    try {
      const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${OFF_FIELDS}`);
      const j = await r.json(); if (!j.product) throw new Error('nf');
      OFF.res = [offMap(j.product)]; OFF.err = '';
    } catch (e) { OFF.res = null; OFF.err = 'No he encontrado ese código. Puedes crear el producto a mano con su etiqueta.'; }
    OFF.loading = false; refresh('off');
  },
  async scan() {
    const v = $('#scanv'); if (!v) return;
    try {
      const det = new BarcodeDetector({formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e']});
      const stream = await navigator.mediaDevices.getUserMedia({video: {facingMode: 'environment'}});
      v.srcObject = stream; v.style.display = 'block'; await v.play();
      const stop = () => stream.getTracks().forEach(t => t.stop());
      const t0 = Date.now();
      const loop = async () => {
        if (!document.body.contains(v)) return stop();
        try { const c = await det.detect(v); if (c.length) { stop(); A.offCode(c[0].rawValue); return; } } catch (e) {}
        if (Date.now() - t0 > 30000) { stop(); v.style.display = 'none'; toast('No he leído ningún código'); return; }
        requestAnimationFrame(loop);
      };
      loop();
    } catch (e) { toast('No se puede usar la cámara'); }
  },
  offPick(i) {
    const p = OFF.res[i]; const n = Object.assign({}, p.n); const salt = n.na != null ? Math.round(n.na / 400 * 100) / 100 : ''; delete n.na;
    A.newFood(OFF.where, {name: p.name + (p.brand ? ` (${p.brand})` : ''), base: p.base, n, salt, unitG: p.unitG || '', unitName: p.unitG ? 'ración' : 'unidad', src: 'Open Food Facts' + (p.code ? ' · ' + p.code : '')});
  },
  // calendario
  calm(n) { let [y, m] = U.cal; m += n; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } U.cal = [y, m]; render(); },
  dayInfo(k) { openSheet('day', () => sheetDay(k)); },
  goDay(k) { closeSheet('day'); U.day = k; U.tab = 'today'; render(); },
  // peso
  saveW() {
    const v = +String($('#wIn').value).replace(',', '.');
    if (!v || v < 25 || v > 350) { toast('Introduce un peso válido'); return; }
    S.weights[U.day] = Math.round(v * 10) / 10; S.profile.weight = latestWeight(); save(); render(); toast('Peso guardado ✓');
  },
  delW(k) { if (!confirm('¿Borrar este registro de peso?')) return; delete S.weights[k]; if (latestWeight()) S.profile.weight = latestWeight(); save(); render(); },
  wr(r) { U.wRange = r; render(); },
  // plan
  pseg(s) { U.planSeg = s; U.tab = 'plan'; render(); window.scrollTo(0, 0); },
  choose(id) {
    const first = !S.profile.plan; S.profile.plan = id; genMenu(); save();
    U.planSeg = first ? 'menu' : U.planSeg; render();
    toast(first ? 'Plan elegido. Aquí tienes tu menú de 7 días 🍽️' : 'Plan cambiado. Menú de 7 días recalculado ✓');
  },
  regen() { genMenu(); render(); toast('Menú nuevo ✓'); },
  bf(on) { genMenu(on); render(); },
  swap(i, s) {
    const M = S.menu, T = targets(), st = slotTargets(T, M.bf);
    const pool = s === 'b' ? BREAKFASTS : RECIPES.filter(r => r.tags.includes(s === 'l' ? 'comida' : 'cena'));
    const used = new Set(M.days.map(d => d[s] && d[s].rid));
    let cand = pool.filter(r => !used.has(r.id)); if (!cand.length) cand = pool.filter(r => r.id !== M.days[i][s].rid);
    const r = cand[Math.floor(Math.random() * cand.length)];
    M.days[i][s] = {rid: r.id, items: scaleRecipe(r, ...st[s])}; save(); render();
  },
  logRec(i, s) {
    const slot = S.menu.days[i][s], r = recById(slot.rid), k = addDays(S.menu.start, i);
    const items = slot.items.map(([id, g]) => calcItem({raw: '', q: '', qty: g, unit: baseU(FOODS[id]), fid: id}));
    const day = S.days[k] = S.days[k] || {meals: [], water: 0};
    day.meals.push({id: uid(), type: s === 'b' ? 'desayuno' : s === 'l' ? 'comida' : 'cena', name: r.name, items: items.map(({raw, q, qty, unit, fid, name, amt, n, base, micro}) => ({raw, q, qty, unit, fid, name, amt, n, base, micro})), st: 1, se: 1, t: Date.now()});
    day.closed = false; save(); toast(`Añadido a ${dayLabel(k).toLowerCase()} ✓`);
  },
  shopT(id) { S.shop[id] = !S.shop[id]; save(); render(); },
  shopReset() { S.shop = {}; save(); render(); },
  async shareShop() {
    const t = shopText();
    try { if (navigator.share) { await navigator.share({title: 'Lista de la compra', text: t}); return; } } catch (e) { if (e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(t); toast('Lista copiada ✓'); } catch (e) { toast('No se pudo copiar'); }
  },
  // perfil
  profile() { PF = Object.assign({}, S.profile, {weight: latestWeight() || S.profile.weight}); openSheet('prof', sheetProfile); },
  pf(k, v, rerender) {
    if (['age', 'height', 'weight'].includes(k)) v = +String(v).replace(',', '.') || '';
    PF[k] = v;
    if (k === 'sex' || rerender) { const c = $('#pfcard'); if (c) c.innerHTML = profileForm(PF, S.profile ? 'Guardar' : 'Calcular mis necesidades'); }
  },
  saveProfile() {
    const p = PF;
    if (!(p.age >= 14 && p.age <= 100)) return toast('Edad entre 14 y 100 años');
    if (!(p.height >= 120 && p.height <= 230)) return toast('Altura en cm (120-230)');
    if (!(p.weight >= 30 && p.weight <= 300)) return toast('Peso en kg (30-300)');
    const first = !S.profile;
    S.profile = Object.assign(S.profile || {plan: null, created: today()}, {sex: p.sex, age: +p.age, height: +p.height, weight: +p.weight, act: +p.act});
    if (first || Math.abs((latestWeight() || 0) - p.weight) > 0.05) S.weights[today()] = Math.round(p.weight * 10) / 10;
    save();
    if (first) { U.tab = 'plan'; U.planSeg = 'goal'; render(); toast('Ahora elige tu plan 👇'); setTimeout(() => { const el = document.querySelector('.plan'); if (el) el.scrollIntoView({behavior: 'smooth', block: 'center'}); }, 300); }
    else { closeSheet('prof'); render(); toast('Datos guardados ✓'); }
  },
  // copia de seguridad
  async exportData() {
    const data = JSON.stringify(S), name = `nutri-copia-${today()}.json`;
    try { const file = new File([data], name, {type: 'application/json'}); if (navigator.canShare && navigator.canShare({files: [file]})) { await navigator.share({files: [file], title: 'Copia de Nutri'}); return; } } catch (e) { if (e.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], {type: 'application/json'})); a.download = name; a.click();
  },
  importData(file) {
    if (!file) return; const r = new FileReader();
    r.onload = () => { try { const s = JSON.parse(r.result); if (!s || !s.days) throw 0; if (!confirm('Esto sustituirá tus datos actuales por los de la copia. ¿Continuar?')) return; S = Object.assign(def(), s); save(); buildFoods(); closeSheet('more'); render(); toast('Copia importada ✓'); } catch (e) { toast('Archivo no válido'); } };
    r.readAsText(file);
  },
  wipe() { if (!confirm('¿Seguro? Se borrarán todas tus comidas, pesos y alimentos.')) return; if (!confirm('Última confirmación: no se puede deshacer.')) return; S = def(); save(); buildFoods(); PF = null; closeSheet('more'); render(); },
};

// ---------- arranque ----------
buildFoods();
render();
let lastDay = today();
document.addEventListener('visibilitychange', () => { if (!document.hidden && today() !== lastDay) { if (U.day === lastDay) U.day = today(); lastDay = today(); render(); } });
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
// exponer para pruebas
window.__nutri = {parseLine, splitDish, matchFoods, targets, FOODS: () => FOODS, S: () => S, scaleRecipe};
})();
