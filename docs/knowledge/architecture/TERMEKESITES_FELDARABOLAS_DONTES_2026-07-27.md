# Termékesítés és rendszer-feldarabolás — dilemma és döntések (2026-07-27)

**Döntéshozó:** Gábor · **Rögzítette:** root
**Kontextus-előzmény:** a Doorstar elfogadta a pilotot és megrendeli a végleges
portált saját felhasználói belépéssel; Gábor más tenanteknek is értékesíteni
akarja a rendszert. Kimondott prioritás: **„a legfontosabb a termékesítés."**

---

## A dilemma

„Fel tudjuk-e darabolni a rendszert?" — három, egymással összefüggő, de eltérő
kockázatú és sebességű kérdés rejlik benne:

1. **Láthatóság-darabolás:** tudjuk-e tenanthoz kötni, hogy melyik világok
   jelenjenek meg? (Értékesítési alapkövetelmény: két ügyfél ugyanazon a
   portálon más terméket lásson.)
2. **Fizikai darabolás:** szét tudjuk-e szedni a frontend/backend monolitot
   telepíthető modul-csomagokra? (A „modul mint termék-doboz" feltétele.)
3. **Kontextus-darabolás:** külön repókba tudjuk-e tenni a darabokat, hogy az
   LLM-alapú fejlesztés kis, specializált kontextussal dolgozhasson? (Gábor
   visszatérő igénye — az ERPSEP-04/spaceos-erp-core precedens indoka.)

**A feszültség:** a leggyorsabb üzleti érték (1.) azonnal kellene, de a portál
working tree-je ezen a napon HÁROM commitolatlan párhuzamos szeletet tartalmaz
(warehouse-fix folyamatban az Antigravitynél, WORLDS-SHELL-H1 fix, login-fix —
utóbbi már commitolva). A fizikai darabolás (2.) pedig a workspace-esítéssel
MINDEN modul fájljait érinti — piszkos fára ráengedve garantált összefonódást
(entanglement) okozna; ezt a hibaosztályt a RISKS-5X5-FE/EHS-WIZARD-HU eset már
egyszer megmutatta.

**Ténymegállapítás (kódból):** a JWT `enabled_modules` claimje MÁR MA utazik és
az AuthContext parsolja — de a világ-rács nem szűr rá: minden bejelentkezett
user minden világot lát. Az ADR-067 ezt hibaként rögzítette (Kernel-allowlist
vs portal enabled_modules diszjunkt). Tehát az (1.) réteg hiányzó darabja
kicsi, jól körülhatárolt frontend-munka.

## A döntések (Gábor, 2026-07-27: „Egyetértek")

1. **ERPSEP-FE-WORLD-GATING** (új task, kiírva): tenant-kötött világ-láthatóság
   a claimből — Home-rács szűrés + route-guard + world→module térkép configból,
   **fail-closed** (üres claim → alap-csempék, sosem „minden"); legacy világok
   alapból rejtve. **Ütemezés: a WORLDS-WAREHOUSE-FIX lezárása UTÁN** (a
   világ-kulcs fájlok ütköznének).
2. **MODULE-PACKAGES két fázisban indul:**
   - **Tervezési fázis AZONNAL** (read-only agent): workspace-terv, csomag-nevek
     az ADR-067 namespace-rezsim szerint (spaceos.* / joinerytech.*), a
     MODULE-FOLDERS előfeltétel-listájának ellenőrzése a mai fán.
   - **Fizikai átalakítás CSAK tiszta portál-fán** — a warehouse-fix és a
     H1-szelet commitja után. Ez tudatos sorrend-döntés: a sebességnél
     fontosabb, hogy a workspace-esítés ne fonódjon össze futó szeletekkel.
3. **A termékesítési modell = az ADR-067 életciklus** (aznap elfogadva):
   `known → installed → entitled → enabled → usable`. Az *entitled* a Kernel
   `Tenant` mezőjében él (Gábor aznapi döntése), az aláírt katalógus + TUF
   trust root + GitHub Packages a szállítási csatorna. Új tenant felvétele
   célállapotban: tenant létrehozása + entitlement beírása → a portál magától
   a megvásárolt világ-készletet mutatja.
4. **Kontextus-darabolás iránya:** a spaceos-erp-core precedens követhető —
   amint egy modul csomag-határa stabil (a boundary-őr script zölden méri),
   kiemelhető saját repóba, és a platform csomagként fogyasztja.

## Következmények / nyitott pontok

- A world-gating a claim-et fogyasztja; a claim-oldal (Keycloak mapper,
  Tenant.EntitledModules admin-API) az ERPSEP-05/06 sáv dolga — a kettő
  találkozása az ERPSEP-06 Instance Context API-ban lesz hitelesített.
- A sorrend miatt a világ-szűrés demózhatósága a warehouse-fix sebességén
  múlik — ha az húzódik, root-döntéssel előrehozható egy szűkebb, csak
  Home-rács szintű szelet (route-guard nélkül), de ez külön mérlegelés.
- Kapcsolódó doksik: ADR-067 (életciklus + katalógus), ADR-066 (referenciák),
  ERPSEP-FE-WORLD-GATING.md, MODULE-PACKAGES.md, EPICS.yaml E2-sáv.
