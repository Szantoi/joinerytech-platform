# STAB-CUTTING-SUBPROCESS-BOUNDS — valódi erőforrás-korlátok és megszakítás

- **Szerep:** backend/security + infra
- **Prioritás:** P0
- **Státusz:** pending — ADR/spike döntés szükséges az implementáció előtt
- **Függőség:** STAB-CUTTING-SUBPROCESS-PORTABILITY
- **Mutációs határ:** Cutting subprocess resilience réteg, célzott fixture/tests,
  szükség esetén új platform resource-governor adapter és konfiguráció
- **Tiltott scope:** shell-parancs string-összefűzés, tenant/storage szerződés,
  vendor adapterek átírása, bizonyíték nélküli best-effort security claim

## Kutatási eredmény

A `BoundedSubprocessRequest.MaxMemoryMb` productionben `512`, tesztben `64`, de
a `BoundedSubprocessRunner` jelenleg egyáltalán nem olvassa ezt a mezőt. További
két határeset:

1. az 1 MB output-határnál az olvasó kilép és nem draineli tovább a pipe-ot;
   nagy kimenetű gyermekfolyamat emiatt pipe-backpressure mellett timeoutolhat;
2. külső cancellation esetén az `OperationCanceledException` továbbmegy, de a
   process tree kill csak a belső timeout catch ágában történik, ezért árva
   gyermekfolyamat maradhat.

## Kötelező döntési pont

Az agent először ADR/spike keretben rögzítse a támogatott deployment-mátrixot és
válasszon egy bizonyítható memória-korlátozási modellt:

- Linux/Debian: cgroup v2, systemd scope vagy dokumentált `prlimit` adapter;
- Windows fejlesztés/szolgáltatás: Job Object alapú limit;
- vagy explicit külső sandbox/container felelősség, amely esetben a félrevezető
  `MaxMemoryMb` mezőt el kell távolítani, és deploy-szinten kell bizonyítani a capet.

Nem elfogadható olyan implementáció, amely a mezőt továbbra is figyelmen kívül
hagyja, miközben a típus vagy dokumentáció enforced limitet sugall.

## Megvalósítási feladatok

1. Készíts shellfüggetlen .NET subprocess fixture executable-t (`stdout`,
   `stderr`, `exit`, `sleep`, `flood`, `allocate`, `spawn-child` módokkal).
2. A streamolvasó a megtartott 1 MB után dobja el, de process-exitig drainelje a
   csatornát; az eredmény `OutputTruncated=true` legyen.
3. Külső cancellation és timeout is ölje meg a teljes process tree-t, várja meg a
   kilépést, majd tartsa meg a dokumentált cancellation/timeout szerződést.
4. Implementáld a választott resource-governor adaptert capability checkkel és
   config-vezérelt fail-closed/fail-open policyval; alapértelmezés productionben
   csak bizonyítottan biztonságos lehet.
5. Adj Linux és Windows célzott bizonyítékot; unsupported platform esetén legyen
   explicit, naplózott eredmény, ne csendes limitkihagyás.

## Elfogadási kritériumok

- [ ] 2 MB stdout/stderr folyamat timeout nélkül befejeződik; legfeljebb 1 MB
  kerül vissza, `OutputTruncated=true`.
- [ ] Timeout és külső cancellation után a fixture child PID-je sem él tovább.
- [ ] A memória-capet túllépő fixture determinisztikusan leáll vagy elutasításra
  kerül a dokumentált policy szerint.
- [ ] A normál CLI adapter happy path és strukturált argumentumtesztek zöldek.
- [ ] Linux és Windows evidence készült; buildben nincs új warning.
- [ ] ADR, runbook, konfigurációs példa és operátori hibaüzenet elkészült.

## Stop / eszkaláció

Ha a választott OS-mechanizmus emelt jogosultságot vagy nem hordozható külső
binárist igényel, az agent ne rejtse el best-effort fallback mögött. A platform
security owner döntsön a sandbox ownershipről és a támogatott deployment-mátrixról.
