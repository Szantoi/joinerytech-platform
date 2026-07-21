# STAB-CUTTING-EMAIL-HARDENING — csomag-, konfiguráció- és template-biztonság

- **Szerep:** backend/security
- **Prioritás:** P0
- **Státusz:** in_progress — MailKit runtime upgrade kész, template/options kapu nyitott
- **Függőség:** STAB-CUTTING-EMAIL-BOUNDARY review/merge
- **Mutációs határ:** Cutting Infrastructure MailKit csomag, EmailService,
  SMTP adapter/options, template unit tesztek, dependency és operátori runbook
- **Tiltott scope:** valódi SMTP credential a tesztben, nyers user input HTML-be,
  nem ellenőrzött csomagverzió, platform-wide secret manager újratervezése

## Kutatási eredmény

- A build `NU1902` figyelmeztetést ad a `MailKit 4.9.0` ismert közepes
  sérülékenységére.
- A HTML template-ek több dinamikus mezőt nyersen interpolálnak (`reason`,
  customer email, quote number, URL), ezért nincs kontextushelyes output encoding.
- Az SMTP port `int.Parse`, a from cím és host konstrukciókor nincs egységes,
  névvel ellátott options-validáción átvezetve.

## Megvalósítási feladatok

1. Hivatalos advisory és MailKit release note alapján válassz kompatibilis,
   javított verziót; lock/restore/build/security scan bizonyíték kötelező.
2. Szöveges mezőket `HtmlEncoder`-rel, URL attribútumokat validált `https` URI +
   attribútumkódolással renderelj; tiltott scheme (`javascript:`, `data:`) fail-closed.
3. Vezess be typed email options-t startup validationnel: host, 1..65535 port,
   internetes from cím, nem üres username/secret reference, timeout.
4. A secret érték soha ne kerüljön exceptionbe, logba vagy options dumpba.
5. Adj injection regressziókat minden dinamikus template mezőre és invalid URL-re;
   a hálózatmentes recording sender kapu maradjon.

## Elfogadási kritériumok

- [x] `MailKit 4.16.0`: restore/build nem ad MailKit/MimeKit advisory warningot;
  Cutting runtime projektek vulnerability auditja tiszta.
- [ ] Nyers `<`, `>`, `&`, idézőjel és script-scheme nem jelenik meg végrehajtható
  HTML/attribútum tartalomként.
- [ ] Hibás SMTP/from/URL config startupkor névvel ellátott validation hibát ad.
- [ ] Secret/log redaction tesztelt.
- [ ] Email unit suite külső hálózat nélkül zöld; solution build és teljes suite zöld.

## Stop / eszkaláció

Ha a javított MailKit verzió breaking API-váltást vagy runtime TLS-változást hoz,
ne suppresszáld az advisoryt. Külön kompatibilitási spike és staging SMTP smoke kell.
