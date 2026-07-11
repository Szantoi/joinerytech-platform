// ──────────────────────────────────────────────────────────────────────────
// apakovasz-brand.js — MÁRKA réteg (ügyfelenként cserélhető)
// Apakovász / Bittó Tamás e.v. — meleg, kézműves kovász-tónusok.
// Csak adat; a CSS-változók a HTML-ben tükrözik. Lásd CORE_MAP.md §0.
// ──────────────────────────────────────────────────────────────────────────
(function () {
  window.BRAND = {
    id: 'apakovasz',
    name: 'Apakovász',
    legal: 'Bittó Tamás e.v.',
    tagline: 'Kovászos kézműves pékség',
    web: 'apakovasz.hu',
    mission: 'Hosszan érlelt kovászos kenyér és kézműves péksütemény, minden nap frissen.',
    tone: 'közvetlen', // közvetlen · meleg · kézműves
    // szín-paletta (a CSS :root változókkal párhuzamosan tartva)
    colors: {
      bg: '#F4EBDC',        // liszt-krém háttér
      surface: '#FBF6EC',   // világos tészta felület
      ink: '#2A211A',       // faszén tinta
      inkSoft: '#6B5D4F',   // halvány tinta
      line: '#E3D5C0',      // morzsa-vonal
      crust: '#8A4B2B',     // kenyérhéj-barna — elsődleges
      crustDeep: '#5E3019', // mély héj
      amber: '#C97B3C',     // aranybarna — másodlagos
      sage: '#6E7A52',      // kelt-zöld — kész/jó
      ember: '#B5462F',     // parázs-piros — sikertelen/hiány
    },
    personas: [
      { id: 'bolt', name: 'Bolti eladó', role: 'Napi várható készlet, hiányok, vevők' },
      { id: 'pek', name: 'Pék / üzem', role: 'Hajnali mise-en-place, sütő-ütemezés' },
      { id: 'vez', name: 'Tulajdonos', role: 'Rendelés-trend, alapanyag, kapacitás' },
    ],
  };
})();
