# B2B-10 F7 — hatókör-szétválasztás a kiadás előtt (root, 2026-07-31)

> **Miért készült:** az F5 lezárásakor az F7 következett a kritikus úton, de a REAUDIT
> normatív sora egyetlen felsorolás:
> *„proof-suite: Testcontainers + non-superuser + 3-tenant + revoked-grant negatív +
> FSM Theory-mátrix + két-tenant e2e"*.
> Kiadás előtt megmértem, mennyi ebből **már leszállt** az F2/F3/F3X/F5 során — mert egy
> olyan task, aminek a 90%-a kész, kiadva **hamis munkát** könyvel el, és a valódi rést
> elrejti.
>
> **Módszer:** a `SpaceOS.Collaboration.IntegrationTests` (53 teszt, 9 osztály) és a
> `SpaceOS.Collaboration.Tests` (277 teszt) tételes átnézése a felsorolás hat eleme ellen.

## A hat elem állapota — MÉRVE

| F7-elem | Állapot | Bizonyíték |
|---|---|---|
| **Testcontainers** | ✅ **KÉSZ** | mind a 9 integrációs osztály valódi PostgreSQL-en fut (53/53) |
| **non-superuser** | ✅ **KÉSZ** | `NonSuperuserRlsFixture` (`NOSUPERUSER`/`NOBYPASSRLS`), `CollaborationRlsProofTests` (9 teszt) |
| **3-tenant** | ✅ **KÉSZ** | idegen/harmadik bérlő 4 osztályban (`AgreementConcurrencyTests`, `CollaborationEndToEndTests`, `CollaborationRlsProofTests`, `InterceptorEndToEndTests`) |
| **revoked-grant negatív** | ✅ **KÉSZ** | 3 osztály; ráadásul **lejárt** (`ExpiresAtUtc`) fixture-ökkel is |
| **FSM Theory-mátrix** | ✅ **KÉSZ** | `CollaborationAgreementFsmTests.Matrix()` — **60 cella** (állapot × átmenet × aktor), `MemberData`-val; + `DelegatedWorkPackageFsmTests` |
| **két-tenant e2e** | ✅ **KÉSZ** | `CollaborationEndToEndTests` (14 teszt) + 3 további osztály |

> ⚠ **Mérőeszköz-jegyzet:** a mátrixot elsőre `InlineData`-ra grepeltem, és **0 találatot**
> kaptam — a mátrix `MemberData`-val generált. Rossz műszerrel mért hiány nem hiány; a
> „nincs" verdiktet a második mérés cáfolta.

**Vagyis a REAUDIT F7-felsorolásából mind a hat elem leszállt** — az F2 (RLS + interceptor),
az F3/F3X (authorization, API, sorrend-bizonyíték) és az F5 (create-út, adapter) során.
Az F7 **eredeti alakjában üres**.

## Amit az F7-nek ETTŐL FÜGGETLENÜL fednie kell — a valódi rés

A felsorolás azt írta le, *milyen tesztek legyenek*. Egy release-kapunál viszont az a
kérdés, **mi maradhat észrevétlen a pilot előtt**. Négy ilyen tétel van, és egyik sem
szerepelt a REAUDIT sorában:

### R1 — ⭐ A suite-ot SEMMI nem futtatja (a legsúlyosabb)

A 277 + 53 teszt **kizárólag akkor fut, ha valaki kézzel elindítja**. A platform
`dotnet-build-gate`-je **buildel, nem tesztel**. Egy „proof-suite", amit semmi nem
futtat, ugyanaz a hibaosztály, amit a REAUDIT maga leplezett le a B2B-02-nél: *a zöld
szám nem a mai állapotról szól, hanem az utolsó kézi futásról.*

**Ez nem a backend hatásköre:** a teszt-kapu Docker-t igényel a runneren, és a
collaboration-suite egyedül **~3 perc** (a hosting/CRM/egyéb modulokkal együtt jóval
több) — **Gábor-döntés** (a CI-hatókör tétel a sürgősségi listán).

### R2 — A Kernel-függés őrizetlen (az F5/3 lelete)

Az F5/3 kimondta: a cross-tenant vonalat **a Kernel tartja, egyedül**; ha a kernel query
filtere elromlik, a mi 422-nk **csendben 201-re fordul**, és mind az 53 integrációs teszt
zöld marad (stubbal mérnek). A doc-komment figyelmeztet rá — de **figyelmeztetés nem kapu**.

**Az F7-be tartozó minimum:** kimondott, nevesített **függés-nyilatkozat** a
release-jegyzetben (a Collaboration bérlő-izolációja a Kernel query filterének
helyességén áll), plusz döntés arról, kérünk-e a kernel-suite-tól bizonyítékot erre a
tulajdonságra. **Kernel-módosítás nélkül.**

### R3 — Az idempotencia-rekordok takarítása nincs telepítve

Az F3 óta nyilvántartott, üzemeltetési tétel. Pilot előtt **ütemezés kell**, különben a
tábla korlátlanul nő. Nem kód-hiány, hanem telepítési.

### R4 — A `Collaboration:Kernel:BaseUrl` deploy-blokkoló

Az F5/2 óta: a host **el sem indul** e nélkül (szándékos fail-fast). A pilot-környezet
konfigurációja **Gábor-kapu**.

## Verdikt és javaslat

1. **Az F7-et NEM adom ki az eredeti alakjában** — a hat felsorolt eleme kész, a kiírás
   hamis munkát könyvelne el.
2. **Az F7 átdefiniálva: „pilot-készültségi kapu"**, tartalma az R1–R4, és ebből
   **kettő (R1, R4) Gábor-döntés, egy (R3) üzemeltetés, egy (R2) root/backend közös**.
   Vagyis az F7 ma **nem backend-fejlesztési feladat**.
3. **A kritikus út ezzel megváltozott:** a pilotig hátralévő fejlesztési munka nem az F7,
   hanem az **F4** (OpenAPI-artifact + drift-gate + generált kliens — ez oldja fel a
   B2B-07-et és a B2B-08-at is) és az **F6** (exchange-futómű), amennyiben a pilot
   igényli. Ezt a REAUDIT „F4/F6 párhuzamos" megjegyzése megengedi.

**Amit ez a doksi NEM állít:** hogy a leszállt tesztek elegendőek. Azt állítja, hogy a
REAUDIT F7-listája **teljesült**, és hogy a maradék kockázat máshol van, mint ahol a lista
kereste. A tesztek elégségességéről az F3X-lelet mintájára külön, mért állítás kell —
az R2 pontosan egy ilyen.
