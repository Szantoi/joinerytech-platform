# ROOT Terminal TODO

> **Frissítve:** 2026-07-29 este Europe/Budapest
> **Részletes állapot:** [`STATE.md`](STATE.md)
> **Kanonikus task-státusz:** [`EPICS.yaml`](../../EPICS.yaml)
> **Koordináció:** [`AGENT-CHANNEL.md`](../../AGENT-CHANNEL.md) — a fájl **eleje**
> („Nyitott szálak") és a **vége** is olvasandó; a régebbi napok archívumban.

## P0 — minden session elején

- [ ] A két **Monitor** újraélesítése (platform-mailboxok+csatorna, ill.
      Doorstar-outboxok) — a sessionnel együtt halnak.
- [ ] `AGENT-CHANNEL.md` eleje+vége, `git status` mindkét repóban, és a
      terminál-outboxok átnézése — mi jött a kiesés alatt.

## Rám váró review

- [ ] **backend: kontraktus-bővítési kör 1. szelet** (`8da898a`) — leadva, még
      nem néztem meg.
- [ ] **backend: B2B-10 F1** szeletei, ha elindult (az M4-feltétel teljesült).

## Kiadva, végrehajtás alatt

- [ ] **B2B-10 F1** (backend) — Collaboration application-réteg, 3 szeletben.
- [ ] **STAB-NEXUS-SHELL-HARDENING P2** (Codex) — a `/wake`, `/inject`, `/stop`,
      `/stop-all` tesztjein maradt megengedő `[200,400,401,403]` szigorítása.
- [ ] **CRM lapozás-metaadat a wire-en** (Codex, P2) — ma a fogyasztó nem tudja
      megkülönböztetni: „ennyi van" vs. „ennyit adtam az elsőből".

## Átadandó / jelzés

- [ ] A `nexus-dev`-beli shell-injekció-javítás **jelzése a Nexus-projektnek**
      (a Nexust saját projekt fejleszti — a mi dolgunk a jelzés, nem a fejlesztés).

## Gábor-kapuk (emberi döntés/művelet)

- [ ] scheduling-sandbox VPS-provisioning (Tailnet-only, dedikált KC-kliens).
- [ ] STAB-KEYCLOAK-POSTGRES-MIGRATION (az éles KC H2-n fut).
- [ ] Doorstar kontraktus-reviewer kijelölése.
- [ ] A két üzemi szerep éles realmbe vitele (a script + profil kész, éles
      futtatás nem történt).

## Állandó szabályok

1. Done/APPROVED csak root-review, **saját méréssel** — a jelentés elfogadása
   nem review.
2. **Review-nként commitolj**, ne nap végén (ma hat szelet állt commitolatlanul).
3. Nincs `git add -A` vegyes fán; taskonkénti fájllista.
4. **Idegen repóban destruktív parancs nem fér bele** — `revert`, nem `reset --hard`.
5. Termékdöntés **egy** csatornán megy fel; a választ ki kell hirdetni.
6. VPS/éles migráció/credential csak Gábor-jóváhagyással.
7. Egy kapunál nem elég azt kérdezni, „átment-e", hanem azt is: **„mit bizonyít,
   ha átment?"** (ma négy különböző alakban tért vissza ez a hiba).
