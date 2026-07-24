# WORLDS-SHELL-FIX — közös shell/kliens javítások a production-review S/M findingjaiból

- **Szerep:** frontend
- **Prioritás:** P0 (S-szintű a11y-blokkolót tartalmaz)
- **Státusz:** pending
- **Forrás:** [`WORLDS_PRODUCTION_DESIGN_REVIEW_2026-07-24.md`](../../knowledge/qa/WORLDS_PRODUCTION_DESIGN_REVIEW_2026-07-24.md)
- **Mutációs határ:** `src/components/ui/**` (SlideOver, useFocusTrap,
  useInertBackground, Toast, Button-tooltip), `src/components/layout/WorldShell.tsx`,
  `src/services/apiClient.ts` + tesztek. **FIGYELEM: mind a 7 APPROVED
  modul-világ közös kódja — teljes portál-suite + célzott regresszió kötelező.**

## Findingok (a review-riport számozásával)

1. **S-1 (A11Y-1):** `useFocusTrap` a `display:none` mobil „Vissza" gombra fókuszál
   desktopon → billentyűzet-holtpont MINDEN SlideOverben. Fix: `getFocusable()`
   láthatóság-szűrés (`checkVisibility`/`offsetParent`), konténer-fallback
   (`tabIndex=-1`); Playwright billentyűzet-smoke (jsdom-ban nem fogható).
2. **M-S1 (WPR-DS-01):** WorldShell topbar 768px-en ~165px oldal-túlcsordulás.
   Fix: zsugorítható jobb klaszter vagy desktop-topbar md→lg.
3. **M-S2 (A11Y-2):** toast live-regionok inertek nyitott SlideOver alatt.
   Fix: toast-root az inert-walk skip-listáján vagy portál megkímélt node-ba.
4. **M-S3 (FSM-02/STATE-1):** `parseErrorMessage` nem érti a ValidationErrors-tömb
   (+ `{errors:[]}`/`{validationErrors}`) hibatesteket → guard-üzenetek elvesznek.
   Fix: tömb-ág + üres-statusText fallback (`HTTP <status>`) + kontraktus-teszt.

## Elfogadási kritérium

- [ ] Playwright (vagy egyenértékű browser-szintű) smoke: SlideOver nyitás
      Enterrel → Tab eléri az összes vezérlőt → Escape → fókusz a triggeren;
      desktop ÉS mobil viewporton.
- [ ] 768px-en nincs dokumentum-szintű vízszintes túlcsordulás egyik világban sem.
- [ ] Toast role=status/alert nyitott SlideOver mellett is az accessibility
      tree-ben (probe vagy teszt bizonyítja).
- [ ] apiClient hibatest-alak tesztek: tömb / errors[] / validationErrors /
      üres statusText → mind értelmes üzenet.
- [ ] Teljes portál-suite zöld + build + lint 0 hiba; a 7 modul-világ
      screenshot-szúrópróbája változatlan (regresszió-kör).
- [ ] Fresh adversarial review a diffre.

## Stop / eszkaláció

A 7 APPROVED világ vizuális viselkedése nem változhat a javított hibákon túl.
Ha a fókuszcsapda-fix bármely meglévő SlideOver-tesztet másképp tör, előbb a
teszt szándékát kell tisztázni, nem a tesztet igazítani.

## Végrehajtási napló

_Kitöltendő._
