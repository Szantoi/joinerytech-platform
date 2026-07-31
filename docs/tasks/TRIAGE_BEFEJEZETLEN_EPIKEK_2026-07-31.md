# Befejezetlen epicek — triázs (root, 2026-07-31)

> **Kiváltó ok:** Gábor jelzése — „a tasks mappában van csomó befejezetlen epik".
> **Mérés:** a kanonikus `EPICS.yaml` minden task-sora + a 8 task-mappa fájllistája
> gépi összevetéssel (a szkript a session-scratchpadben futott, az eredmény ide van
> rögzítve). **A task-doksik státusz-sora nem hiteles** — a számok a yaml-ból jönnek.

## Összkép

| Epic | done | nyitott | Verdikt |
|---|---|---|---|
| EPIC-UI-PORTAL | 27/30 | 3 changes_requested | ⚠ **önellentmondás**: az epic `done`, de 3 designer-review nyitva — verifikációs szelet kiadva (ld. lent) |
| EPIC-UI-WORLDS | 16/18 | 1 CR + 1 pending | a warehouse designer-review **07-28 óta indítható és áll** — ma kiadva a designernek |
| EPIC-PLATFORM-STABILITY | 15/29 | 14 | a legnagyobb nyitott tömeg — bontása lent |
| EPIC-PROJECT-CORE | 3/3 | 0 | ✅ **LEZÁRVA MA** — a stop-feltétel tételesen teljesül (audit ✓ · ADR-068 Accepted ✓ · egy igazság-forrás ✓ · végrehajtó taskok kiadva: B2B-lánc fut) |
| EPIC-ERP-SEPARATION | 7/14 | 7 | ⚠ 5 ismert státusz-eltérés yaml↔doksi (gazda kell) — triázs-kör a Codex-szel |
| EPIC-B2B-COLLABORATION | 5/15 | 10 | a 7 `changes_requested` (B2B-01..08) a **REAUDIT ELŐTTI** körből való; a REAUDIT az F0–F8 táblát tette normatívvá → **tételes megfeleltetés kell**, nem csendes zárás (root-task, felvéve) |
| EPIC-PRODUCTION-PLANNING | 3/5 | 2 | egészséges: PLAN-03 M5 fut, PLAN-04 jogosan blocked (ERPSEP-05) |
| EPIC-DOC-CAPTURE | 4/10 | 6 | ma reggel került a kanonikus forrásba; DC-01a fut, a blokkolók Gábor-kapun |

## A PLATFORM-STABILITY 14 nyitott tételének bontása

| Csoport | Tételek | Állapot |
|---|---|---|
| **Kész munka, kapura vár** | STAB-RLS-WORKER-BYPASS (`review_requested`) | a javítás kódban kész, a telepítés (**ALTER ROLE … NOBYPASSRLS** + SECURITY DEFINER migrációk) a Gábor-lista 3. tétele |
| **Részben teljesült** | STAB-CI-DOTNET-GATE (`open`) | 2026-07-30 óta él a `secret-scan` + `dotnet-build-gate`; a maradék (PAT a kernelhez, teszt-kapu Dockerrel) a Gábor-lista 4. tétele |
| **Codex-sáv (cutting + platform)** | 6 cutting-task + STAB-PLATFORM-NUGET / ASPNET22 / EHS-advisories | a Codex a Doorstar-szigetre váltott 07-28-án — **kérdés Gábornak: ki viszi tovább?** |
| **Szellem-doksik** | STAB-HTTP-ERROR-REDACTION · STAB-KONTROLLING-PORTFOLIO-INDEX · STAB-MODULE-AUDIT-IDENTITY | untracked fájlok, 0 yaml-sor — a Codexnek kétszer jelezve; amíg nem commitolja, nem létező munkaként viselkednek |
| **Infra-döntés** | STAB-KEYCLOAK-POSTGRES-MIGRATION · STAB-NEXUS-CREDENTIAL-RBAC | az első Gábor/infra-döntés; a második a Nexus-projekté (jelzés kiment) |

## Szellem-doksik (aktív fájl yaml-sor nélkül) — rendezve

| Doksi | Rendezés |
|---|---|
| `DC-01-TERV-2026-07-30.md` | nem task, hanem terv-doksi — a DC1 milestone note hivatkozza; rendben |
| 3× Codex STAB-doksi | ld. fent — Codex-jelzés áll |
| `EHS-WIZARD-HU.md` | **yaml-sorba felvéve** (blocked): a fejlesztés kész és mergelt, kizárólag Gábor **manuális mobil+desktop+dark QA-ja** hiányzik |
| `PORTALUI-PUBLISH-DOORSTAR.md` | **yaml-sorba felvéve** (blocked): APPROVED végrehajtás, az `npm publish` Gábor-kapu |

## Ma kiadott/elvégzett rendezések

1. **EPIC-PROJECT-CORE lezárva** (minden task done, stop-feltétel tételesen teljesül).
2. **EHS-WIZARD-HU + PORTALUI-PUBLISH** regisztrálva a kanonikus forrásba (mindkettő Gábor-kapun áll, nem elfelejtett munka).
3. **WORLDS-WAREHOUSE-REVIEW kiadva a designernek** (07-28 óta állt indíthatóan).
4. **Portál 3 nyitott designer-review** (F1, F2-CRM, F2-EHS — 07-14-i leletek): verifikációs XS kiadva a frontendnek — tételes megfeleltetés a mai fán, hogy a 7/7 APPROVED óta melyik lelet javult meg ténylegesen; ami nem, az nevesített maradék.
5. **Root-task felvéve:** B2B-01..08 tételes megfeleltetése a REAUDIT F0–F8 fázisaira (melyiket fedi le a B2B-10 lánc, melyik marad önálló követelés).

## Gábor döntését kérő tételek (a root-TODO sürgősségi listáján)

- A **Codex-sáv gazdátlan platform-taskjai** (6 cutting + 3 platform-security): ki viszi tovább — visszakerül a Codexhez, vagy a backend-sáv kapja a B2B-10 után?
- **EHS-WIZARD-HU manuális QA** (mobil+desktop+dark) — egyetlen emberi ellenőrzés választja el a zárástól.
- A többi kapu-tétel változatlanul a TODO sürgősségi listáján (PIN-backdoor, kulcs-visszavonások, NOBYPASSRLS-telepítés, CI-hatókör, npm publish, licenc-blokkoló, betűtípus, PyMuPDF, objektum-tár).
