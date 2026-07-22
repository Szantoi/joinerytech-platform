# scripts/

Repo-level automation scripts. Currently:

- `Invoke-DotNetTestSafe.ps1` + `TestcontainersHygiene.psm1` — safe `dotnet test`
  wrapper for Testcontainers-based suites (STAB-TESTCONTAINERS-HYGIENE). See below.
- `Invoke-DotNetTestSafe.Tests.ps1` — Pester tests for the above.
- `federation-watcher.sh` — federation inbox/outbox watcher (unrelated, pre-existing).
- `check-erp-module-boundaries.mjs` (+ `tests/`) — ERP module-boundary lint check
  (unrelated, pre-existing).

## Invoke-DotNetTestSafe.ps1 — safe Testcontainers test wrapper

### Problem it solves

Several .NET test suites in this repo (EHS Infrastructure.Tests, the hosting
RLS-proof fixtures, etc.) spin up real PostgreSQL containers via
[Testcontainers](https://dotnet.testcontainers.org/), all labeled
`org.testcontainers=true` by the library itself. If `dotnet test` crashes, is
killed, or is interrupted mid-run, the container(s) it created can be left
running forever. Naive cleanup (`docker system prune`, "remove every Postgres
container", killing everything on a well-known port, etc.) is dangerous on a
dev machine that also runs real, long-lived infrastructure — most notably the
`doorstar-production-db` container, which must never be touched by test
tooling.

`Invoke-DotNetTestSafe.ps1` runs `dotnet test` and guarantees that only
containers **created by that specific invocation** are ever removed:

1. **Preflight** — checks the Docker daemon responds within a timeout, checks
   free memory (advisory), and snapshots the IDs of every
   `org.testcontainers=true` container that already exists (any state, via
   `docker ps -a --filter "label=org.testcontainers=true" --format "{{.ID}}"`
   — always Docker's own structured filter, never parsed from the
   human-readable `docker ps` table).
2. **Run** — invokes `dotnet test <Project> <TestArgs...>` from a real
   PowerShell argument array (never a concatenated shell string), so nothing
   in `-Project`/`-TestArgs` can be interpreted as extra shell syntax. The
   script's own exit code is always the real `dotnet test` exit code.
3. **Cleanup (`finally`)** — snapshots labeled container IDs again, computes
   `post-run set - baseline set`, and removes only the IDs that are: new,
   still carry the Testcontainers label (re-checked right before removal),
   and do not match a protected container name (`doorstar-production-db` by
   default). A container whose identity/name cannot be established is left
   alone and reported, never guessed at (see "Stop/escalation rule" below).
4. **No blanket cleanup, ever.** The wrapper never calls
   `docker system prune`, never removes by name pattern, and never touches a
   container that isn't in the new+labeled+unprotected set.
5. **Machine-readable summary** — a JSON object (stdout, and optionally
   `-SummaryPath`) with duration, exit code, baseline/post-run/new/removed/
   protected/ambiguous/ignored container ID lists, and peak concurrent
   labeled-container count. No secret or environment-variable values are ever
   logged.

### Stop/escalation rule

If a "new" labeled container's name cannot be resolved (e.g. it is mid-removal
by its own Testcontainers/Ryuk reaper at exactly the wrong moment), the wrapper
does **not** delete it. It is reported in the summary's `ambiguousContainerIds`
and left alone — deletion only ever happens when ownership is unambiguous.

### Usage

```powershell
# Normal run
pwsh -File scripts/Invoke-DotNetTestSafe.ps1 `
    -Project src/spaceos-modules-hosting/tests/SpaceOS.Modules.Hosting.Tests/SpaceOS.Modules.Hosting.Tests.csproj

# Extra dotnet test arguments (always passed as a real array -- never string-concatenated)
pwsh -File scripts/Invoke-DotNetTestSafe.ps1 `
    -Project src/ehs/tests/Infrastructure.Tests/SpaceOS.Modules.Ehs.Infrastructure.Tests.csproj `
    -TestArgs '--filter', 'FullyQualifiedName~SafetyWalkCapaFlow'

# Dry run: compute the cleanup plan but do not actually call `docker rm`
pwsh -File scripts/Invoke-DotNetTestSafe.ps1 -Project <proj> -WhatIfCleanup

# Also write the JSON summary to a file (e.g. for CI artifact upload)
pwsh -File scripts/Invoke-DotNetTestSafe.ps1 -Project <proj> -SummaryPath test-run-summary.json

# Protect additional container names beyond the default doorstar-production-db
pwsh -File scripts/Invoke-DotNetTestSafe.ps1 -Project <proj> -ProtectedContainerNames doorstar-production-db, some-other-dev-db
```

Runs under Windows PowerShell 5.1 (`#requires -Version 5.1`) as well as
PowerShell 7+/`pwsh`.

### Exit codes

- The **real `dotnet test` exit code** in the normal case (this is the whole
  point of the wrapper — cleanup outcome never overrides it).
- **90** — aborted *before* any test ran: Docker preflight failed (daemon
  unresponsive), or `-FailOnLowMemory` tripped on low free memory. Nothing was
  started or touched.

### Parameters

| Parameter | Default | Meaning |
|---|---|---|
| `-Project` | *(required)* | Path to the `.csproj`/`.sln` under test |
| `-TestArgs` | `@()` | Extra `dotnet test` arguments, as an array |
| `-WhatIfCleanup` | off | Compute but don't execute the cleanup plan |
| `-ProtectedContainerNames` | `@('doorstar-production-db')` | Names that are never removed |
| `-TestcontainersLabel` | `org.testcontainers=true` | Label used for the baseline/post-run filter |
| `-MinFreeMemoryMB` | `2048` | Advisory free-memory threshold |
| `-FailOnLowMemory` | off | Turn the memory check into a hard preflight abort |
| `-DockerPreflightTimeoutSeconds` | `10` | Max wait for `docker info` to respond |
| `-ContainerPollIntervalMs` | `1000` | Sampling interval for the peak-container-count metric |
| `-SummaryPath` | *(none)* | Optional file to also write the JSON summary to |

### Testing

`scripts/Invoke-DotNetTestSafe.Tests.ps1` is a Pester test suite (Pester 5.x;
this repo had no prior Pester usage, so the pure decision logic was factored
out into `TestcontainersHygiene.psm1` specifically so it can be unit-tested
without Docker):

```powershell
Install-Module Pester -MinimumVersion 5.0 -Scope CurrentUser -Force  # if not already installed
Import-Module Pester -MinimumVersion 5.0
Invoke-Pester -Path scripts/Invoke-DotNetTestSafe.Tests.ps1 -Output Detailed
```

The suite covers:
- pre-existing vs. new container ID distinction (baseline diff correctness);
- a new-but-unlabeled container is never touched, even though it "appeared
  during the run window";
- `doorstar-production-db` is refused even in the adversarial case where it is
  hypothetically both new and labeled;
- a realistic mixed run (pre-existing orphan + new orphan + protected name +
  unrelated unlabeled container) resolves to exactly the expected single
  removal;
- the stop/escalation rule (unresolvable identity -> reported, not deleted);
- container-ID validation (rejects non-ID strings, including injection-shaped
  ones);
- a real preflight integration check (child process with a `docker`-less
  `PATH`) that the wrapper aborts with exit code 90 and never invokes `dotnet`
  when Docker is unavailable.

See `docs/tasks/EPIC-PLATFORM-STABILITY-2026Q3/STAB-TESTCONTAINERS-HYGIENE.md`
("Végrehajtási napló" / "Átadási bizonyíték") for the actual measured evidence
this was verified against real Docker Desktop and real Testcontainers runs.
