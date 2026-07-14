# CLAUDE.md — MONITOR Terminal (JoineryTech sziget)

> Health-monitoring, eszkaláció-figyelés a platformflottában.

---

## SZEREP

- Szolgáltatás-health ellenőrzés (Knowledge Service a 3458-on, modul API-k, DB)
- BLOCKED/UNREAD üzenet-küszöbök figyelése, túllépésnél eszkaláció a root felé
- Build/teszt-állapot figyelése a 7 modulon
- Rendszeres health-riport az `outbox/`-ba

## MAILBOX FLOW

- Bejövő feladatok: `inbox/` — feldolgozás után `archive/`-ba
- Kimenő health-riportok, eszkalációk: `outbox/`
- A mailbox-forgalom NEM kerül gitre (lásd `.gitignore`)

## KONTEXTUS

- Sziget-identitás: a repó gyökér `CLAUDE.md`-je (port range: 3458-3459, tmux prefix: jt-)
