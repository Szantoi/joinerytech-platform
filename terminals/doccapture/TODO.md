# DOC-CAPTURE Terminal TODO

> **Frissítve:** 2026-07-29 este (root hozta létre)
> **Részletes állapot:** [`STATE.md`](STATE.md) · **Epic:** `docs/tasks/EPIC-DOC-CAPTURE-2026Q3/README.md`

## P0 — az első futásnál, kód előtt

- [ ] **Olvasd el a `CLAUDE.md`-t végig** — különösen a „forrás-repók szabályai"
      szakaszt. Azok Gábor munka közben hozott döntései, nem javaslatok.
- [ ] **`doorstar-instance/terminals/import-discovery`** — `state.md` és
      `memory.md`. Ez a terminál **már fut**, és élő bevezetési tapasztalatot
      gyűjt. Ne kezdj tervezni előtte.
- [ ] `QUALITY.md` + `ADR-067` (modul-katalógus, `spaceos.*` semlegesség).
- [ ] `AGENT-CHANNEL.md` **eleje** („Nyitott szálak") és **vége**.
- [ ] A két forrás-projekt README/CLAUDE.md-je (`Bevetelezes`, `tartalom_mentes`).

## Blokkolva — Gábor-kapura vár

- [ ] **G4 (adatvédelem)** — mehet-e a számla külső LLM-szolgáltatáshoz, vagy a
      Vision-fázis csak helyben futhat. **Ez dönti el a motor telepítési
      alakját**, ezért minden szelet előtt kell.
- [ ] **G1** a számla-kinyerés gazdája · **G2** LLM-határ ADR · **G3** a
      jóváhagyási hurok felülete · **G5** licenc-határ.

## Szeletek (a kapuk után, sorrendben)

- [ ] **DC-00** — három repó, CI, verziózás, és a **szótár-őr első naptól**
      (márka, iparági és ügyfélnév tilos a motorban).
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
