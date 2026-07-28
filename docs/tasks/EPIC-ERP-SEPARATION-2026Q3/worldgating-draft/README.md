# ERPSEP-FE-WORLD-GATING — kimentett draft (2026-07-28)

A MODULE-PACKAGES commitolatlan fájából a root által LEVÁLASZTOTT world-gating
kezdemény (végrehajtója ismeretlen — a workspace-körrel keverve érkezett, a
terv R6 tiltása ellenére). NEM review-zott, NEM commitolt kód — a
ERPSEP-FE-WORLD-GATING task végrehajtójának referencia-bemenet:

- `worldAccess.ts` — world→ModuleId térkép + visibleWorlds/isWorldEnabled
  (fail-closed) — jó kiindulás, de a WORLD_MODULES térkép teljességét a
  worlds.ts regiszterrel szemben tételesen kell bizonyítani.
- `gating-ui.patch` — HomeScreen (role-alapú → modul-alapú szűrés) és
  RequireAuth (route-guard) diff. FIGYELEM: a patch a src-lokális
  RequireAuth-ra készült; a fa azóta a @spaceos/portal-core RequireAuth-ot
  használja — a gating-et VAGY a portal-core RequireAuth-ba kell tenni
  injektált worldAccess-szel (a térkép kompozíciós adat, app-oldali), VAGY
  egy app-oldali wrapper-be.
- Hiányzik a draftból: tesztek (a gating fail-closed ága ELTÖRTE a meglévő
  HomeScreen/App-teszteket — mock-claim nélkül üres rács), i18n (a tiltó
  képernyő szövege hardcode), és a legacy világok alapból-rejtése döntés.
