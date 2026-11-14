/* Genera la página a partir de window.SITE (js/data.js) y window.SITE_EN (js/data.en.js).
   No hace falta editarlo. */
(function () {
  "use strict";

  /* ---------- Idioma ---------- */
  const qs = new URLSearchParams(location.search).get("lang");
  let saved = null;
  try { saved = localStorage.getItem("lang"); } catch (e) { /* sin almacenamiento */ }
  const LANGS = ["es", "ca", "en"];
  const nav0 = (navigator.language || "").toLowerCase();
  const LANG = LANGS.includes(qs) ? qs
    : LANGS.includes(saved) ? saved
    : nav0.startsWith("ca") ? "ca"
    : /^(es|gl|eu)/.test(nav0) ? "es" : "en";
  document.documentElement.lang = LANG;

  // Mezcla los textos en inglés sobre los datos base (las listas se combinan por posición)
  const merge = (base, over) => {
    if (Array.isArray(base) && Array.isArray(over)) return base.map((b, i) => (i < over.length ? merge(b, over[i]) : b));
    if (base && over && typeof base === "object" && typeof over === "object" && !Array.isArray(over)) {
      const out = { ...base };
      Object.keys(over).forEach((k) => { out[k] = k in base ? merge(base[k], over[k]) : over[k]; });
      return out;
    }
    return over === undefined ? base : over;
  };
  const OVER = { en: window.SITE_EN, ca: window.SITE_CA }[LANG];
  const S = OVER ? merge(window.SITE, OVER) : window.SITE;

  const UI = {
    es: {
      nav: ["Formación", "Experiencia", "Proyectos", "Conocimientos", "Contacto"], fotos: "Fotografía", volver: "Volver al CV",
      formacion: "Formación", experiencia: "Experiencia", proyectos: "Proyectos", proyectosNota: "Código e informe de cada uno en GitHub.",
      conocimientos: "Conocimientos", conocimientosNota: "Haz clic en un área para ver el detalle.", contacto: "Contacto",
      codigo: "Código", informe: "Informe", cvEs: "CV en PDF ↓", cvCa: "CV en catalán ↓", cvEn: "CV in English ↓",
      habilidades: "Habilidades técnicas", idiomas: "Idiomas", nivel: ["", "Básico", "Elemental", "Intermedio", "Avanzado", "Experto"],
      nivelDe: (n) => `Nivel ${n} de 5`, verFigura: "Ampliar figura", figuraOriginal: "Ver figura original",
      fotosSub: "Algunas fotos que he hecho.", fotosVacio: "Galería en preparación.",
      demos: { lorenz: "Atractor de Lorenz · arrastra para girarlo", knn: "Clasificador k-NN · clic: punto azul, clic derecho: violeta",
               orbitas: "Gravedad · arrastra para lanzar un planeta", borrar: "Borrar" }
    },
    ca: {
      nav: ["Formació", "Experiència", "Projectes", "Coneixements", "Contacte"], fotos: "Fotografia", volver: "Tornar al CV",
      formacion: "Formació", experiencia: "Experiència", proyectos: "Projectes", proyectosNota: "Codi i informe de cadascun a GitHub.",
      conocimientos: "Coneixements", conocimientosNota: "Fes clic en una àrea per veure'n el detall.", contacto: "Contacte",
      codigo: "Codi", informe: "Informe", cvEs: "CV en castellà ↓", cvCa: "CV en PDF ↓", cvEn: "CV en anglès ↓",
      habilidades: "Habilitats tècniques", idiomas: "Idiomes", nivel: ["", "Bàsic", "Elemental", "Intermedi", "Avançat", "Expert"],
      nivelDe: (n) => `Nivell ${n} de 5`, verFigura: "Amplia la figura", figuraOriginal: "Veure la figura original",
      fotosSub: "Algunes fotos que he fet.", fotosVacio: "Galeria en preparació.",
      demos: { lorenz: "Atractor de Lorenz · arrossega per girar-lo", knn: "Classificador k-NN · clic: punt blau, clic dret: violeta",
               orbitas: "Gravetat · arrossega per llançar un planeta", borrar: "Esborra" }
    },
    en: {
      nav: ["Education", "Experience", "Projects", "Knowledge", "Contact"], fotos: "Photography", volver: "Back to CV",
      formacion: "Education", experiencia: "Experience", proyectos: "Projects", proyectosNota: "Code and report for each one on GitHub.",
      conocimientos: "Knowledge", conocimientosNota: "Click an area to see the details.", contacto: "Contact",
      codigo: "Code", informe: "Report", cvEs: "CV in Spanish ↓", cvCa: "CV in Catalan ↓", cvEn: "CV in English ↓",
      habilidades: "Technical skills", idiomas: "Languages", nivel: ["", "Basic", "Elementary", "Intermediate", "Advanced", "Expert"],
      nivelDe: (n) => `Level ${n} of 5`, verFigura: "Enlarge figure", figuraOriginal: "View original figure",
      fotosSub: "Some photos I have taken.", fotosVacio: "Gallery coming soon.",
      demos: { lorenz: "Lorenz attractor · drag to rotate", knn: "k-NN classifier · click: blue point, right-click: purple",
               orbitas: "Gravity · drag to launch a planet", borrar: "Clear" }
    }
  }[LANG];

  const page = document.body.dataset.page;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const hasUser = S.githubUser && !/TU-USUARIO/i.test(S.githubUser);
  const github = hasUser ? `https://github.com/${S.githubUser}` : "";
  const NIVEL = UI.nivel;
  const ext = (url) => (url ? `href="${esc(url)}" target="_blank" rel="noopener"` : "");
  const arrow = '<span class="arrow" aria-hidden="true">↗</span>';
  const plus = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  const db = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></svg>';

  /* Imagen con respaldo: si el logo no carga, se ven las iniciales */
  const logoImg = (src, ini) =>
    src ? `<img src="${esc(src)}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'${esc(ini)}'}))">`
        : `<span>${esc(ini)}</span>`;

  const meter = (n) =>
    `<div class="meter" role="img" aria-label="${UI.nivelDe(n)}">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= n ? "on" : ""}" style="--i:${i}"></i>`).join("")}</div>`;

  /* ---------- Cabecera ---------- */
  function topbar() {
    const ids = ["formacion", "experiencia", "proyectos", "habilidades", "contacto"];
    const names = { es: "Español", ca: "Català", en: "English" };
    const sw = `<div class="lang" role="group" aria-label="Idioma / Language">${LANGS.map((l) =>
      `<button type="button" data-lang="${l}" class="${l === LANG ? "is-on" : ""}" aria-pressed="${l === LANG}" aria-label="${names[l]}" lang="${l}">${l.toUpperCase()}</button>`).join("")}</div>`;
    const links = page === "inicio"
      ? `${ids.map((id, i) => `<a href="#${id}">${UI.nav[i]}</a>`).join("")}
         ${sw}<a class="pill" href="fotos.html">${UI.fotos} <span class="arrow">→</span></a>`
      : `${sw}<a class="pill" href="index.html"><span>←</span> ${UI.volver}</a>`;
    $("#topbar").innerHTML = `<div class="wrap"><a class="brand" href="index.html">${esc(S.perfil.nombre)}</a><nav class="nav">${links}</nav></div>`;
    $$("#topbar .lang button").forEach((b) => b.addEventListener("click", () => {
      const l = b.dataset.lang;
      if (l === LANG) return;
      try { localStorage.setItem("lang", l); } catch (err) { /* sin almacenamiento */ }
      const u = new URL(location.href); u.searchParams.set("lang", l); location.href = u.toString();
    }));
    const bar = $("#topbar");
    const onScroll = () => {
      bar.classList.toggle("is-scrolled", window.scrollY > 8);
      const h = document.getElementById("heroBg");
      bar.classList.toggle("on-hero", !!h && window.scrollY < h.offsetHeight - 60);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Bloques de la página principal ---------- */
  const section = (id, title, note, body) => `
    <section class="section" id="${id}">
      <div class="section__label"><h2>${title}</h2>${note ? `<p>${note}</p>` : ""}</div>
      <div class="section__body">${body}</div>
    </section>`;

  /* Enlaces al CV: el del idioma de la página y, además, el inglés (o el castellano si la página está en inglés) */
  function cvLinks(p) {
    const cv = { es: [p.cvPdf, UI.cvEs], ca: [p.cvPdfCa, UI.cvCa], en: [p.cvPdfEn, UI.cvEn] };
    const order = LANG === "en" ? ["en", "es"] : [LANG, "en"];
    return order.filter((l) => cv[l][0]).map((l) =>
      `<a href="${esc(cv[l][0])}" target="_blank" rel="noopener" class="cv-link" data-src="${esc(cv[l][0])}" hidden>${cv[l][1]}</a>`).join("");
  }

  function hero() {
    const p = S.perfil;
    return `
      <header class="hero-bg" id="heroBg">
        <div class="wrap">
          <div class="hero">
            <h1>${esc(p.nombre)}</h1>
            <p class="hero__loc">${esc(p.ubicacion)}</p>
            <div class="hero__links">
              <a href="mailto:${esc(p.email)}">${esc(p.email)}</a>
              <a ${ext(p.linkedin)}>LinkedIn ${arrow}</a>
              ${github ? `<a ${ext(github)}>GitHub ${arrow}</a>` : ""}
              ${cvLinks(p)}
            </div>
          </div>
        </div>
        ${S.fondo ? `<span class="hero-bg__credit">${esc(S.fondo.credito)}</span>` : ""}
      </header>`;
  }

  /* Carga la primera imagen de fondo disponible */
  function cargarFondo() {
    const el = $("#heroBg");
    if (!el || !S.fondo) return;
    let lista = S.fondo.candidatos.slice();
    // En pantallas pequeñas, primero la versión ligera
    if (window.innerWidth < 900) lista = [lista[0], ...lista.slice(1).sort((a, b) => (b.includes("/screen/") ? 1 : 0) - (a.includes("/screen/") ? 1 : 0))];
    const probar = () => {
      const src = lista.shift();
      if (!src) return;
      const img = new Image();
      let hecho = false;
      const fallo = () => { if (!hecho) { hecho = true; probar(); } };
      const t = setTimeout(fallo, 8000);
      img.onload = () => {
        if (hecho) return;
        hecho = true; clearTimeout(t);
        el.style.setProperty("--fondo", `url("${src}")`);
        el.classList.add("has-img");
      };
      img.onerror = () => { clearTimeout(t); fallo(); };
      img.src = src;
    };
    probar();
  }

  function formacion() {
    return S.formacion.map((f) => `
      <div class="entry reveal">
        <a class="logo" ${ext(f.url)} aria-label="${esc(f.centro)}">${logoImg(f.logo, f.iniciales)}</a>
        <div>
          <div class="entry__title"><a ${ext(f.url)}>${esc(f.titulo)}</a></div>
          <div class="entry__sub">${esc(f.centro)}</div>
          ${f.cursos ? `<ul class="courses">${f.cursos.map(([c, n, u]) => `<li><code>${esc(c)}</code><a ${ext(u)}>${esc(n)}</a></li>`).join("")}</ul>` : ""}
        </div>
        <div class="entry__date">${esc(f.periodo)}</div>
      </div>`).join("");
  }

  function experiencia() {
    return S.experiencia.map((e) => `
      <div class="entry entry--plain reveal">
        <div>
          <div class="entry__title">${esc(e.puesto)}</div>
          <div class="entry__sub">${esc(e.lugar)}</div>
          <div class="entry__text">${esc(e.detalle)}</div>
        </div>
        <div class="entry__date">${esc(e.periodo)}</div>
      </div>`).join("");
  }

  /* Gráfico pequeño de comparación de modelos, con el estilo de la web */
  function grafico(g, fig, pie) {
    const [lo, hi] = g.dominio;
    const pct = (v) => Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100));
    const fmt = (v) => Number(v).toFixed(g.decimales ?? 2) + (g.unidad || "");
    // Marcas del eje en valores redondos (1, 2, 2.5 o 5 × 10^k)
    const raw = (hi - lo) / 3, mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const m = [1, 2, 2.5, 5, 10].find((k) => (hi - lo) / (k * mag) <= 4);
    const step = m * mag;
    const ticks = [];
    for (let t = Math.ceil(lo / step - 1e-9) * step; t <= hi + 1e-9; t += step) ticks.push(t);
    const tickDec = Math.max(0, -Math.floor(Math.log10(step) + 1e-9) + (m === 2.5 ? 1 : 0));
    const grid = ticks.map((t) => `<b class="c-grid" style="left:${pct(t)}%"></b>`).join("");
    const rows = g.filas.map((f) => {
      let mark, val;
      if (g.tipo === "pesas") {
        const x1 = pct(f.a), x2 = pct(f.b);
        mark = `<i class="c-seg" style="--x:${x1}%;--w:${x2 - x1}%"></i><i class="c-dot c-dot--a" style="--x:${x1}%"></i><i class="c-dot" style="--x:${x2}%"></i>`;
        val = fmt(f.b);
      } else if (g.tipo === "barras") {
        mark = `<i class="c-bar" style="--w:${pct(f.v)}%"></i>`;
        val = fmt(f.v);
      } else {
        mark = `<i class="c-dot${f.ref ? " c-dot--ref" : ""}" style="--x:${pct(f.v)}%"></i>`;
        val = fmt(f.v);
      }
      return `<div class="c-row${f.top ? " is-top" : ""}"><span class="c-lab">${esc(f.e)}</span><span class="c-track">${grid}${mark}</span><span class="c-val">${esc(val)}</span></div>`;
    }).join("");
    const axis = `<div class="c-row c-axis"><span></span><span class="c-track">${ticks.map((t) => `<em style="left:${pct(t)}%">${Number(t).toFixed(tickDec)}</em>`).join("")}</span><span></span></div>`;
    const leyenda = g.leyenda ? `<span class="chart__legend"><i class="c-key c-key--a"></i>${esc(g.leyenda[0])}<i class="c-key"></i>${esc(g.leyenda[1])}</span>` : "";
    const orig = fig ? `<button type="button" class="fig-link fig-btn" data-fig="${esc(fig)}" data-cap="${esc(pie || "")}">${UI.figuraOriginal}</button>` : "";
    return `
      <figure class="chart">
        <figcaption class="chart__title"><span>${esc(g.titulo)}</span>${leyenda}</figcaption>
        <div class="chart__rows">${rows}${axis}</div>
        ${g.nota || orig ? `<p class="chart__note">${g.nota ? `<span>${esc(g.nota)}</span>` : ""}${orig}</p>` : ""}
      </figure>`;
  }

  function proyectos() {
    return S.proyectos.map((p) => {
      const code = hasUser ? `${github}/${S.repo}/tree/main/proyectos/${p.carpeta}` : "";
      const report = `proyectos/${p.carpeta}/${p.informe}`;
      const fig = p.figura ? `proyectos/${p.carpeta}/${p.figura}` : "";
      const links = `${code ? `<a ${ext(code)}>${UI.codigo} ${arrow}</a>` : ""}<a ${ext(report)}>${UI.informe} ${arrow}</a>`;
      return `
        <article class="project reveal">
          <div class="project__meta">${esc(p.anio)} · ${esc(p.contexto)} · ${esc(p.equipo)}</div>
          <div class="project__head"><h3 class="project__title">${esc(p.titulo)}</h3><div class="project__links">${links}</div></div>
          <p class="project__text">${esc(p.resumen)}</p>
          ${p.grafico ? grafico(p.grafico, fig, p.pie) : ""}
          <div class="metrics">${p.metricas.map(([v, l]) => `<div class="metric"><strong>${esc(v)}</strong><span>${esc(l)}</span></div>`).join("")}</div>
          <div class="stack">${p.stack.map((t) => `<span>${esc(t)}</span>`).join("")}</div>
        </article>`;
    }).join("");
  }

  function sideLogo(t) {
    if (t.logo === "sql") return db;
    if (t.logo) return logoImg(`assets/logos/${t.logo.includes(".") ? t.logo : t.logo + ".svg"}`, t.ini || t.nombre.slice(0, 2));
    return `<span>${esc(t.ini || t.nombre.slice(0, 2))}</span>`;
  }

  /* Columna lateral: tecnologías e idiomas con su nivel */
  function lateral() {
    const row = (logo, name, label, nivel, title, flag) => `
      <li class="skill-row" ${title ? `title="${esc(title)}"` : ""}>
        <span class="skill-row__logo${flag ? " skill-row__logo--flag" : ""}">${logo}</span>
        <span class="skill-row__name">${esc(name)}${label ? `<small>${esc(label)}</small>` : ""}</span>
        ${meter(nivel)}
      </li>`;
    const groups = S.tecnologias.map((g) => `
      <div class="side__group">
        <h3>${esc(g.grupo)}</h3>
        <ul>${g.items.map((t) => row(sideLogo(t), t.nombre, "", t.nivel, `${NIVEL[t.nivel]} · ${t.uso}`)).join("")}</ul>
      </div>`).join("");
    const idiomas = `
      <div class="side__group">
        <h3>${UI.idiomas}</h3>
        <ul>${S.idiomas.map((l) => row(`<img src="assets/flags/${esc(l.bandera)}.svg" alt="">`, l.nombre, l.etiqueta, l.nivel, "", true)).join("")}</ul>
      </div>`;
    return `
      <aside class="side reveal" aria-label="${UI.habilidades}">
        <h2 class="side__title">${UI.habilidades}</h2>
        ${groups}
        ${idiomas}
        <p class="side__legend">${NIVEL.slice(1).map((n, i) => `${i + 1} ${n}`).join(" · ")}</p>
      </aside>`;
  }

  function habilidades() {
    return S.areas.map((a, i) => `
      <div class="area">
        <button class="area__head" aria-expanded="false" aria-controls="area${i}">
          <div><div class="area__name">${esc(a.nombre)}</div><div class="area__sum">${esc(a.resumen)}</div></div>
          <span class="area__icon">${plus}</span>
        </button>
        <div class="area__panel" id="area${i}"><div><div class="area__body">
          <p>${esc(a.detalle)}</p>
          <div class="chips">${a.metodos.map((m) => `<span class="chip">${esc(m)}</span>`).join("")}</div>
        </div></div></div>
      </div>`).join("");
  }

  function contacto() {
    const p = S.perfil;
    return `
      <a class="contact__mail" href="mailto:${esc(p.email)}">${esc(p.email)}</a>
      <div class="contact__links">
        <a ${ext(p.linkedin)}>LinkedIn ${arrow}</a>
        ${github ? `<a ${ext(github)}>GitHub ${arrow}</a>` : ""}
        ${cvLinks(p)}
      </div>`;
  }

  const footer = () => `
    <footer class="footer">
      <span>© ${new Date().getFullYear()} ${esc(S.perfil.nombre)}</span>
      <a href="${page === "inicio" ? "fotos.html" : "index.html"}">${page === "inicio" ? `${UI.fotos} →` : `← ${UI.volver}`}</a>
    </footer>`;

  /* Arte generativo y demos interactivas en los márgenes (solo pantallas anchas) */
  const ARTE = [
    { demo: "lorenz", lado: "left", top: 2, ar: "9 / 10" },
    { svg: "red-neuronal", lado: "right", top: 14, w: 300, h: 620 },
    { svg: "clusters", lado: "left", top: 33, w: 300, h: 560 },
    { demo: "knn", lado: "right", top: 43, ar: "1 / 1" },
    { demo: "orbitas", lado: "left", top: 63, ar: "9 / 10" },
    { svg: "ridgeline", lado: "right", top: 72, w: 300, h: 600 }
  ];
  const arte = () => `
    <div class="art" aria-hidden="true">${ARTE.map((a, i) => a.svg
      ? `<span class="art__piece art__piece--${a.lado}" style="top:${a.top}%;aspect-ratio:${a.w}/${a.h};-webkit-mask-image:url('assets/art/${a.svg}.svg');mask-image:url('assets/art/${a.svg}.svg');--d:${i}"></span>`
      : `<div class="demo art__piece--${a.lado}" data-demo="${a.demo}" style="top:${a.top}%;--d:${i}">
           <canvas style="aspect-ratio:${a.ar}"></canvas>
           <div class="demo__cap"><span>${UI.demos[a.demo]}</span>${a.demo === "knn" ? `<span class="demo__btns"><button type="button" data-k>k = 5</button><button type="button" data-reset>${UI.demos.borrar}</button></span>` : ""}</div>
         </div>`).join("")}
    </div>`;

  function renderInicio() {
    $("#app").innerHTML = `
      ${hero()}
      <div class="page">
      ${arte()}
      <div class="wrap">
        <div class="layout">
          <div class="main">
            ${section("formacion", UI.formacion, "", formacion())}
            ${section("experiencia", UI.experiencia, "", experiencia())}
            ${section("proyectos", UI.proyectos, UI.proyectosNota, proyectos())}
            ${section("habilidades", UI.conocimientos, UI.conocimientosNota, habilidades())}
          </div>
          ${lateral()}
        </div>
        ${section("contacto", UI.contacto, "", contacto())}
        ${footer()}
      </div>
      </div>`;

    cargarFondo();
    if (window.initDemos) window.initDemos();
    figuras();

    $$(".area__head").forEach((b) => b.addEventListener("click", () => {
      const a = b.closest(".area");
      const open = !a.classList.contains("is-open");
      a.classList.toggle("is-open", open);
      b.setAttribute("aria-expanded", open);
    }));

    // Sección activa en la cabecera
    const links = $$(".nav a[href^='#']");
    const secs = $$(".section");
    const spy = () => {
      const y = window.scrollY + 140;
      let cur = "";
      secs.forEach((s) => { if (s.offsetTop <= y) cur = s.id; });
      links.forEach((l) => l.classList.toggle("is-active", l.getAttribute("href") === `#${cur}`));
    };
    window.addEventListener("scroll", spy, { passive: true });
    spy();

    // Muestra "Descargar CV" solo si el PDF existe
    if (location.protocol.startsWith("http")) {
      $$(".cv-link").forEach((a) => fetch(a.dataset.src, { method: "HEAD" }).then((r) => { if (r.ok) a.hidden = false; }).catch(() => {}));
    }
  }

  /* Visor a pantalla completa para las figuras de los proyectos */
  function figuras() {
    const lb = document.createElement("div");
    lb.className = "lightbox lightbox--fig"; lb.hidden = true;
    document.body.appendChild(lb);
    const hide = () => { lb.classList.remove("is-open"); setTimeout(() => (lb.hidden = true), 250); };
    document.addEventListener("click", (e) => {
      const b = e.target.closest(".fig-btn");
      if (b) {
        lb.innerHTML = `<figure style="margin:0"><img src="${esc(b.dataset.fig)}" alt="">${b.dataset.cap ? `<p>${esc(b.dataset.cap)}</p>` : ""}</figure>`;
        lb.hidden = false; requestAnimationFrame(() => lb.classList.add("is-open"));
      } else if (e.target.closest(".lightbox--fig")) hide();
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !lb.hidden) hide(); });
  }

  /* ---------- Página de fotografía ---------- */
  function renderFotos() {
    const f = S.fotos;
    $("#app").innerHTML = `
      <div class="wrap">
        <div class="gallery-head"><h1>${UI.fotos}</h1><p>${UI.fotosSub}</p></div>
        ${f.length
          ? `<div class="gallery">${f.map((x, i) => `
              <figure class="shot" data-i="${i}">
                <img src="${esc(x.src)}" alt="${esc(x.titulo || "")}" loading="lazy">
                ${x.titulo || x.lugar ? `<figcaption>${esc(x.titulo)}${x.lugar ? ` · ${esc(x.lugar)}` : ""}</figcaption>` : ""}
              </figure>`).join("")}</div>`
          : `<p class="empty">${UI.fotosVacio}</p>`}
        ${footer()}
      </div>`;

    const lb = document.createElement("div");
    lb.className = "lightbox"; lb.hidden = true;
    document.body.appendChild(lb);
    let idx = 0;
    const show = (i) => {
      idx = (i + f.length) % f.length;
      const x = f[idx];
      lb.innerHTML = `<figure style="margin:0"><img src="${esc(x.src)}" alt="${esc(x.titulo || "")}">${x.titulo || x.lugar ? `<p>${esc(x.titulo)}${x.lugar ? ` · ${esc(x.lugar)}` : ""}</p>` : ""}</figure>`;
      lb.hidden = false;
      requestAnimationFrame(() => lb.classList.add("is-open"));
    };
    const hide = () => { lb.classList.remove("is-open"); setTimeout(() => (lb.hidden = true), 250); };
    document.addEventListener("click", (e) => {
      const s = e.target.closest(".shot");
      if (s) show(+s.dataset.i);
      else if (e.target.closest(".lightbox")) hide();
    });
    document.addEventListener("keydown", (e) => {
      if (lb.hidden) return;
      if (e.key === "Escape") hide();
      if (e.key === "ArrowRight") show(idx + 1);
      if (e.key === "ArrowLeft") show(idx - 1);
    });
  }

  /* ---------- Arranque ---------- */
  topbar();
  page === "fotos" ? renderFotos() : renderInicio();
  window.dispatchEvent(new Event("scroll"));

  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
  }), { threshold: 0.1 });
  $$(".reveal").forEach((el) => io.observe(el));
})();
