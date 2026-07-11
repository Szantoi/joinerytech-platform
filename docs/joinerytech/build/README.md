# build/ — előfordított JSX (a Portal gyors betöltése)

A fő `JoineryTech Portal.html` **nem** futásidőben Babellel fordít: minden `.jsx`
forrás előfordítva itt él `build/<név>.js` néven, `(function(){ ... })();`
wrapperben (ez adja vissza a Babel-standalone fájlonkénti scope-izolációját —
a fájlok továbbra is CSAK `window.*` exporton át látják egymást).

**A `.jsx` forrás az igazság — a build/*.js AUTO-GENERATED, soha ne szerkeszd kézzel.**

## Újrafordítás (bármely .jsx szerkesztése után KÖTELEZŐ)

run_script-tel (a 30s keret miatt egyszerre legfeljebb ~15 fájl):

```js
const resp = await fetch("https://unpkg.com/@babel/standalone@7.29.0/babel.min.js");
(0, eval)(await resp.text());
const FILES = ["page-xyz.jsx"]; // a MÓDOSÍTOTT fájlok
for (const f of FILES) {
  const src = await readFile(f);
  const out = Babel.transform(src, { presets: [["react"]], sourceType: "script" }).code;
  await saveFile("build/" + f.replace(/\.jsx$/, ".js"),
    "/* AUTO-GENERATED from " + f + " — NE SZERKESZD, a forrás a .jsx! */\n(function(){\n" + out + "\n})();\n");
}
```

Utána cache-bust: a fő HTML-ben a `build/x.js?v=N` paramétert bumpold (a dev
HTML-ben a `x.jsx?v=N`-t, ha ott is hivatkozott).

## Fájl-leltár

- `build/files.json` — a buildelt jsx-ek listája (a HTML script-tagjeiből generálva).
- Új `.jsx` fájlnál: fordítás + script-tag MINDKÉT HTML-be
  (fő: `<script src="build/x.js?v=1"></script>`,
  dev: `<script type="text/babel" src="x.jsx?v=1"></script>`) + vedd fel a files.json-ba.
- A sima `.js` fájlok (`data-*.js`, `*-engine.js`, `margin-util.js`, `image-slot.js`)
  közvetlenül töltődnek, NEM részei a buildnek.

## app-main.jsx + TWEAK_DEFAULTS

Az App-gyökér + világ-router a HTML-ből `app-main.jsx`-be lett kiemelve.
A Tweaks **`TWEAK_DEFAULTS` (EDITMODE-blokk) a fő HTML-ben maradt**
(`window.TWEAK_DEFAULTS` sima scriptben) — a direct-edit/knobs így továbbra is
a HTML-t írja; az `app-main.jsx` csak olvassa.

## Dev változat

`JoineryTech Portal -dev-.html` — Babel futásidőben fordít (~30s betöltés),
build nélkül mindig a friss forrást futtatja. Gyors iterációhoz / build-gyanú
ellenőrzéséhez. A kanonikus EDITMODE-blokk a FŐ HTML-é.
