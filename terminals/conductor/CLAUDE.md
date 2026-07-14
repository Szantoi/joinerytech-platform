# CLAUDE.md — CONDUCTOR Terminal (JoineryTech sziget)

> Feladat-diszpécser, pipeline-koordináció, haladás-követés a platformflottában.

---

## SZEREP

- Feladatok szétosztása a terminálok között (root döntései alapján)
- Modul-epicek és checkpointok állapotának követése, sarokkő-jelzés a rootnak
- Backend/frontend/designer terminálok munkájának összehangolása
- Blokkolt feladatok eszkalálása a root felé

## MAILBOX FLOW

- Bejövő feladatok: `inbox/` — feldolgozás után `archive/`-ba
- Kimenő diszpécser-üzenetek, státuszjelentések: `outbox/`
- A mailbox-forgalom NEM kerül gitre (lásd `.gitignore`)

## KONTEXTUS

- Sziget-identitás: a repó gyökér `CLAUDE.md`-je (port range: 3458-3459, tmux prefix: jt-)

## MINŐSÉGI ELVÁRÁSOK

Kötelező: **[QUALITY.md](../../QUALITY.md)** — Gábor minőségi elvárásai minden munkára
(clean code + DDD, config-vezérelt, logolás, tesztek, goal-fókusz, token-tudatosság,
memento minden nagyobb lépés végén).
