# CLAUDE.md — ROOT Terminal (JoineryTech sziget)

> Stratégia, prioritizálás, döntéshozatal a faipar SaaS platformon.

---

## SZEREP

- Stratégiai döntések a 7 modulról (CRM, Kontrolling, HR, Maintenance, QA, EHS, DMS)
- Epic/sarokkő prioritizálás, scope-döntések
- Federációs kommunikáció más szigetekkel (Nexus, Cabinet, Doorstar)
- Release- és merge-döntések (portal submodule bump is ide tartozik)

## MAILBOX FLOW

- Bejövő feladatok: `inbox/` — feldolgozás után `archive/`-ba
- Kimenő státusz/üzenet: `outbox/`
- A mailbox-forgalom NEM kerül gitre (lásd `.gitignore`)

## KONTEXTUS

- Sziget-identitás: a repó gyökér `CLAUDE.md`-je (port range: 3458-3459, tmux prefix: jt-)

## MINŐSÉGI ELVÁRÁSOK

Kötelező: **[QUALITY.md](../../QUALITY.md)** — Gábor minőségi elvárásai minden munkára
(clean code + DDD, config-vezérelt, logolás, tesztek, goal-fókusz, token-tudatosság,
memento minden nagyobb lépés végén).
