# DOC-CAPTURE Terminal TODO

> **Frissítve:** 2026-07-29 este (a DC-00 lezárása után, doccapture terminál)
> **Részletes állapot:** [`STATE.md`](STATE.md) · **Epic:** `docs/tasks/EPIC-DOC-CAPTURE-2026Q3/README.md`

## P0 — az első futásnál, kód előtt

- [x] **Olvasd el a `CLAUDE.md`-t végig** — különösen a „forrás-repók szabályai"
      szakaszt. Azok Gábor munka közben hozott döntései, nem javaslatok.
- [x] **`doorstar-instance/terminals/import-discovery`** — `state.md` és
      `memory.md`. **Elolvasva:** a két élő szabálya (*„mértékegységet nem szabad
      feltételezni"*, *„ne használd a befoglaló mappa nevét identitásra"*)
      **megerősíti** az M14-M15 mintáinkat. Ellentmondás nem került elő.
- [x] `QUALITY.md` + `ADR-067` (modul-katalógus, `spaceos.*` semlegesség).
- [x] `AGENT-CHANNEL.md` **eleje** („Nyitott szálak") és **vége**.
- [x] A két forrás-projekt felmérve. ⚠ **Csak az élő fából szabad átemelni** —
      a `.claude/worktrees/agent-*` másolatok régebbi logikát tartalmaznak.

## Blokkolva — Gábor-kapura vár

- [ ] **G4 (adatvédelem)** — mehet-e a számla külső LLM-szolgáltatáshoz, vagy a
      Vision-fázis csak helyben futhat. **Ez dönti el a motor telepítési
      alakját**, ezért minden szelet előtt kell.
- [ ] **G1** a számla-kinyerés gazdája · **G2** LLM-határ ADR · **G3** a
      jóváhagyási hurok felülete · **G5** licenc-határ.

## Szeletek (a kapuk után, sorrendben)

- [x] **DC-00** — `review_requested` (2026-07-29). Három repó, CI, verziózás,
      szótár-őr **egy implementációval, hash-pinnel, három szabályhalmazzal**,
      és a hexagonális mag általánosított átemelése. Bizonyíték: kapu-önteszt
      8/8 + 8/8, **29 teszt zöld**, két kapu mutációval igazolva.
      **A commit a rooté** — minden darab commitolatlan.
- [ ] **DC-01b** — Excel/CSV betöltő: oszlop-térképezés + validáció, **modell
      nélkül**. Ez a leggyorsabb megtérülés.
- [ ] **DC-01** — kereshető PDF → DMS a mai ACL-lel.
- [ ] **DC-02** — Capture-kontraktus (OpenAPI 3.1 + hash-pin + generált kliens).
- [ ] **DC-03** — RAG-indexelés (`VectorStorePort` → Nexus).
- [ ] **DC-04** — bevételezés + jóváhagyási hurok. **Csak G1-G3 után**, és csak
      Gábor tapasztalat-gyűjtésének ismeretében.
- [ ] **DC-05** — kézírás.

## Állandó szabályok

1. **`done`/`APPROVED`-ot kizárólag a root-review állít.** Te
   `review_requested`-et jelentesz, **mért** bizonyítékkal (darabszám, nem „zöld").
2. **Amit nem tudtál megmérni, mondd ki** — ne tűnjön el egy összesített szám mögött.
3. **„Inkább hiány, mint téves."** Bizonytalan adatot jelölj, ne tippelj.
4. **LLM az olvasáshoz, determinisztikus szabály a könyveléshez.**
5. **Eredetik érintetlenek**; a forrásmappa csak olvasható.
6. Nincs `git add -A`; a commitot a root végzi. Idegen repóban **nincs**
   destruktív parancs.
7. **Termékdöntés a rooton át megy fel Gáborhoz**; a választ a csatornára kell írni.
8. Nagyobb lépés végén **memória-mentés** (QUALITY §5).
