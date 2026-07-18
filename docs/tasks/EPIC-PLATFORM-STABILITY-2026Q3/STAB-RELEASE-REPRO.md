# STAB-RELEASE-REPRO — tiszta clone, health és deploy bizonyíték

- **Szerep:** infra/monitor
- **Prioritás:** P1
- **Státusz:** pending
- **Függőség:** `STAB-RLS-PROOF`, `STAB-EHS-INTEGRATION`,
  `STAB-TESTCONTAINERS-HYGIENE`, `STAB-FE-TEST-GATE`
- **Mutációs határ:** `.gitmodules`, dokumentáció, read-only/safe smoke script,
  health endpointok külön jóváhagyott kis diffben
- **Tiltott scope:** secret commit, automatikus production deploy, hiányzó repo
  URL kitalálása, service restart bizonyíték nélkül

## Cél

Egy új checkoutból reprodukálható legyen a build/test, és a deploy utáni smoke
egységesen ellenőrizze a health contractot és a service MainPID↔listener egyezést.

## Megvalósítás

1. Leltározd a három mapping nélküli gitlinket:
   `joinerytech-keycloak-theme`, `spaceos-modules-identity`,
   `spaceos-modules-sales`. URL-t csak meglévő remote/VPS bizonyítékból vegyél.
2. Készíts tiszta ideiglenes clone-smoke eljárást; a felhasználó munkafáját ne
   töröld vagy reseteld.
3. Egységesítsd és dokumentáld a szolgáltatás health contractot:
   `/health/live` process-liveness, `/health/ready` függőségek; legacy `/health`
   vagy `/healthz` kompatibilitás dokumentált maradhat.
4. Készíts safe PowerShell/bash smoke scriptet, amely nem deployol: service
   státusz, várt port, health HTTP kód, systemd MainPID és listener PID.
5. Ellenőrizd a Keycloak audience/redirect előfeltételeket, de secretet és tokent
   ne írj ki.
6. Kimenetként adj reprodukálhatósági jelentést és külön, jóváhagyásra váró
   deploy-parancslistát.

## Tesztterv

```powershell
git submodule status
git submodule foreach --recursive 'git status --short'
# a task által létrehozott clone-smoke és VPS read-only smoke pontos parancsa
```

## Elfogadási kritériumok

- [ ] `git submodule status` nem áll le mapping hibával.
- [ ] Tiszta clone-ból dokumentált build/test parancs elindul.
- [ ] Minden HTTP service-hez van live/ready mapping vagy explicit kivétel.
- [ ] Smoke riportban service, MainPID, port/PID és HTTP kód szerepel.
- [ ] Nincs secret, token, automatikus deploy vagy restart.

## Stop / eszkaláció

- Nem létező GitHub repo esetén ne inventálj URL-t; dokumentáld a döntést.
- Health endpoint mutáció több submodule-t érint: külön file-lock és review kell.
- VPS deploy/restart csak root jóváhagyással.

## Végrehajtási napló

_Kitöltendő._

## Átadási bizonyíték

_Kitöltendő._

