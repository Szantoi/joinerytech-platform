# STAB-CUTTING-QUOTE-HARNESS — quote integration kapu és tenant fail-closed

- **Szerep:** backend/security + integration
- **Prioritás:** P0
- **Státusz:** done — root (Claude subagent) adversarial review PASS (adversarial
  ellenőrzés a tenant fail-closed és cross-tenant 404 tulajdonságokra),
  mergelve (`spaceos-modules-cutting@f39d3ea`), platform-pin frissítve
- **Függőség:** STAB-CUTTING-EMAIL-BOUNDARY implementációja lokálisan jelen van
- **Mutációs határ:** QuoteRequest API endpoint, approve/reject command és handler,
  quote repository interface/implementáció, két QuoteRequest integration teszt,
  `CuttingWebApplicationFactory`/fixture auth handler, ez a task, epic és runbook
- **Tiltott scope:** quote FSM újratervezése, email-template/SMTP, public route
  átnevezése, RLS migráció, portal, deploy, más agent fájljai

## Cél

A publikus és admin quote HTTP-szerződés valós wire-értékekkel, canonical JWT
claimmel és tenant-szűrt persistence úttal legyen bizonyított. A tesztharness ne
adjon hamis zöld eredményt hiányos request body vagy mesterséges auth miatt.

## Gyökérok-térkép

| Terület | Bizonyíték | Következmény |
|---|---|---|
| Public fixture | `MDF`/`PVC` nincs a domain enum-wire készletben | 3 validnak nevezett teszt `400` |
| Test auth | fake Bearer tokenből csak NameIdentifier készül | `tid`/`sub` hiány, admin list `401` |
| Admin request | kötelező `CustomerEmail` kimarad | approve/reject a handler előtt `400` |
| Hamis zöld | first approve is `400`, second is `400` | already-approved teszt nem bizonyít FSM-et |
| Tenant claim | endpoint csak `tenant_id`-t olvas | canonical `tid` token productionben `401` |
| Repository lookup | approve/reject csak quote ID alapján olvas | cross-tenant módosítás lehetősége |
| Result mapping | `Result.NotFound` is `400`-ra lapítva | hibás HTTP-kontraktus és existence semantics |

## Biztonsági szerződés

- `tid` az elsődleges tenant claim; `tenant_id` csak akkor fallback, ha `tid`
  nincs jelen. Hibás, de jelen lévő `tid` fail-closed, legacy fallback nélkül.
- `sub` az actor ID; hiányzó/hibás claim `401`.
- approve/reject command explicit `TenantId`-t kap a hitelesített boundaryból.
- repository lookup `TenantId + QuoteId` predikátummal történik.
- más tenant quote-ja és nem létező quote egyaránt `404`, existence leak nélkül.

## Megvalósítás

1. Javítsd a public fixture enum-wire értékeit, és DTO-deszerializálással assertálj.
2. A teszt auth handler a test-only headerből `tid`, a tokenből `sub` claimet adjon.
3. Egészítsd ki a jelenlegi admin test bodykat a még kötelező customer emaillel;
   az email ownership refaktor külön follow-up.
4. Tedd canonical/fail-closeddé az endpoint tenantfeloldását.
5. Add át a TenantId-t az approve/reject commandoknak, és szűkítsd a repository
   lekérdezést tenant + ID-ra.
6. Mapeld a NotFound application státuszt HTTP 404-re.
7. Adj cross-tenant approve/reject és malformed-`tid` + valid legacy regressziót.

## Tesztterv

```powershell
dotnet test tests/SpaceOS.Modules.Cutting.Tests/SpaceOS.Modules.Cutting.Tests.csproj `
  --filter "FullyQualifiedName~QuoteRequestEndpointTests" `
  -m:1 -p:BuildInParallel=false

dotnet test tests/SpaceOS.Modules.Cutting.Tests/SpaceOS.Modules.Cutting.Tests.csproj `
  --no-build -m:1 -p:BuildInParallel=false

dotnet build SpaceOS.Modules.Cutting.sln --no-restore `
  -m:1 -p:BuildInParallel=false
```

## Elfogadási kritériumok

- [x] Célzott quote endpoint kapu minden tesztje zöld; nincs hamis zöld FSM-teszt.
- [x] Public create valós enum-wire értékkel `200`, tenant resolver és email hívás bizonyított.
- [x] Canonical `tid` + `sub` admin list/approve/reject utat enged.
- [x] Malformed `tid` valid legacy claim mellett is `401`.
- [x] Cross-tenant approve és reject `404`, az aggregate állapota változatlan.
- [x] Nem létező quote reject/approve application NotFoundja HTTP `404`.
- [x] A teljes Cutting suite 0 hibás; buildben nincs új warning.

## Stop / eszkaláció

Ha az admin értesítési email címét az aggregate-ből kell átadni ugyanebben a
command tranzakcióban, ne adj újabb kliens által vezérelt címet a commandhoz.
Külön notification/outbox taskban kell rendezni az atomicitást és retry policyt.

## Baseline

- Célzott filter: **22/29 zöld, 7 hiba**; idő kb. 6 s.
- Teljes suite: **1043/1050 zöld, 7 hiba**.
- Az `ApproveQuote_AlreadyApproved_Returns400` látszólag zöld, de mindkét request
  model-binding `400`; az első hívás nem módosít állapotot.

## Átadási bizonyíték

- Célzott quote filter: **32/32 zöld**; baseline 22/29. Három új security teszt
  került be, ezért a tesztszám 29-ről 32-re nőtt.
- Teljes Cutting suite: **1053/1053 zöld, 0 hiba**, baseline 1043/1050.
- Solution build: **sikeres, 0 hiba, 1 meglévő NU1902 warning** (`MailKit` 4.9.0).
- A módosított legacy tesztfájlból minden `ConfigureAwait(false)` kikerült; az
  xUnit1030 warningok megszűntek.
- Tenantfeloldás: valid `tid` elsődleges; valid legacy csak canonical hiányában;
  malformed canonical + valid legacy tesztje `401`.
- Persistence: approve/reject lookup SQL/EF predikátuma `TenantId + QuoteId`;
  más tenant mindkét művelete `404`, és az aggregate `PendingReview` marad.
- NotFound application státusz approve/reject endpointon HTTP `404`; egyéb domain
  transition hiba továbbra is `400`.
- Nyitott notification adósság külön
  [`STAB-CUTTING-QUOTE-NOTIFICATION-OUTBOX`](STAB-CUTTING-QUOTE-NOTIFICATION-OUTBOX.md)
  taskba kerül; a kliens által küldött email mezőt ez a stabilitási task még nem
  távolítja el.

## Független review-kérés

A reviewer külön ellenőrizze a canonical claim prioritást, malformed-`tid`
fail-closed ágat, tenant + quote repository predikátumot, cross-tenant 404-et és
a false-positive FSM teszt valódi első transitionjét. Commit/pin/deploy csak review után.
