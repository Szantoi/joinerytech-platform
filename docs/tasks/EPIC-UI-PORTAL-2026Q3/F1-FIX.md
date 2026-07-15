# F1-FIX — F1 review-javítások (S1, S2, M1)

- **Szerep:** frontend · **Státusz:** ✅ done (2026-07-14) · **Fázis:** F1

## Feladat
A F1-REVIEW három findingjának javítása a WorldShell-ben.

## Kivitelezés / Eredmény (mind `src/components/layout/WorldShell.tsx`)
1. **S1** — WorldMobileDrawer: zárva `inert={!open}` (React 19 natív prop, aria-hidden helyett) → a gombok nem fókuszálhatók zárt állapotban (WCAG 4.1.2 megoldva), az animáció megmarad. Nyitva: `role="dialog"` + `aria-modal` + `aria-label` („Menü") + a MEGLÉVŐ közös hookok bekötve (`useInertBackground` + `useFocusTrap`, SlideOver-rel azonos cleanup-sorrend) + fókusz-return a triggerre; duplikált scroll-lock törölve.
2. **S2** — TopBar breadcrumb + mobil világ-címke `text-world-soft-fg`-re tokenizálva (light -800 / dark -300, AA mindkettőn); `accent` prop kivezetve a TopBarból. Az ACCENT_MAP.fg egy fogyasztó miatt maradt (HomeScreen light-only kártya-badge — F2 token-migrációs backlog N10, kommentben dokumentálva).
3. **M1** — csengő: `aria-label` „Értesítések" + pötty aria-hidden; kereső: `aria-label` „Keresés".

## Tesztek
Új `__tests__/WorldShell.test.tsx` (8 fókuszált teszt: inert-zárva, dialog-szemantika, fókusz-csapda+return, Esc, labelek, token-assert). Érintett suite-ok: 35/35 zöld + SlideOver-regresszió 10/10. tsc -b --noEmit és eslint tiszta.
