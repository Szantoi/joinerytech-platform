# VPS terminál-tudástár — pillanatkép (2026-07-16)

> A VPS-en (`/opt/joinerytech/terminals/*/`) élő terminál-memóriák és knowledge-desztillátumok
> másolata, Gábor kérésére. Ezek a SpaceOS/JoineryTech alapjait képező döntések és
> tapasztalatok hordozói — a lokális fejlesztés és a RAG (a `docs/knowledge`-et indexeli)
> így egyaránt látja őket.

**Forrás → fájl megfeleltetés:** `terminals/<terminál>/MEMORY.md` → `<terminál>-MEMORY.md`;
`terminals/<terminál>/knowledge/<téma>.memory.md` → `<terminál>-<téma>.memory.md`.

**Figyelem:**
- Ez **pillanatkép** — az élő állapot a VPS-en van; frissítés: `ssh joinerytech-vps` + a
  CLAUDE.md VPS-szakasza szerint.
- A knowledge-fájlok TTL-konvencióval készültek (Warm memory, 14d TTL) — az itteni másolat
  ezt nem érvényesíti, történeti értéke akkor is van, ha a VPS-en már rotálódott.
- A `/opt/nexus/data/golden-paths/` (711 rögzített task-trajektória) NEM került át —
  az koordinációs folyamat-adat, nem tudás-doksi; ha kell, a VPS-en elérhető.
