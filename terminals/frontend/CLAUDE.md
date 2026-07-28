# CLAUDE.md — JoineryTech Frontend Terminal

> Portál-frontend fejlesztés a workspace-korszakban: React 19 + TypeScript +
> Tailwind 4, npm workspace csomagokkal (@spaceos/*, @joinerytech/*).

---

## SZEREP

- A `src/joinerytech-portal` fejlesztése: világ-képernyők, modul-csomagok,
  közös UI-primitívek (@spaceos/portal-ui), kompozíciós rétegek
- Zod-sémás API-tükrök és MSW-mockok a backend-kontraktusok szerint
  (API-first: a séma a backend forrásából, sosem kitalálva)
- Accessibility (WCAG 2.1 AA), dark mode, magyar terminológia-egység

---

## TECH STACK (2026-07-28 állapot)

- React 19 · TypeScript · Vite 8 · Tailwind 4 · TanStack Query 5 · zustand
- npm workspace: `packages/` — @spaceos/module-* (7 ERP-modul),
  @spaceos/portal-{core,ui}, @joinerytech/world-{production,warehouse}
- Teszt: Vitest 4 + Testing Library + MSW; browser-smoke:
  `npm run test:smoke:keyboard` (38 route-os H1-őr)

---

## KEMÉNY SZABÁLYOK

1. **Állapot-forrás:** `EPICS.yaml` + `docs/tasks/<EPIC>/<TASK>.md`.
2. **Mailbox:** feladat az `inbox/`-ból (feldolgozás után `archive/`),
   jelentés az `outbox/`-ba + task-doksi frissítés.
3. **Review-protokoll:** done-t és APPROVED-ot KIZÁRÓLAG a root-review
   állíthat. Te `review_requested`-et jelentesz bizonyítékokkal (teszt-számok,
   file:line, futtatott kapuk). Önjelentett done = érvénytelen.
4. **Workspace boundary-őr (eslint-ben kényszerítve):** csomag-belsőbe
   importálni tilos (publikus belépési pontok: gyökér, /mocks, /wizard);
   csomag nem importálhat az app src/-éből; relatív benyúlás a packages/ alá
   tilos.
5. **Sáv-fegyelem:** más ágens folyamatban lévő fájljaihoz NE nyúlj; minden
   feladatod fájlhatárral érkezik, és te is fájlhatárt deklarálsz az
   AGENT-CHANNEL-en, mielőtt portál-szintű fájlokhoz nyúlsz.
6. **Kapuk minden szállításnál:** célzott vitest + érintett-fájl lint 0 +
   `tsc`/build + (UI-változásnál) browser-smoke; a teljes suite 3 előtér-
   darabban fut (packages / src/components+__tests__ / src/pages+mocks+lib+hooks).
7. **Design-system:** STATUS_TONES + worldAccents a portal-ui-ból (hardcode
   szín tilos), min. 44px touch target, ARIA minden interaktív elemen,
   dark mode kötelező.

---

## KONTEXTUS-FORRÁSOK

- `docs/knowledge/architecture/MODULE_PACKAGES_PLAN_2026-07-27.md` — a
  workspace-konvenciók
- `AGENT-CHANNEL.md` — ágensek közti async koordináció (append-only,
  `## dátum — szerző` fejléc, @címzés)
- `DESIGN_SYSTEM_SPEC_V1` + portal-ui tokenek

---

_JoineryTech Frontend Terminal_

## MINŐSÉGI ELVÁRÁSOK

Kötelező: **[QUALITY.md](../../QUALITY.md)** — Gábor minőségi elvárásai minden munkára
(clean code + DDD, config-vezérelt, logolás, tesztek, goal-fókusz, token-tudatosság,
memória-mentés minden nagyobb lépés végén, agent-munka elvek).
