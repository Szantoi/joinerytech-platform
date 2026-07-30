# B2B-10 F3X — a „jogosultság előbb" sorrend bizonyítása

> **Epic:** EPIC-B2B-COLLABORATION-2026Q3 · **Szülő:** B2B-10 · **Szerep:** backend
> **Méret:** XS · **Státusz:** kiadva (2026-07-30, root)
> **Előzmény:** F3/1–F3/5 mind APPROVED; ez az egyetlen tétel, ami mindből kimaradt.

## Miért van saját taskja

A tételt a root **háromszor** vitte át (F3/2 → F3/4 → F3/5 review). Egy
háromszor átvitt tétel nem szelet-maradék, hanem saját task — ezt a vezetőnek
kell kimondania, nem a végrehajtónak.

## A mérés, ami miatt nyitva van

A `CollaborationPrecondition.Verify` **a jogosultság-ellenőrzés után** fut
mindkét handlerben, és a kódban ott áll a **miért** is. De ha megfordul, semmi
nem szól:

```
R-MC3/agreement (az elofeltetel a jogosultsag ELE kerul), root-meres 2026-07-30:
  UNIT        : 226/226 ZOLD  -> tulelte
  INTEGRACIOS :  46/46  ZOLD  -> tulelte (valodi PostgreSQL, F3/5 utan)
```

**Miért nem fogja a suite** — mérve, nem feltételezve: **egyetlen E2E teszt sem
küld ÍRÁST nem-részesként.** Az
`A_tenant_outside_the_collaboration_is_answered_the_same_as_for_nothing` csak
`GET`-eket küld; az `A_stale_tag_is_refused_before_anything_is_written`
**részes** hívóval megy. A kettő nem találkozik.

⚠ **Amit a root NEM állít** (és korábban pontatlanul keretezett): hogy ez ma
aktív, kihasználható rés. Hogy az **RLS** és/vagy az **EF global query filter**
a közvetlen repository-betöltést eleve elvágja-e egy nem-részesnél, **nincs
mérve**. Ha elvágja, akkor ez a task a **sorrendet** szögezi le, nem egy aktív
rést zár — és ez is értékes, mert a védelem akkor egy *másik* rétegen áll.

## Átvételi feltételek

- [ ] E2E teszt valódi PostgreSQL-en: **nem-részes** hívó `POST` átmenetet
      **hibás `If-Match`**-csel → **404**, ne **412**.
      *(A helperek megvannak: `_api.As(_stranger, …)` + `PostAsync(…, ifMatch: 1)`.)*
- [ ] **Melyik réteg tartja a vonalat** — az F3/5 ME-módszerével megmérve és
      **kiírva**: RLS · EF-szűrő · a sorrend maga. Ha egy másik réteg fedezi,
      az legyen kimondva, ne felfedezésre várjon.
- [ ] **Negatív kontroll:** az `R-MC3/agreement` mutáció (előfeltétel a guard
      elé) ettől a teszttől **bukjon**. Enélkül a teszt nem bizonyít semmit.
- [ ] Ugyanez a **munkacsomag**-úton már mérve van (2 bukó) — ne duplikáld,
      csak hivatkozz rá.

## Amit ez a task NEM csinál

- Nem nyúl a sorrendhez: **a kód ma helyes.** Ez a mérés hiányát pótolja.
- Nem dönt az RLS hatóköréről — az F2 root-döntése áll (az RLS a **részvételt**
  szűrje, a grant az **engedélyt**).

## Kontextus

- 412 ≠ 409 ≠ 428 ≠ 400 elkülönítve az F3/3a-ban — a 412 **verzió-orákulum**
  lenne egy nem-részesnek, ezért van a sorrend így.
- A tükör-tanulság párja: a root ma a közös `NonSuperuserRlsFixture` tükrét
  kötötte az igazi interceptorhoz (`InterceptorMirrorConformanceTests`) —
  ugyanaz az alak, más rétegen.
