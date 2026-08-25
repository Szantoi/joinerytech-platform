# scripts/

Repo-level automation scripts. Currently:

- `Invoke-DotNetTestSafe.ps1` + `TestcontainersHygiene.psm1` — safe `dotnet test`
  wrapper for Testcontainers-based suites (STAB-TESTCONTAINERS-HYGIENE). See below.
- `Invoke-DotNetTestSafe.Tests.ps1` — Pester tests for the above.
- `Invoke-VpsHealthSmoke.ps1` — read-only VPS service/health smoke check
  (STAB-RELEASE-REPRO). See below.
- `Invoke-DotNetPackageAudit.ps1` — sequential, read-only NuGet vulnerability
  gate with machine-readable JSON output; explicit project list or `-Discover`
  opt-in is required. See below.
- `Invoke-KeycloakTenantOnboarding.ps1` + `KeycloakOnboarding.psm1` — **retired**
  legacy `portal-app`/`tid`/realm-role onboarding. Only explicit `-Offline`
  historical validation is allowed; every live or mutation mode fails closed
  before profile, credential, or Keycloak access. See below.
- `Invoke-KeycloakTenantOnboarding.Tests.ps1` — Pester tests for the legacy
  offline validation and its live-mode safety gate.
- `provision_doormanufacturing_keycloak_clients.py` and
  `provision_doormanufacturing_identity.py` — **retired** POSIX/Python legacy
  Door onboarding paths. Their `tid`/`enabled_modules`/realm-role model conflicts
  with nested-only authority. Only explicit historical `--offline` validation
  is allowed; all live/verify/apply/invite paths stop before profile, credential
  or network access and emit no runnable action plan. See below.
- `test_provision_doormanufacturing_keycloak_clients.py` and
  `test_provision_doormanufacturing_identity.py` — offline validation plus the
  early live-mode safety gates.
- `federation-watcher.sh` — federation inbox/outbox watcher (unrelated, pre-existing).
- `check-erp-module-boundaries.mjs` (+ `tests/`) — ERP module-boundary lint check
  (unrelated, pre-existing).

## Invoke-DotNetPackageAudit.ps1 — deterministic NuGet advisory gate

The script runs `dotnet list package --vulnerable --include-transitive`
sequentially and emits one stable JSON document. It defaults to `--no-restore`
so a normal audit does not change the package graph. A fresh restore requires
the explicit `-Restore` switch. To avoid accidental CPU/load spikes, a full
workspace scan never happens implicitly: pass `-Project`, a newline-delimited
`-ProjectListPath`, or opt in with `-Discover`. Every target and project-list
file must resolve under `-RootPath`; every target must be an existing `.csproj`.
Paths containing a junction/symlink below the trusted root are rejected, and
discovery skips dependency/generated trees such as `node_modules`, `bin`,
`obj`, `artifacts`, `dist`, `coverage` and `TestResults`.

```powershell
# One or more explicit projects; exits 1 for High/Critical findings
powershell -File scripts/Invoke-DotNetPackageAudit.ps1 `
  -Project src/ehs/src/Api/SpaceOS.Modules.Ehs.Api.csproj

# Full repository discovery, serial execution, optional CI artifact
powershell -File scripts/Invoke-DotNetPackageAudit.ps1 `
  -Discover -ProjectTimeoutSeconds 180 `
  -SummaryPath artifacts/nuget-audit.json

# Stable release-host inventory (15 deployable entry graphs)
powershell -File scripts/Invoke-DotNetPackageAudit.ps1 `
  -ProjectListPath config/nuget-release-projects.txt

# Full runtime release gate: the 15 checkout hosts plus machine-readable
# blockers for VPS services whose source is currently unavailable
powershell -File scripts/Invoke-DotNetPackageAudit.ps1 -ReleaseInventory

# Report-only run; findings remain in JSON but do not fail the gate
powershell -File scripts/Invoke-DotNetPackageAudit.ps1 `
  -Project <project.csproj> -FailOnSeverity None
```

Exit codes:

- `0`: audit completed and no finding met `-FailOnSeverity`;
- `1`: at least one finding met the configured threshold;
- `2`: invalid usage, timeout, missing project/assets, unavailable runtime-host
  source, or `dotnet` audit error.

The JSON includes per-project duration/status/findings, advisory URLs,
severity totals, blocking count, unavailable runtime-host details, restore mode
and overall status. `-ReleaseInventory` also asserts that every checked-out,
non-script `Program.cs` entrypoint is present in the release-host list; a new
unregistered host fails before audit. Raw command
output is retained only as a short diagnostic tail for failed/timeout runs, so
successful CI artifacts remain compact. Parser/threshold/quoting tests live in
`Invoke-DotNetPackageAudit.Tests.ps1` and run with Pester 5.x.

The timeout is fail-closed: on Windows PowerShell 5.1 every audit process is
assigned immediately after start to a `KILL_ON_JOB_CLOSE` Job Object; assignment
failure aborts the audit and kills the process. A child that outlives an exit-0
parent is therefore still owned and removable. Job
termination, the `taskkill /T` fallback and redirected-stream draining all have
bounded grace periods; faulted/cancelled stream tasks are capture errors.
`NU1900`
(unavailable vulnerability data), an unparsed vulnerability-shaped output row,
or incomplete redirected output is an `AuditError`, never a clean result.
Stdout always contains exactly one JSON document, including when writing the
optional summary artifact fails.

`config/nuget-release-projects.txt` is intentionally only the checked-out host
set. `config/nuget-unavailable-runtime-hosts.json` records live VPS services
whose source cannot currently be audited. The `-ReleaseInventory` convenience
gate loads both atomically and returns `Blocked`/exit 2 until that second list is
empty; running only `-ProjectListPath` must not be presented as a full-platform
release approval.

Windows PowerShell's `powershell -File` boundary does not reliably bind multiple
CLI tokens to a `string[]` parameter. Use `-ProjectListPath` for a multi-project
CI run. From an existing PowerShell session, invoke the script path directly
with an array (`& ./scripts/Invoke-DotNetPackageAudit.ps1 -Project $projects`);
the internal audit function intentionally uses a different parameter name.

## Invoke-KeycloakTenantOnboarding.ps1 — retired legacy onboarding (offline only)

> **P0 identity safety hold (2026-08-20): do not use this script to read from
> or write to Keycloak.** Its `portal-app` + generic realm-role + user-attribute
> design predates the required authoritative tenant projection, membership/version
> checks, scoped service-principal registry, and exact `azp` verification. The
> executable rejects its default, `-VerifyOnly`, and `-Apply` modes before it
> opens the profile, obtains credentials, or makes a network request. Only
> `-Offline` remains for historical contract analysis and is not activation proof.

### Historical scope

Onboarding a customer means provisioning realm roles, the `tid` and
`enabled_modules` protocol mappers, the realm's unmanaged-attribute policy, the
user with its claim attributes and role mapping, and the Kernel tenant record.
This was done **by hand** on 2026-07-27 and every step is a silent-failure trap:
a missing realm role renders an empty world grid, a missing
`unmanagedAttributePolicy` discards the attributes without an error, a user
without `firstName`/`lastName` gets a Keycloak 24 `VERIFY_PROFILE` action and can
never log in, and the Kernel DB trigger rejects the seven ERP module keys outright.

The script previously turned that sequence into a config-driven, repeatable run.
It is now deliberately unable to perform a live read or change, so it cannot be
used to activate a tenant under the obsolete identity contract.

### Safety model

- **Offline is the only allowed mode.** The default, `-VerifyOnly`, and `-Apply`
  paths all exit `2` before profile, credential, or network access.
- **No database writes or runnable DML artifacts.** `-KernelSqlPath` can only
  contain an explicit `NOT EMITTED` retirement notice; the legacy profile is not
  authoritative enough to generate a tenant-record statement.
- **No credential path.** Allowed offline runs reject `-AdminCredential` and
  `-TemporaryPassword` and never read `KEYCLOAK_ADMIN_USER` or
  `KEYCLOAK_ADMIN_PASSWORD`.
- **Fail-closed contract check.** The mirrored Kernel `TenantType` allowlist is
  compared against the ADR-067 alias table
  (`docs/knowledge/contracts/module-id-legacy-aliases.json`) before anything else;
  drift aborts the run.

### Usage

```powershell
# Validate the profile and compute a historical module analysis without any Keycloak call
powershell -File scripts/Invoke-KeycloakTenantOnboarding.ps1 -ProfilePath <profile>.json -Offline

# The following former live commands are intentionally refused (exit 2):
#   <script> -ProfilePath <profile>.json
#   <script> -ProfilePath <profile>.json -VerifyOnly
#   <script> -ProfilePath <profile>.json -Apply
```

Exit codes: `0` for successful `-Offline` validation; `2` for any live/mutation
mode or validation/tooling error. `-Apply`, `-VerifyOnly` and `-Offline` remain
pairwise mutually exclusive for stable CLI behaviour.

Config: `config/tenant-onboarding.sample.json`. Runbook, gates and the full pitfall
list: `docs/knowledge/deployment/TENANT_ONBOARDING_RUNBOOK.md`. Measured evidence
(34 Pester tests + an end-to-end run against a disposable Keycloak 24.0.0 container):
`docs/tasks/EPIC-PLATFORM-STABILITY-2026Q3/STAB-TENANT-ONBOARDING-RUNBOOK.md`.

### Testing

```powershell
Import-Module Pester -MinimumVersion 5.0
Invoke-Pester -Path scripts/Invoke-KeycloakTenantOnboarding.Tests.ps1 -Output Detailed
```

The decision logic lives in `KeycloakOnboarding.psm1` (no network, no mutation)
precisely so it can be unit-tested without a Keycloak instance — same split as
`TestcontainersHygiene.psm1`.

## provision_keycloak_tenant_projection.py — native authority + service registry

This is the successor contract for tenant authority projection. It never calls
or imports the retired PowerShell execution path. It owns one dedicated
`spaceos-tenant-authority-v1--<consumerClientId>` scope per declared consumer,
models only named user or service-account attributes, and blocks a
consumer when an unmanaged mapper could produce a mixed native+flat token or
widen the exact audience set.

The small `keycloak_provisioning_transport.py` dependency contains only the
secret-safe Admin HTTP/token transport and independently pins authentication to
`http://127.0.0.1:8080/auth`; it disables environment proxies and redirects and
strips an exact/path-aware set of secret, password, credential and bearer-token
value fields before product code receives a representation. Canonical mapper
settings such as `access.token.claim` and `id.token.claim` remain intact for
exact readback. It imports no Doorstar provisioning policy. Both profile input
and Keycloak responses reject duplicate JSON object keys. The only non-GET it
permits is the exact loopback master-realm admin token exchange; every bearer
Admin POST/PUT/DELETE fails before an opener or socket is created.

The human access-token profile is nested-only:

- `spaceos_tenants` is a native JSON array containing zero or exactly one
  selected tenant; the non-tokenized registry may retain multiple memberships;
- each active entry has exactly the three keys `tenant_id`, `permissions` and
  `enabled_modules`; the latter arrays each contain exactly one configured
  product grant;
- registry metadata, additional product grants and multi-membership state remain
  in `spaceos_membership_registry` and are never mapped wholesale into a token;
- each consumer pins its own custom audience set and receives a separate opaque
  user projection attribute, so Door and Plant grants cannot share a mapper;
  the non-tokenized `spaceos_consumer_projection_registry` makes audience or
  product-profile changes observable and forces a projection-version increment;
- each browser client also pins its enabled posture, exact HTTPS redirect/origin
  allowlists and `S256` PKCE. Door uses only its two tracked callbacks. Plant has
  no tracked browser callback/BFF contract, so the sample keeps it disabled with
  empty allowlists and emits a separate activation `Block`;
- `spaceos_membership_version` and `spaceos_projection_version` are separate,
  positive native JSON integers;
- `tid`, top-level `tenant_id`, `permissions` and `enabled_modules` are forbidden
  alongside the native projection.

The separate `joinerytech-office-to-plant` client carries exact
`azp=joinerytech-office-to-plant`, `aud=joinerytech-plant-api`, and one nested
`spaceos_service_principal` claim bounded to tenant, project, station and the
Plant exact `office.issue_work_package` / `office.read_outbox` /
`office.ack_outbox` operation vocabulary. It starts disabled unless separately
evidenced key custody exists.

There is deliberately no implicit mode. Exactly one of the following is
required, and missing/multiple modes exit 2 before credentials or network:

```powershell
# No credentials and no network; the only mode used for the local proof.
python scripts/provision_keycloak_tenant_projection.py `
  --profile config/keycloak-tenant-projection.sample.json --offline

# Explicit online, read-only desired-vs-observed check.
python scripts/provision_keycloak_tenant_projection.py `
  --profile <approved-profile>.json --verify-only

# Reserved mutation mode. It currently exits 2 before profile, credentials or network.
python scripts/provision_keycloak_tenant_projection.py `
  --profile <approved-profile>.json --apply
```

The offline/read-only contract now requires all of the following before a
future writer could even be reviewed:

- an external RS256 owner/adoption receipt bound to realm, change IDs, config
  digest, authority subject, every consumer/scope/service internal Keycloak UUID,
  desired owned-state digest and a separately signed observed baseline digest;
- a separate RS256 custody receipt bound to the receipt-adopted service client,
  exact audience/scope/rotation/key-fingerprint metadata and a maximum 31-day
  validity window;
- a bounded paginated inventory of every realm client, the complete bounded
  (classic API non-paginated) client-scope collection, every direct/attached
  mapper and every default/optional reverse edge, repeated in two identical
  passes. Attached scopes must match the complete immutable catalog by exact
  name and ID; duplicate name/ID aliases and malformed or ID-less live mappers
  fail closed;
- an allowlisted owned/guard-field observation fingerprint and exact immediate
  pre-write reread; secret/access/registered-node/foreign response fields never
  enter that fingerprint. This runtime contains no classic mutation DTO/helper;
- a future serialized writer must provide disabled-first service handling and
  verified disabled compensation for every exception, uncertain response or
  non-convergent final full readback.

The sample intentionally contains only syntactically valid placeholder
signatures. `TRUSTED_RECEIPT_KEYS` is empty: a real production public anchor must
arrive in a separately reviewed commit, and its private key must never enter the
repository. Tests inject an ephemeral 3072-bit/65537 RSA key. Even with valid
receipts and stable inventory, classic Keycloak Admin REST has no strong atomic
conditional update across these resources. Therefore CLI `--apply`, imported
`apply()`, the raise-only internal mutation entrypoint, and every non-GET Admin
request are all hard-disabled before network; no POST/PUT/DELETE scaffold remains
callable in the provisioner. `mutationSafetyEvidence` and
`projectionConvergenceEvidence` remain false until a serialized server-side
writer/lock/SPI replaces this path.

`keyRotation` is non-secret registry metadata and references the separately
signed custody receipt. This tool does **not** install, retrieve, return, rotate, or
revoke a client key; its summary cannot be live rotation evidence. It also does
not issue a token or prove Kernel/Plant online version checking. Full contract,
local Plant/Doorstar fixture compatibility and remaining activation blocks:
`docs/knowledge/architecture/KEYCLOAK_AUTHORITY_PROJECTION_AND_SERVICE_PRINCIPAL_2026-08-20.md`.

```powershell
python -m unittest scripts/test_provision_keycloak_tenant_projection.py -v
```

## Invoke-VpsHealthSmoke.ps1 — read-only VPS smoke check

### Problem it solves

A stale process can keep serving traffic on a port after a `git pull` without a
rebuild+restart, while systemd's `MainPID` has already moved on (or vice
versa) — silently serving outdated code. This exact bug class was found and
fixed live for the Cutting module in the STAB-CUTTING-SECURITY-HARDENING
session. `Invoke-VpsHealthSmoke.ps1` catches it automatically going forward
by comparing the `ss -tlnp`-reported listener PID for each service's expected
port against that service's systemd `MainPID`, plus checks `ActiveState`,
`NRestarts`, and an HTTP status code for each service's known health path(s).

It is **strictly read-only**: over SSH it only ever runs `systemctl show`,
`sudo ss -tlnp`, and `curl -s -o /dev/null` GETs against localhost health
paths. It never runs `systemctl start/stop/restart`, `git pull`, a mutating
HTTP verb, or any file write on the remote host, and it never prints a
secret/env value (only status codes, PIDs, unit names and public
Authority/Audience URLs already committed to appsettings.json).

It also runs a local-only, read-only pass over the checked-out module hosts'
`appsettings.json` files, reporting each module's Jwt `Authority`/`Audience`
(both public, non-secret configuration values) and flagging modules whose
`Authority` is empty in the tracked file (expected to be supplied via an
untracked env/EnvironmentFile at deploy time) or that use a different auth
scheme entirely.

### Usage

```powershell
# Full run: VPS smoke + local Keycloak-config consistency scan
powershell -File scripts/Invoke-VpsHealthSmoke.ps1

# Also write the JSON summary to a file
powershell -File scripts/Invoke-VpsHealthSmoke.ps1 -SummaryPath smoke-summary.json

# Local-only (no SSH) -- just the Keycloak config consistency scan
powershell -File scripts/Invoke-VpsHealthSmoke.ps1 -SkipVps

# Different SSH alias/host
powershell -File scripts/Invoke-VpsHealthSmoke.ps1 -VpsAlias some-other-host
```

Requires the `joinerytech-vps` SSH alias (or an equivalent passed via
`-VpsAlias`) to already be configured, per the repo root `CLAUDE.md`. Runs
under Windows PowerShell 5.1 (`#requires -Version 5.1`); no `pwsh` (PowerShell
7) was available in the environment this was authored/verified in, so the
script deliberately avoids PS7-only syntax (e.g. `if`/`switch` as expressions)
and works around two Windows-PowerShell-5.1-specific pitfalls when piping a
generated shell script to `ssh ... bash -s`: a UTF-8 BOM that Windows
PowerShell's native-process stdin pipe prepends regardless of
`$OutputEncoding` (worked around by writing to a temp file and redirecting via
`cmd /c ... < file` instead of a PowerShell pipeline), and `StringBuilder`'s
CRLF line endings breaking `set -u` on the bash side (normalized to LF before
writing the temp file).

### Exit codes

- **0** — `OverallStatus = Healthy`: every service `active`, every PID check
  `Match`, every health path returned 2xx.
- **1** — `OverallStatus = Attention`: at least one service/PID/health-code
  finding needs a human look (this is a *report*, not a script failure --
  the script itself does not throw for a reported problem, only for a
  genuine tooling failure such as `ssh` not being on `PATH`).

### Config-driven service list

The service table (`$Services` parameter, defaulted in the param block) is
plain data: `Name`, `Unit`, `Port`, `HealthPaths`. Add a service by adding a
row -- no logic changes needed.

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

## Retired Door Manufacturing Keycloak provisioners

`provision_doormanufacturing_keycloak_clients.py` and
`provision_doormanufacturing_identity.py` retain pure parsers only for historical
profile analysis. Their old direct `tid` / `enabled_modules` mappers, realm-role
scope and user attributes are incompatible with the nested-only,
consumer-specific authority contract above. They must not be used to inspect or
mutate a realm.

The CLI boundary is therefore fail-closed:

- `--offline` is required explicitly and performs only local profile validation;
  - default, `--verify-only`, `--apply`, and `--send-invite` modes exit `2` before
    reading the profile or accessing credentials/network;
  - retained credential/HTTP helpers and the identity script's direct invitation
    and role-mapping transports also raise the retired-path guard before reading
    environment credentials or opening a socket;
  - offline JSON has a profile digest and validation findings, but no client,
  mapper, role, user, invitation, DML or apply plan;
- `activationEvidence` and `mutationSafetyEvidence` are always false.

```bash
# Historical validation only; no runnable desired-state plan.
python3 scripts/provision_doormanufacturing_keycloak_clients.py \
  --profile config/doormanufacturing-keycloak-clients.sample.json --offline

python3 scripts/provision_doormanufacturing_identity.py \
  --profile config/doormanufacturing-identity-onboarding.sample.json --offline
```

```bash
python3 -m unittest scripts/test_provision_doormanufacturing_keycloak_clients.py -v
python3 -m unittest scripts/test_provision_doormanufacturing_identity.py -v
```
