# SpaceOS UX Design Principles

> **Státusz:** Érvényes | **Frissítve:** 2026-06-30
> **Érvényesség:** Az összes SpaceOS UI fejlesztésre (Portal, Datahaven, JoineryTech)

---

## Core Elvek

### 1. Mobile-First, Egykezes Használat

A gyártási környezetben a felhasználók gyakran egy kézzel dolgoznak (másikban szerszám, alkatrész).

**Szabályok:**
- Minden UI tervezése **mobil nézetből indul**, majd bővül desktop-ra
- Egykezes használhatóság: fontos gombok a **hüvelykujj zónájában** (képernyő alsó harmada)
- Touch target: **minimum 44×44px** (Apple HIG / Material Design szabvány)
- Swipe gestures ahol releváns (kártyák lapozása, listák görgése)
- Kerüld a hover-only interakciókat (mobilon nincs hover)

**Hüvelykujj Zóna:**
```
┌─────────────────────┐
│                     │  ← Nehezen elérhető
│                     │
│                     │  ← Közepes
│                     │
│   ███████████████   │  ← Könnyen elérhető (CTA-k ide)
│   ███████████████   │
└─────────────────────┘
```

---

### 2. PC Felület: Informatív, De Nem Zsúfolt

Desktop verzió **bővíti** a mobilt, nem duplikálja vagy zsúfolja.

**Szabályok:**
- Több adat látható, de **hierarchiával** szervezve
- Sidebar/panel layout megengedett, de mindig **egy fő akció** per képernyő
- Data-dense layout csak ott, ahol a felhasználó analitikus munkát végez (dashboard, riportok)
- Whitespace használata: ne töltsd ki minden pixelt

**Desktop bővítések:**
- Side panel részleteknek (mobil: slide-over modal)
- Több oszlop (mobil: egy oszlop, scroll)
- Keyboard shortcut-ok (mobil: nincs)

---

### 3. Single-Screen Focus

**"Csak az jelenjen meg, ami az aktuális munkához kell."**

**Szabályok:**
- Progresszív felfedés (progressive disclosure): részletek elrejtve, kattintásra megjelennek
- Context-aware UI: a felhasználó **szerepe és feladata** határozza meg a tartalmat
- Minimális kognitív terhelés: max 7±2 elem egyszerre látható
- Kerüld a "dashboard syndrome"-ot: ne mutass mindent egyszerre

**Példák:**
| Rossz | Jó |
|-------|-----|
| 20 KPI egy oldalon | 6 KPI + "Részletek" gomb |
| Minden projekt látható | Szűrt lista + keresés |
| Minden gomb egyszerre | Context menu, több lépéses flow |

---

### 4. Dark-First, Ipari Esztétika

A gyártási környezetben a sötét téma kevésbé fárasztja a szemet.

**Szabályok:**
- **Sötét téma alapértelmezett** (light theme opcionális)
- Magas kontraszt a kritikus információkhoz (fehér szöveg sötét háttéren)
- Státusz színek egyértelműek:
  - ✅ Zöld: OK, sikeres, online
  - ⚠️ Sárga/Narancs: Figyelmeztetés, várakozik
  - ❌ Piros: Hiba, kritikus, offline

**Color Contrast:**
- WCAG 2.1 AA minimum: 4.5:1 normál szöveg, 3:1 nagy szöveg
- Ipari környezet: inkább magasabb kontraszt

---

### 5. Arculat Konzisztencia

**Szabályok:**
- Design tokenek használata (nem hard-coded értékek)
  - `var(--color-primary)` ✅
  - `#2563eb` ❌
- Komponens újrafelhasználás: Button, Card, Input ugyanúgy néz ki mindenhol
- Egységes ikonográfia (egy icon set, nem keverés)
- Egységes tipográfia (font family, sizes, weights)

**Design Token Példa:**
```css
:root {
  --bg-primary: #0f1419;
  --text-primary: #e7e9ea;
  --accent-blue: #1d9bf0;
  --status-success: #00ba7c;
  --status-warning: #ffd400;
  --status-error: #f4212e;
}
```

---

## Checklist UI Review-hoz

### Mobile-First
- [ ] Touch target ≥ 44×44px minden interaktív elemre
- [ ] Fontos CTA-k a képernyő alsó harmadában
- [ ] Nincs hover-only interakció
- [ ] Responsive breakpoints: 480px, 768px, 1200px

### Single-Screen Focus
- [ ] Max 7±2 fő elem látható egyszerre
- [ ] Részletek elrejtve, kattintásra megjelennek
- [ ] Nincs felesleges információ az aktuális feladathoz

### Dark Theme
- [ ] WCAG 2.1 AA kontraszt (4.5:1)
- [ ] Státusz színek egyértelműek
- [ ] Sötét téma alapértelmezett

### Konzisztencia
- [ ] Design tokenek használata (nincs hard-coded szín)
- [ ] Komponensek újrafelhasználva (Button, Card, stb.)
- [ ] Egységes ikonográfia

---

## Referenciák

- **JoineryTech UI minták:** `docs/joinerytech/ui.jsx`
- **Design System:** `terminals/designer/outbox/2026-06-30_014_datahaven-design-system-done.md`
- **Apple Human Interface Guidelines:** Mobile-first, touch targets
- **Material Design 3:** Accessibility, color contrast
- **WCAG 2.1:** Accessibility szabványok
