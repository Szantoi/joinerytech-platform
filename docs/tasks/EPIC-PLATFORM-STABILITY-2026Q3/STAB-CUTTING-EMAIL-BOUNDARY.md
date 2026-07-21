# STAB-CUTTING-EMAIL-BOUNDARY — fail-fast címvalidáció és determinisztikus SMTP-kapu

- **Szerep:** backend/integration
- **Prioritás:** P0
- **Státusz:** done — root (Claude subagent) adversarial review PASS, mergelve
  (`spaceos-modules-cutting@f39d3ea`), platform-pin frissítve
- **Függőség:** nincs; fájlszinten elkülönül a többi Cutting stabilitási sávtól
- **Mutációs határ:**
  `src/spaceos-modules-cutting/src/SpaceOS.Modules.Cutting.Infrastructure/Services/EmailService.cs`,
  új belső SMTP sender seam ugyanebben a mappában,
  `tests/SpaceOS.Modules.Cutting.Tests/Infrastructure/Services/EmailServiceTests.cs`,
  ez a task, az epic index és a Cutting teszt-runbook
- **Tiltott scope:** publikus `IEmailService` signature, quote endpoint/FSM,
  tenantfeloldás, template redesign, SMTP providercsere, deploy

## Cél

Az email infrastruktúra az alkalmazás meglévő internetes email-kontraktusával
azonosan, SMTP-kapcsolat előtt utasítsa el a hibás recipient címet. A unit teszt
ne érje el a valódi Brevo szolgáltatást, hanem megfigyelhető belső transport-seamen
bizonyítsa a felépített üzenetet és a hibakezelést.

## Gyökérok és szerződés

`MimeKit.MailboxAddress.Parse` az RFC mailbox szintaxis részeként elfogadja a
domain nélküli `user` local-partot. A JoineryTech publikus DTO ezzel szemben
`[EmailAddress]` és FluentValidation `.EmailAddress()` szabályt használ, tehát a
modul szerződése internetes cím (`local@domain`). A parser implicit viselkedése
nem írhatja felül ezt az alkalmazásszintű döntést.

A jelenlegi tesztek további hibája, hogy valid címnél közvetlenül a
`smtp-relay.brevo.com` végpontot hívják teszt-jelszóval, majd bármilyen hálózati
exceptiont sikernek tekintenek. Ez lassú, környezetfüggő és nem bizonyítja az
üzenet tartalmát.

## Megvalósítás

1. Az `EmailService` recipient validációja használja a modulban már alkalmazott
   `EmailAddressAttribute` szerződést, majd csak siker esetén a MimeKit parsert.
2. Adj belső `ISmtpMessageSender` seamet és MailKit production adaptert.
3. A publikus, kétparaméteres DI-konstruktor maradjon változatlan; a tesztek az
   `InternalsVisibleTo`-n keresztül belső recording fake sendert injektáljanak.
4. A valid request teszt két konkrét üzenetet, az approve/reject egy-egy üzenetet
   ellenőrizzen; transport-hiba logolva és változatlanul továbbdobva maradjon.
5. Hibás címnél `FormatException` keletkezzen és a sender 0 hívást kapjon.

## Tesztterv

```powershell
dotnet test tests/SpaceOS.Modules.Cutting.Tests/SpaceOS.Modules.Cutting.Tests.csproj `
  --filter "FullyQualifiedName~Infrastructure.Services.EmailServiceTests" `
  -m:1 -p:BuildInParallel=false

dotnet test tests/SpaceOS.Modules.Cutting.Tests/SpaceOS.Modules.Cutting.Tests.csproj `
  --no-build -m:1 -p:BuildInParallel=false

dotnet build SpaceOS.Modules.Cutting.sln --no-restore `
  -m:1 -p:BuildInParallel=false
```

## Elfogadási kritériumok

- [x] Célzott EmailService suite 12/12 zöld, külső hálózat nélkül.
- [x] `invalid-email`, `@example.com`, `user@`, `user` fail-fast `FormatException`.
- [x] Hibás recipient esetén az SMTP sender nem fut le.
- [x] Valid quote request két, approve/reject egy-egy üzenetet ad át a sendernek.
- [x] Sender exception logolva és azonos exceptionként továbbdobva marad.
- [x] A publikus `IEmailService` és DI-konstruktor kompatibilis marad.
- [x] A teljes suite két hibával javul; buildben nincs új warning.

## Stop / eszkaláció

Ha a platform nem internetes címet, hanem RFC local mailboxot is támogatni akar,
az alkalmazás DTO-validátorait és a kézbesítési policyt együtt kell ADR-ben
módosítani. A unit tesztbe valódi SMTP credential vagy hálózati fallback nem kerülhet.

## Baseline

- Célzott Windows futás: **10/12 zöld, 2 hiba**, idő: 11 s.
- A `user` és `invalid-email` címeknél `FormatException` helyett Brevo
  `AuthenticationException` érkezett, tehát a kód külső hálózatig jutott.
- Teljes suite a subprocess portability fix után: **1041/1050 zöld, 9 hiba**.

## Átadási bizonyíték

- Célzott suite: **12/12 zöld**, baseline 10/12; futási idő kb. 11 s-ről
  **0,36 s**-ra csökkent, külső SMTP nélkül.
- A teszt első red iterációjában a Moq nem tudott internal interface proxy-t
  készíteni. A production assembly további megnyitása helyett kézzel írt,
  recording fake sender készült a tesztben.
- Teljes Cutting suite: **1043/1050 zöld, 7 hiba**; pontosan a két EmailService
  kontraktushiba szűnt meg, csak a QuoteRequest integration csoport maradt.
- Solution build: **sikeres, 0 hiba, 1 meglévő NU1902 warning** (`MailKit` 4.9.0).
- A MailKit adapter minden küldéshez saját `SmtpClient` lifecycle-t használ,
  sikeres küldés után disconnectel, exceptionnél dispose-ol.
- Nyitott, taskon kívüli security adósság: a MailKit sérülékeny verziójának
  frissítése és a HTML-template dinamikus értékeinek kontextushelyes kódolása.

## Független review-kérés

A reviewer ellenőrizze az alkalmazás-validátorral egyező címkontraktust, a
production MailKit adapter lifecycle-ját, a recording fake assertionöket és a
publikus konstruktor kompatibilitását. Commit, pin és deploy csak review után.
