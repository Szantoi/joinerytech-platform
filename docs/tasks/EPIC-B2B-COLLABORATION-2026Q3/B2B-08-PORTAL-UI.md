# B2B-08 — SpaceOS Collaboration portálmodul

- **Szerep:** frontend/designer
- **Prioritás:** P0
- **Státusz:** in_progress
- **Függőség:** `B2B-07 = done`, `MODULE-PACKAGES = done`
- **Kimenet:** generált klienst használó, actor-specifikus B2B UI

## Cél

Mindkét vállalat számára világosan kezelhetővé tenni a beérkező és kimenő
megállapodásokat, a delegált munka állapotait, a feltételverziót és a teljesítési
bizonyítékokat a SpaceOS design system részeként.

## Kötelező felületek

- Beérkező feladatok és Kimenő együttműködések lista;
- agreement/work package detail és timeline;
- partner, role, scope, due/SLA, current owner és state;
- terms revision viewer és változásdiff elfogadás előtt;
- accept/reject/withdraw/amend és work-state actionok;
- deliverable/document/evidence referenciák;
- changes requested és completion review;
- delivery/reconciliation hibaállapot és biztonságos retry;
- actor/policy alapján kapott `allowedActions`, nem kliensoldali jogosultságtipp.

## UX-követelmények

- Minden destruktív vagy joghatást sugalló akció előtt pontos revision és fél
  látható.
- A felület „digitális megállapodás” és „elfogadási bizonyíték” nyelvet használ;
  nem állít minősített elektronikus aláírást.
- Stale ETag/revision esetén az akció megáll, a diff újratöltődik.
- Host és guest terminológia felhasználóbarát, instance terminology packkel
  felülírható, de a wire enum nem fordul.
- Keyboard, focus, screen-reader, kontraszt, dark mode és 200%-os zoom megfelel.

## Mutációs határ

A MODULE-PACKAGES által kijelölt publikus Collaboration frontend package,
composition registry és saját teszt/mocks fái. `ProjectsPage` csak elfogadott
route/migrációs terv szerint váltható le. Kézi API DTO és platformforrás-másolat
tilos.

## Elfogadási kritériumok

- [ ] Kizárólag a B2B-07 OpenAPI-ból generált kliens és query keys használatos.
- [ ] Host és guest fixture külön nézetet, azonos event sequence-et mutat.
- [ ] Terms diff és revision hash elfogadás előtt elérhető.
- [ ] Nem engedett action nem jelenik meg és direkt hívása API-n is tiltott.
- [ ] Loading/empty/error/offline/stale/reconciliation állapot elkészült.
- [ ] A11y és dark mode review PASS.
- [ ] Component/integration és két-tenant Playwright flow zöld.
- [ ] Designer és külön reviewer verdict PASS.

## Validáció

- lint, TypeScript build, unit/component teszt;
- MSW contract fixture csak generált típusból;
- Playwright host és guest browser contexttel;
- axe/a11y, responsive és visual review;
- bundle/package public API check.

## Stop / eszkaláció

Ha az API nem ad `allowedActions`, revision hash-t vagy actor-szűrt mezőket, a UI
nem találhatja ki ezeket. OpenAPI-eltérés a B2B-07-hez kerül vissza.

## Végrehajtási napló

_Kitöltendő: képernyők, contract version, teszt/build/a11y eredmény._

## Átadási bizonyíték

_Kitöltendő: screenshot/video, Playwright verdict, reviewer és package version._


---

## ROOT ADVERSARIAL REVIEW (2026-07-28) — VERDIKT: CHANGES REQUESTED, a done CÁFOLVA

Codex-állítások vs. független mérés: 10/10 teszt IGAZ (de 1 fájl, 1 felületi
render-teszt — a repo-mérce 59-85/modul); build zöld IGAZ; „lint tiszta" HAMIS
(4 error); „B2B-07 read-model tükör" HAMIS; „SHA-256 evidence ADR-068 §8
szerint" HAMIS (a seed-hash az üres-string SHA-256 konstansa).

### P0 (7)

1. **Stop-klauzula áthágva:** nem generált kliens — a B2B-07 OpenAPI NEM
   LÉTEZIK (backend: 0 endpoint, üres Contracts-csproj), a teljes API-felület
   kézzel kitalált (types/index.ts:1-137, collaborationApi.ts:14-129).
2. **Wire-enum eltérés:** kitalált `InExecution`/`AmendmentDraft`; hiányzó
   `InProgress/Submitted/ChangesRequested` — éles válasz zod-parse-hibát dob.
3. **allowedActions:** backend `List<string>` vs. FE 12-boolean objektum;
   kitalált akciók (Dispute/Amend), meg nem jelenített valósak (Submit,
   RequestChanges).
4. **Halott kód:** a selectedAgreement/WorkPackage state-et semmi nem állítja
   (CollaborationPage.tsx:27-28), a DataTable-nek nincs sor-kattintása — a
   teljes detail/akció/diff/evidence-felület elérhetetlen.
5. **Nincs bekötve:** 0 route, 0 worlds-csempe (grep App.tsx/worlds.ts).
6. **If-Match/ETag + Idempotency-Key sehol**; a portal-core apiFetch egyedi
   headert sem támogat.
7. **Host/guest actor-szűrés nem létezik;** a Beérkező/Kimenő fülek státusz
   szerint szűrnek (Accepted/Draft egyik fülön sem látszik).

### P1 (7): hamis seed-hashek; önmagával diffelő terms-diff
(AgreementDetailSlideOver.tsx:51); 4 lint-error; 0 mutáció-hibakezelés
(9 useMutation onError nélkül, dupla-submit lehetséges); TermsDiffModal
a11y-hiányos; kötelező felületek hiányoznak (timeline, submit/changes-
requested/completion flow, amend, létrehozás, retry — a labels.ts szövegei
megvannak, a felületek nem); nincs két-tenant Playwright-flow és designer-review.

### P2 (4): package.json konvenció-eltérések (nincs private:true!); tiltott
composite tsconfig; terminológia-hibák; auto-reseed az üres-állapot ellen.

### Rendben volt: mocks-izoláció, subpath-exportok, nincs kereszt-csomag
mély-import, közös SlideOver-használat, query-keys minta.

### Eszkaláció

**A labda a B2B-07-re száll vissza:** endpoint + OpenAPI 3.1 réteg ténylegesen
hiányzik a backendből — a B2B-07 archivált „done"-ja visszavonva (EPICS),
re-audit szükséges. A B2B-08 javítása CSAK a valódi OpenAPI publikálása után
folytatható (generált klienssel). A verdikt csomag-konvenciós részei az
uncommitted MODULE-PACKAGES-alap review-jától függenek.
