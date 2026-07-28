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
- [ ] **Codex world-gating** review_requested VAGY státusz-válasz — ha
      elhúzódik, sáv-átadási javaslat Gábornak (draft kimentve).
- [ ] **Codex ERPSEP-06** DevelopmentIdentityOptions.EnabledModules szelet
      (root-támogatással, 2 kikötéssel — hosting-javaslat) + a maintenance-
      bootstrap/Instance-Context OpenAPI külön szelet review-kérése.
- [ ] **Doorstar** válaszok: reviewer-kijelölés, standard-verzióváltás-példa,
      overload-példa, naptár-jóváhagyás.

## Kiadható, ha sáv szabadul

- [ ] **B2B-10 F1** (Collaboration application-réteg, L) — a backendnek, az
      M4/M5 után (elő-kiírás megvan: backend inbox 010). F0 kész.
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
