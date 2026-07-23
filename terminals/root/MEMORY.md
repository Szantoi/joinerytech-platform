---

_Updated: 2026-07-14_

## EPIC-UI-PORTAL-2026Q3 (2026-07-14, 6. mentés) — CRM FE KÉSZ
CRM frontend kész az EHS-sablonra: 6 képernyő, kanban validált stage-move, LEAD_FSM (nurturing a terv szerint — backend-gap follow-up), OPP_FSM stage-valószínűségekkel, új modul-agnosztikus services/fsmGuards.ts (a services/ehs/fsm.ts migrációja rá: kis follow-up task). 60/60 + 1201/1220, build zöld. TANULSÁG: agent-elakadás oka lemezhely volt (npm cache clean → 3.87 GB). Futó: F2-CRM-REVIEW (designer) + F2-KONTROLLING-FE (slate akcent, MSW-first a spaceos-modules-kontrolling domain-kontraktusára — EAC/variance kész backend, csak host nincs). EPICS.yaml-t Gábor is szerkeszti — szinkronban tartani!

---

_Updated: 2026-07-14_

## EPIC-UI-PORTAL-2026Q3 (2026-07-14 éjjel, 7-8. mentés — OFFLINE sorban)
CRM ✅ APPROVED (re-review: mind az 5 finding kódban igazolva, 68 teszt). modules_done: [ehs, crm] — 2/7 modul teljes minőségi körrel kész. Kontrolling FE épül. VPS SSH-blokker áll (Nexus offline, jelentések pending-nexus sorban). Dokumentáció teljes: docs/tasks/EPIC-UI-PORTAL-2026Q3/ + EPICS.yaml + qa/ review-jelentések.

---

_Updated: 2026-07-18_

## PROJECT-STATE-ASSESSMENT-2026-07-18 — tudástári baseline

A teljes programállapot bizonyíték-alapú pillanatképe elkészült:
`docs/knowledge/architecture/PROJECT_STATE_ASSESSMENT_2026-07-18.md`.
A stratégiai termékmag a program → projekt → mérföldkő → FlowEpic → task
hierarchia, actor-szűrt nézetekkel és B2BHandshake-del. Ajánlott sorrend:
hosting/auth/RLS kapu → API-first production és warehouse → valós API E2E →
projekt bounded-context ADR. A `docs/joinerytech` történeti design-korpusz; az
élő státusz forrása az `EPICS.yaml`, az aktuális kurált tudásé a
`docs/knowledge`, a kivitelezési bizonyítéké a `docs/tasks`. Friss ellenőrzés:
portal build PASS; a teljes frontend suite nem zárt 15 percen belül; lint
198 error + 17 warning; VPS 11/11 service active. Részletes task-mementó:
`docs/tasks/PROJECT-STATE-ASSESSMENT-2026-07-18.md`.

---

_Updated: 2026-07-18_

## PLATFORM-TASK-BACKLOG-2026-07-18 — agent-végrehajtható feladatbontás

A projektfelmérés 3 részletes végrehajtási sávra és 19 aktív task-kártyára lett
bontva: Platform Stability (5), UI Worlds production+warehouse (12), Project Core
(2). Központi belépési pont: `docs/tasks/README.md`; élő státusz és függőségek:
`EPICS.yaml`; lezárt mementó:
`docs/tasks/archive/PLATFORM-TASK-BACKLOG-2026-07-18.md`. Minden kártyán van
forrás- és mutációs határ, tiltott scope, tesztkapu, acceptance, stop/escalate és
átadási bizonyíték. A gráf validált: 85/85 egyedi ID, hiányzó függőség és ciklus
nincs, 19/19 aktív task-fájl és kötelező szakasz rendben, helyi linkek épek. A
Project Core implementáció audit+ADR előtt tiltott, mert a Kernelben már két
projekt-réteg és működő FlowEpic/StageChain/B2BHandshake képesség van.
Preflight HEAD: `4a58e48`; átadáskor a párhuzamos ADR-059 wire-task commit miatt
a HEAD `26f6f5d` volt, a dokumentációs változások staging és commit nélkül maradtak.

---

_Updated: 2026-07-23_

## PROJECT-STATE-CHECKPOINT-2026-07-23 — leállított, visszaállítható állapot

A 2026-07-22/23-i többagent-es munka lezáró pillanatképe elkészült:
`docs/knowledge/architecture/PROJECT_STATE_CHECKPOINT_2026-07-23.md`.
A kanonikus élő státusz továbbra is `EPICS.yaml`; a rövid operátori állapot
`terminals/root/STATE.md`, a következő végrehajtási sorrend
`terminals/root/TODO.md`.

Legfontosabb folytatási védelem: a portal `1787e0b` dirty munkafája két eltérő
érettségű szeletet kever. A `RISKS-5X5-FE` frontend APPROVED (15 fájl /
145 teszt, build/lint/boundary zöld), de a backend `ValidationBehavior`
P1 miatt nem zárható. Az `EHS-WIZARD-HU` félkész és szüneteltetett; az ingest
agent megszakadt, a legutóbbi tesztátírás óta nincs teljes kapu vagy review.
Tömeges stage/commit tilos.

Biztonsági állapot: Nexus auth/RBAC lokálisan 22/22 + build APPROVED, de token-
rotáció/policy/rollout nyitott. Cutting trusted-proxy/tenant-host lokálisan
76/76 + 9/9 és clean build APPROVED, de nincs deploy, a teljes dirty fa nem
approved. A platform NuGet auditkapu APPROVED, de a teljes discoverben
117 blokkoló finding és három hiányzó runtime-forrás maradt.

Minden Codex-agent és JoineryTech Vite/Vitest folyamat leállt, a 4174-es port
zárva. Nem történt commit, push vagy deploy.
