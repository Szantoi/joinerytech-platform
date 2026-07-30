# STAB-NEXUS-SHELL-HARDENING — a knowledge-service maradék shell-interpolációi

> ## ✅ LEZÁRVA ÉS ARCHIVÁLVA — 2026-07-30 (root)
>
> **APPROVED** 2026-07-29 (root-review). A sessionStarter shell-injekciós felülete lezárva, és a szivárgás-kapu ugyanabban a körben élesítve. Commit: `0b1743d`.
>
> *Archiválás a `docs/tasks/<EPIC>/archive/` konvenció szerint. Az alábbi eredeti
> szöveg a lezárás pillanatában érvényes állapotot tükrözi — a benne lévő*
> *„Státusz" sor a munka közbeni állapot, nem a végső verdikt.*

- **Szerep:** Codex
- **Méret:** M
- **Előzmény:** a Codex 2026-07-29-i P0/P1 security-auditja. A P0-t (hitelesítetlen
  `/api/session` + injekció a `startSession`-ben) a root javította — platform:
  `09e2984`, nexus-dev: `220e5ab`. **Ez a task a maradékot zárja.**
- **Státusz:** review_requested (2026-07-29)

## Miért van még dolgunk

A P0-javítás a `sessionManager.startSession` útját egyenesítette ki
(`execFileSync` argv-vel + `isValidModelId`), és a routert auth mögé tette. A
`sessionStarter.ts` viszont **érintetlen**, és ugyanazt a mintát viszi:

```ts
// 1008. és 1183. sor — a model interpolálva, idézőjelek között
await execAsync(`tmux -S ${TMUX_SOCKET} send-keys -t ${sessionName} "claude --model ${model}" Enter`);

// 468. és 475. sor — a send-keys utótag interpolálva
execSync(`tmux -S ${TMUX_SOCKET} send-keys -t ${sessionName} ${cmdSuffix}`, { timeout: 5000 });

// 436. és 445. sor — maga a parancs interpolálva
return execSync(`tmux -S ${TMUX_SOCKET} ${command} -t ${sessionName}`, { ... });
```

A router-auth ezeket **a hálózat felől** lezárja, tehát ma nem P0 — de egy
injektálható parancssort nem egy jogosultság-ellenőrzésnek kell egyedül vinnie,
és a `sessionName`/`command`/`cmdSuffix` értékek több úton is beérkeznek.

## Tartalom

1. **`sessionStarter.ts`: minden `tmux`-hívás argv-alapúra** (`execFileSync` /
   `execFile`), a `sessionManager.ts` mintája szerint. Ahol a `model` szerepel,
   ott a **közös** `isValidModelId` használandó — ne szülessen második ábécé.
2. **Ahol az interpoláció nem kerülhető el**, mondd ki a kommentben, miért
   biztonságos (pl. az érték allowlistelt konstans), vagy validáld.
3. **Az `execSync('sleep …')` hívások** cseréje `await`-elt timerre — nem
   biztonsági kérdés, de minden `sleep` egy fölösleges shell-indítás egy
   szinkron blokkoló hívásban.
4. **A megengedő biztonsági teszt szigorítása.** A `session.test.ts` így szól:

   ```ts
   // Session start may require auth (401) or reject without fromTerminal (400)
   // Both are valid security behaviors
   expect([400, 401, 403]).toContain(res.status);
   ```

   **Ez a megengedő állítás engedte elbújni a P0-t** — zöld maradt akkor is,
   amikor a végpont hitelesítetlen volt. Kösd ki **egy** viselkedést:
   hitelesítetlen hívás → 401. Ha a dev fail-open ág (`NODE_ENV=development` +
   `MCP_ALLOW_INSECURE_DEV_AUTH=true`) miatt többféle lehet, a teszt a
   **környezetet** rögzítse, ne a halmazt tágítsa.

## Határok — tulajdonosi kérdés (Gábor tisztázása, 2026-07-29)

- **A Nexust saját projekt fejleszti** — a mi dolgunk a **jelzés**, nem a
  fejlesztés. Kódvonalak: a **`nexus-dev` a legaktuálisabb**, a **`nexus-core`
  a kiadott példányt** tartalmazza (abból fut a VPS-en a `nexus-ks`).
- **Ez a task a platform-repó másolatára szól**
  (`src/joinerytech-nexus/knowledge-service`) — az a mi fánk része.
- Ha ugyanez a lelet a Nexus kódvonalán is érvényes, **jelezd** (csatorna /
  federation), és **hagyd, hogy a Nexus-projekt vigye**. Idegen repóban
  destruktív parancs (`reset --hard`, force-push) semmilyen indokkal nem fér bele.
- Az éles `nexus-ks` **deploy nem a mi hatáskörünk**.
- A `/api/session` auth-kapuhoz **ne nyúlj** — az kész, tesztelt (`09e2984`).

## Kapuk

Célzott vitest **mért darabszámmal**, `tsc --noEmit` tiszta, build zöld.
Forrás-szintű regressziós őr a mintára (a `sessionCommandInjection.test.ts`
mintája szerint: a veszély szintaktikai tulajdonság, akkor is, ha az aktuális
bemenetek ártalmatlanok). `review_requested`; done/APPROVED csak root-review.

## Kivitelezés — Codex (2026-07-29)

- Mindkét kódvonal `sessionStarter.ts` fájljában minden tmux-hívás
  `execFile`/`execFileSync` argumentumtömböt kap. A `tmuxSendKeys` már nem
  shell-idézést vagy `cmdSuffix`-et épít: a literál szöveg, az Enter és az
  opciók elkülönített argv-elem.
- A három Telegram `curl` hívás is argv-alapú lett. A `sessionStarter`-ben
  nincs `execSync` vagy `execAsync` shell-hívás.
- A hat korábbi `sleep` shell-folyamat awaitelt `setTimeout`-ra cserélődött;
  az injektálási útvonal aszinkron lett, minden hívója awaitel.
- A cold- és work-session indulás ugyanazt a `sessionManager.isValidModelId`
  validátort használja. A `/api/session` auth-kapu változatlan.
- A megengedő auth-teszt helyett a hitelesítetlen `POST /api/session/start`
  kizárólag 401-et fogad el. A forrásőr mindkét belépési pont validátorhívását,
  az argv-hívásokat és a shelles regresszió hiányát pineli.

**Mért kapuk**

| Kódvonal | Forrásőr | Build / `tsc --noEmit` | Mechanikus ellenőrzés |
|---|---:|---:|---|
| platform `src/joinerytech-nexus/knowledge-service` | 7/7 PASS | PASS / PASS | 0 shell `exec*`, 18 tmux argv-hívás, 2 model-validálás |
| `C:\Users\szant\Documents\Development\nexus-dev\knowledge-service` | 6/6 PASS | PASS / PASS | 0 shell `exec*`, 18 tmux argv-hívás, 2 model-validálás |

`git diff --check` mindkét célzott háromfájlos változatra tiszta. Az élő smoke
(`nexus-dev`, `test:smoke ...session.test.ts`) **nem mérhető**: a
`localhost:3456` nem hallgat, a 17/17 teszt `ECONNREFUSED`-dal állt meg, így a
szigorított 401-es szerződést futó szolgáltatáson még külön ellenőrizni kell.
Deploy, VPS-művelet, credential nem történt.

**Tulajdonosi megjegyzés:** a munka közben érkezett Gábor-döntés szerint a
`nexus-dev` a Nexus saját projektjének aktuális kódvonala. Az ottani azonos
változás már elkészült a kiírás szerinti párhuzamos scope-ban; további módosítás
nem történik, a Nexus-tulajdonosnak átadandó.
