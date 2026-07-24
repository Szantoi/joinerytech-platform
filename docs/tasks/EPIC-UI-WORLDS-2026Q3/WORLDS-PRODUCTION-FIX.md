# WORLDS-PRODUCTION-FIX — production világ M-findingjainak javítása (review CHANGES REQUESTED)

- **Szerep:** frontend
- **Prioritás:** P1
- **Státusz:** pending
- **Függőség:** — (a `WORLDS-SHELL-FIX`-szel párhuzamosan futhat, fájl-átfedés nincs)
- **Forrás:** [`WORLDS_PRODUCTION_DESIGN_REVIEW_2026-07-24.md`](../../knowledge/qa/WORLDS_PRODUCTION_DESIGN_REVIEW_2026-07-24.md)
- **Mutációs határ:** `src/modules/production/**`, `src/pages/ProductionPage.tsx`
  + tesztjeik; kontraktus-doksi pontosítás (`WORLDS_API_CONTRACTS_2026-07-18.md`
  1.1 sor + joinery createdAt megjegyzés) és a FE-task gap-lista bővítés (G9)
  dokumentációként. Közös shell/kliens fájlokhoz NEM nyúl (az a WORLDS-SHELL-FIX).

## Findingok (a review-riport számozásával — részletek/fájl:sor ott)

| # | Finding | Fix-irány |
|---|---|---|
| M-1 | halott dash-linkek (`plans`/`executions` kulcs) | `cutting`/`machining` + smoke a célképernyő-renderre |
| M-2 | execution FSM-sértés mock 409 vs backend 422 | guardFsm 422 tömb-testtel + teszt/komment/README + doksi 1.1 |
| M-3 | placeholder-HMAC payloadok dokumentálatlan gapje | G9-tétel + api-módban gap-affordanciás disabledReason |
| M-4 | createdAt adathazugság (lista `0001-01-01`/detail UtcNow) | gap-affordancia „—"+tooltip; seed/rendezés őszintesítés |
| M-5 | totalItemCount ≠ szabásjegyzék-sor címke | `items.length` + helyes címke; seed-invariáns |
| M-6 | orders-KPI lap-szűkített számlálás | címke-őszintesítés / pageSize=100 + backend-gap jelölés |
| M-7 | quotes mobil összenyomódás | flex-wrap kártya-sor vagy gombok SlideOverbe sm alatt |
| M-8 | quotes tooltip 98px h-scroll | overflow-x-clip / szél-érzékeny tooltip-pozíció (ha Button-oldali fix kell → átadás a SHELL-FIX-be) |
| M-9 | `m.kind` nyers wire-kulcs | MILESTONE_KIND_LABELS bekötése (egysoros) |
| M-10 | dash-linkek 17px touch-zóna | chip-minta (`before:-inset-y-*`) a linkeken |
| M-11 | detail-SlideOverek hibaág nélkül | QueryGate/isError-ág + Újra mindhárom SlideOverben |
| M-12 | idővonal/mérföldkő pending=error=üres | isPending/isError szétválasztás |

N-follow-upok (nem kötelező ebben a körben, de olcsó ráérés esetén): DH-6
waste-ablak szűrés a mockban, FSM-05/DH-7 nevesített calculate-guard, FSM-06
waste-invalidálás, FSM-07 EXECUTION_ACTION_LABELS bekötés/törlés, FSM-08/STATE-6
quote isPending+currency guard, STATE-4 retry-affordancia, A11Y-4 hint láthatóvá.

## Elfogadási kritérium

- [ ] Mind a 12 M javítva VAGY tételes, indokolt root-elfogadott backlog-bejegyzés.
- [ ] Minden javításhoz regressziós teszt (különösen: dash-link célképernyő,
      422-tükör, SlideOver error-ág).
- [ ] Célzott production-suite + teljes suite + build + lint zöld.
- [ ] Fresh adversarial review a diffre.
- [ ] Re-review kör a review-riport szerint (friss screenshot + probe), riport
      verdikt frissítve.

## Végrehajtási napló

_Kitöltendő._
