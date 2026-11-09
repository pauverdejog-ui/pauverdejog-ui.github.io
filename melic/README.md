# 🐕 Passejades del Melic

App web (PWA) para apuntar quién saca a pasear al Melic. Se instala en el móvil con «Añadir a pantalla de inicio», se aloja gratis en GitHub Pages y los datos se comparten entre Pau, Rita, Mama y Papa a través de Firebase Firestore (gratis).

Sin configurar Firebase funciona en **modo prueba** (los datos solo se guardan en ese móvil), así que puedes probarla primero.

---

## 1. Crear la base de datos (Firebase) · ~10 min

1. Entra en <https://console.firebase.google.com> con tu cuenta de Google → **Crear un proyecto** (por ejemplo `melic`). Puedes desactivar Google Analytics.
2. Menú izquierdo → **Compilación → Authentication → Comenzar** → pestaña *Método de acceso* → activa **Anónimo** → Guardar.
3. Menú izquierdo → **Compilación → Firestore Database → Crear base de datos**
   - Ubicación: `eur3 (europe-west)` o cualquiera de Europa.
   - Empieza en **modo de producción**.
4. Dentro de Firestore → pestaña **Reglas** → borra lo que haya, pega el contenido del archivo `firestore.rules` → **Publicar**.
5. Rueda dentada ⚙️ → **Configuración del proyecto** → abajo, en *Tus apps*, pulsa el icono **`</>`** (Web) → ponle un nombre → **Registrar app** (no hace falta Firebase Hosting).
6. Te enseña un bloque `const firebaseConfig = { apiKey: "...", ... }`. Copia esos valores dentro de `config.js`.

> La `apiKey` de Firebase no es secreta: es normal que esté en la web. La protección la ponen las reglas de `firestore.rules` (solo se aceptan registros con los 4 nombres y minutos entre 1 y 300).

## 2. Publicar en GitHub Pages · ~5 min

1. En GitHub → **New repository** → nombre p. ej. `melic` → público → Create.
2. **Add file → Upload files** → arrastra todo el contenido de esta carpeta (incluida la carpeta `icons`) → Commit.
3. **Settings → Pages** → *Source*: `Deploy from a branch` → Branch `main` / `(root)` → Save.
4. En 1–2 minutos estará en `https://TU-USUARIO.github.io/melic/`.

## 3. Instalar en los móviles

- **iPhone (Safari):** abre la URL → botón Compartir → **Añadir a pantalla de inicio**.
- **Android (Chrome):** abre la URL → menú ⋮ → **Instalar app** / **Añadir a pantalla de inicio**.

Cada uno elige su nombre la primera vez (se puede cambiar tocando el nombre arriba a la derecha).

---

## Cómo funciona

- **Botón grande:** apunta una salida con la hora actual. Los minutos son opcionales (botones rápidos o campo «Altres»).
- **Ranking:** semana (desde el lunes), mes o año, ordenado por número de salidas o por minutos.
- **Aviso:** si hace más de 8 h que nadie lo ha sacado, la última salida se pone en rojo.
- **Historial:** con ✕ se borra un registro apuntado por error.
- **Sin cobertura:** puedes apuntar igualmente; se sube solo cuando vuelve la conexión.

## Cambiar cosas

- Si modificas archivos, sube el número de `VERSIO` en `sw.js` (`melic-v2`, …) para que los móviles cojan la nueva versión.
- Para cambiar nombres hay que tocar `PERSONES` en `index.html` **y** la lista en `firestore.rules`.
