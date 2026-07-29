# ROOT Terminal TODO

> **Frissítve:** 2026-07-28 este Europe/Budapest
> **Részletes állapot:** [`state.md`](state.md)
> **Kanonikus task-státusz:** [`EPICS.yaml`](../../EPICS.yaml)
> **Koordináció:** [`AGENT-CHANNEL.md`](../../AGENT-CHANNEL.md)

## P0 — minden session elején

- [ ] A két **Monitor** újraélesítése (platform-mailboxok+csatorna, ill.
      Doorstar-outboxok) — a sessionnel együtt halnak.
- [ ] `AGENT-CHANNEL.md` vég + `git status` + a terminál-outboxok
      (backend/frontend/federation) átnézése — mi jött a kiesés alatt.
- [ ] Más ágens fájlhatárának tiszteletben tartása (scheduling-repo =
      backend; gating-fájlok = Codex).

## Várt bejövő események (review/kézbesítés)

- [ ] **backend M4** szelet-sorozat review_requested-jei (CP-SAT adapter jön);
      M4-mérföldkő-review a végén. Bemenetlista a state-ben.
- [ ] **backend sandbox-provisioning** terve — a VPS-lépéseknél Gábor-kaput
      kérni; a base URL/demo-bérlő/token federation-kézbesítése a Doorstarnak.
- [x] ~~Codex world-gating review~~ — **CHANGES REQUESTED 2026-07-29**
      (1 P1: a szerep-alapú szűkítés eltűnt → Gábor: metszetként visszaállítandó,
      Joiner-teszttel; 2 P2). Root-mérés: 5 fájl / 23 PASS. Javítás vissza vár.
- [x] ~~Backend M4/2, M4/3, M4/4~~ — **APPROVED 2026-07-29** (root-mérés 379 zöld
      saját gépen; az M4/2 validator-utókövetése lezárva). Kapu a mérföldkőhöz:
      **zöld CI kell** az M4/3+M4/4-re (ma nincs pusholva).
- [ ] **Frontend M3-bekötés** (pending/error, `useApi` additív `isPending`) —
      `review_requested`, ez a következő a soromban.
- [ ] **B2B-10 F1** három szeletének `review_requested`-jei (M4 után).
- [ ] **Codex ERPSEP-06** DevelopmentIdentityOptions.EnabledModules szelet
      (root-támogatással, 2 kikötéssel — hosting-javaslat) + a maintenance-
      bootstrap/Instance-Context OpenAPI külön szelet review-kérése.
- [ ] **Doorstar** válaszok: reviewer-kijelölés, standard-verzióváltás-példa,
      overload-példa, naptár-jóváhagyás.

## Kiadható, ha sáv szabadul

- [x] ~~**B2B-10 F1**~~ — **KIADVA 2026-07-29** (task-doksi +
      backend inbox 011, a 010-es elő-kiírást váltja). Indulás az M4
      mérföldkő-review APPROVED-ja után; 3 szeletben várom vissza.
- [ ] **CatalogPanel handleDuplicate** előzetes lint-hibái (frontend, külön
      tiszta szelet — a frontend felajánlotta).
- [ ] **DS-RECONCILE** (designer, pending) — design-system spec-igazítás.
- [ ] **WORLDS-WAREHOUSE-REVIEW** designer re-review (a FIX/GATE done után
      indítható).

## Gábor-kapuk (emberi döntés/művelet)

- [ ] scheduling-sandbox VPS-provisioning (Tailnet-only, dedikált KC-kliens).
- [ ] STAB-KEYCLOAK-POSTGRES-MIGRATION (az éles KC H2-n fut — Doorstar-
      élesítés előtt rendezendő).
- [ ] Doorstar kontraktus-reviewer kijelölése.

## Állandó szabályok

1. Done/APPROVED csak root-review. review_requested a bejövő protokoll.
2. Nincs `git add -A` vegyes fán; taskonkénti fájllista, más sáv érintetlen.
3. VPS/éles migráció/credential csak Gábor-jóváhagyással.
4. Hash-pin + verzió-fegyelem: csomag/fixture tartalmi változás = verzió-emelés
   (ma kétszer fogott mutable-verziót — hosting preview.1, input-pack v1).
