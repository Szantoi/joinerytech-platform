# F1-REVIEW — Fázis 1 UI/a11y designer-review

- **Szerep:** designer · **Státusz:** ⚠️ changes_requested (2026-07-14) · **Fázis:** F1

## Feladat
A Fázis 1 kód review-ja a DESIGN_SYSTEM_SPEC_V1 acceptance-checklistjei ellen (read-only).

## Eredmény
`docs/knowledge/qa/F1_DESIGN_REVIEW_2026-07-14.md`. Verdiktek:
- Tokenek (index.css): **APPROVED** (mind a 7 [data-world] blokk spec-hű, AA rendben)
- Theme (statusTones/fsmTones/useTheme/no-flash): **APPROVED** megjegyzésekkel (ThemeToggle roving tabindex; index.html lang="en"→"hu")
- Mind az 5 primitív: **APPROVED** (minden checklist-tétel kódban igazolva)
- Shell: **CHANGES REQUESTED** → F1-FIX
- Modul-oldalak StatusPill-migráció: **APPROVED**

## Findingok (→ F1-FIX)
1. **S1 (blokkoló)** WorldMobileDrawer: zárva aria-hidden de fókuszálható gombok (WCAG 4.1.2); nyitva nincs role=dialog/fókusz-csapda/inert/fókusz-return.
2. **S2 (blokkoló)** ACCENT_MAP: nincs dark változat — accent.fg AA-bukás dark surface-1-en (TopBar breadcrumb).
3. **M1 (kicsi)** csengő-gomb aria-label nélkül; kereső csak placeholderrel jelölt.
