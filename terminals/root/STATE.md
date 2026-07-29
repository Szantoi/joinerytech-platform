# ROOT Terminal State

> **Frissítve:** 2026-07-29 este Europe/Budapest
> **Állapotforrás:** [`EPICS.yaml`](../../EPICS.yaml) + [`AGENT-CHANNEL.md`](../../AGENT-CHANNEL.md)
> **Koordinációs mód:** eseményvezérelt (két persistent Monitor — ld. memória
> `mailbox-monitor-orseg`; session-váltáskor újraélesítendő).

## Aktív terminál-hálózat (2026-07-29)

| Sáv | Ki | Mit csinál |
|-----|-----|-----------|
| **root** | Claude (ez) | review-kapuk, kontraktus-döntések, koordináció, commit-jog |
| **backend** | Claude | scheduling (külön repó) + DMS ACL; jön a B2B-10 F1 |
| **frontend** | Claude | portál — a mai scheduling/gating/dark-mode kör lezárva |
| **Codex** | Codex | nexus shell-hardening + CRM-lapozás (új session ma délután) |
| **Doorstar** | Codex + Gábor | `doorstar-instance` — saját C# réteg |

## A nap eredménye (2026-07-29)

**Minden bejelentett szelet átment a review-kapun, és minden verdikt mögött
saját root-mérés áll** (nem a jelentés elfogadása).

- **scheduling: M4 MÉRFÖLDKŐ APPROVED** — root-mérés **414/414** (Domain 254 /
  Solver.OrTools 26 / Infrastructure 65 / Host 50 / Integration 19). Hat szelet:
  solver-port + determinisztikus referencia · CP-SAT adapter **közös**
  conformance-készlettel · naptár-bekötés · `lagKind` · DI-választható stratégia
  · shadow-diff. A mérföldkövet **szándékosan a kontraktus-bővítés nélkül**
  zártam (külön tétel, saját kapuval) — így a **B2B-10 F1 indítható**.
- **portál:** M3-bekötés · scheduling route · F4 (strukturált ConfirmDialog) ·
  F5 (dátumválasztó) · F6+F6/2 (szerep-szótár) · világ-gating · smoke-kapu
  javítás · WorkflowPage dark mode — **mind APPROVED és commitolva**
  (portal `83b6f4b` → `ad8fd1b`, öt commit; platform `53efe8d`).
  **A közös böngésző-kapu ma először teljesen zöld.**
- **DMS ACL (Codex P1): teljes lánc zárva** — szabály → bekötés → tárolás →
  lista, négy szelet, root-mérés 108/108.
- **nexus security P0:** hitelesítetlen `/api/session` + shell-injekció javítva
  (`09e2984`), majd a maradék hardening (Codex) — a mi másolatunkban 0 shell
  `exec*`. **A Nexust saját projekt fejleszti** (Gábor): a mi dolgunk a jelzés.
- **CRM lista SQL-lapozásra** (Codex) — 123/123.
- **A csatorna tömörítve** (4155 → 560 sor), a 07-22..07-28 közti 178 bejegyzés
  bájtra változatlanul archiválva.

## Gábor mai döntései (mind végrehajtva vagy kiadva)

1. `Joiner` → `production` világ + `settings`; ugyanez az üzemi szerepekre (root).
2. Ütköző fix kezdések → a `SchedulingRequestValidator` utasítsa vissza.
3. `lagKind` additív mező — üzemi indok: ragasztás és felületkezelés, és ugyanaz
   a technológia **mindkét fajtát** adhatja (prés-idő vs. kikötés).
4. Szerep-szótár **bővül**: `production_manager`, `machine_operator`.
5. Legacy fák törlendők (megtörtént); DMS ACL fail-closed + `OwnerUserId`.
6. Kell dátumválasztó az ütemezés-képernyőre.

## Root kontraktus-döntések (2026-07-29)

- **A hash fedje a wire-tartalmat**, alapérték-kihagyással. Kikötés: a kihagyást
  teszt pinelje, és a partial-release-es tervek egyszeri hash-mozdulása
  **kimondva** menjen a Doorstarnak, konkrét előtte/utána példával.
- **A proposal dátumosítása mehet** (additív `startUtc`/`finishUtc`). Kikötés:
  azonosítható legyen, **melyik naptár-revízió alatt** oldódtak fel a dátumok.

## Nyitott

- **backend:** kontraktus-bővítési kör (1. szelet leadva, `8da898a` —
  **review vár rám**), majd M5; **B2B-10 F1 indítható**.
- **Codex:** P2 — a `/wake`, `/inject`, `/stop`, `/stop-all` tesztjein maradt
  megengedő `[200,400,401,403]` alak szigorítása; CRM lapozás-metaadat a wire-en.
- **Gábor-kapuk:** scheduling-sandbox VPS-provisioning; Keycloak Postgres-migráció.
- **Átadandó:** a `nexus-dev`-beli javítás jelzése a Nexus-projektnek.

## Újraindítási védelem

1. Először az `AGENT-CHANNEL.md` **eleje** („Nyitott szálak") és a **vége**,
   utána `EPICS.yaml`, ez a state és a `TODO.md`.
2. **A két Monitort újra kell élesíteni** (session-váltáskor halnak).
3. Friss `git status` nélkül nincs mutáció; más ágens fájlhatárát tiszteld.
4. Vegyes fán nincs `git add -A`; taskonkénti fájllista.
5. Done/APPROVED-ot KIZÁRÓLAG root-review állít.
6. **Idegen repóban destruktív parancs (`reset --hard`, force-push) nem fér bele**
   — ha vissza kell vonni, `revert`. (2026-07-29: ezt magam hágtam át.)
7. Termékdöntés **egy** csatornán megy fel Gáborhoz; a választ ki kell hirdetni.
8. VPS-művelet, éles migráció, credential csak Gábor-jóváhagyással.
9. **Review-nként commitolj, ne nap végén** — ma hat APPROVED szelet állt
   commitolatlanul, és a tiszta szétbontás elveszett.
