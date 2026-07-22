#requires -Version 5.1
<#
.SYNOPSIS
    STAB-TESTCONTAINERS-HYGIENE: runs `dotnet test` and guarantees no NEW
    `org.testcontainers=true` container survives the run, without ever touching a
    pre-existing container.

.DESCRIPTION
    Problem: .NET test suites in this repo (EHS, hosting RLS-proof, etc.) spin up
    real PostgreSQL Testcontainers. A crashed or interrupted `dotnet test` can
    leave those containers running forever, alongside real dev infrastructure
    such as the long-running `doorstar-production-db` container — which must
    NEVER be touched by test tooling.

    This wrapper:
      1. Snapshots which `org.testcontainers=true` containers already exist
         BEFORE the run (baseline) using Docker's own structured `--filter`, never
         by parsing `docker ps` human-readable table output.
      2. Runs the actual `dotnet test` invocation from an argument array (never a
         concatenated shell string), and propagates its real exit code as this
         script's own exit code.
      3. In a `finally` block (runs on normal completion, test failure, AND
         script-level interruption), snapshots the labeled containers again and
         removes ONLY the ones that are both label-matched AND absent from the
         baseline — i.e. only what THIS run created.
      4. Never runs `docker system prune` or any name/label-less cleanup.
      5. Emits a machine-readable JSON summary (duration, exit code, created/
         removed container IDs, peak concurrent container count). Never logs
         secret or environment-variable values.

    Stop/escalation rule (from the task doc): if a candidate container's identity
    cannot be established (e.g. `docker inspect` fails because it is mid-removal
    by its own Testcontainers/Ryuk reaper), that container is left alone and
    reported as ambiguous/blocked — never deleted on a guess.

.PARAMETER Project
    Path to the .csproj/.sln to test (passed to `dotnet test <Project>`).

.PARAMETER TestArgs
    Additional arguments appended after the project path (e.g. '--filter',
    'FullyQualifiedName~Foo', '-c', 'Release'). Always passed as a real
    PowerShell array to `dotnet`/`Start-Process -ArgumentList` — never
    string-concatenated into a shell command line.

.PARAMETER WhatIfCleanup
    Dry-run: computes and reports the cleanup plan but does not actually call
    `docker rm` on anything. Useful to verify the plan before trusting the
    wrapper on a new machine/CI runner.

.PARAMETER ProtectedContainerNames
    Container names that must never be removed even if they are new and
    Testcontainers-labeled. Defaults to the known long-running dev DB.

.PARAMETER MinFreeMemoryMB
    Preflight advisory threshold. Low memory is reported as a warning in the
    summary; it does not by itself abort the run unless -FailOnLowMemory is set.

.PARAMETER FailOnLowMemory
    If set, abort BEFORE running any tests when free memory is below
    -MinFreeMemoryMB (sentinel exit code 90 — see "Exit codes" below).

.PARAMETER DockerPreflightTimeoutSeconds
    Max time to wait for `docker info` to respond during preflight.

.PARAMETER ContainerPollIntervalMs
    How often, while `dotnet test` is running, to sample the current count of
    Testcontainers-labeled containers for the "peak container count" metric.

.PARAMETER SummaryPath
    Optional file path to also write the JSON summary to (in addition to stdout).

.OUTPUTS
    Exit code:
      - The real `dotnet test` exit code, in the normal case (this is the
        contract the acceptance criteria require — cleanup outcome NEVER
        overrides this).
      - 90  - aborted BEFORE running any tests: Docker preflight failed
              (daemon unresponsive) or -FailOnLowMemory tripped. No test ran,
              nothing was touched.

.EXAMPLE
    pwsh -File scripts/Invoke-DotNetTestSafe.ps1 `
        -Project src/spaceos-modules-hosting/tests/SpaceOS.Modules.Hosting.Tests/SpaceOS.Modules.Hosting.Tests.csproj

.EXAMPLE
    pwsh -File scripts/Invoke-DotNetTestSafe.ps1 -Project <proj> -WhatIfCleanup
#>
[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory)]
    [string] $Project,

    [string[]] $TestArgs = @(),

    [switch] $WhatIfCleanup,

    [string[]] $ProtectedContainerNames = @('doorstar-production-db'),

    [string] $TestcontainersLabel = 'org.testcontainers=true',

    [int] $MinFreeMemoryMB = 2048,

    [switch] $FailOnLowMemory,

    [int] $DockerPreflightTimeoutSeconds = 10,

    [int] $ContainerPollIntervalMs = 1000,

    [string] $SummaryPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Import-Module (Join-Path $PSScriptRoot 'TestcontainersHygiene.psm1') -Force

$EXIT_PREFLIGHT_ABORT = 90

function Write-Info { param([string] $Message) Write-Host "[testcontainers-hygiene] $Message" }
function Write-Warn { param([string] $Message) Write-Warning "[testcontainers-hygiene] $Message" }

$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
$startedAtUtc = [DateTime]::UtcNow

# ---------------------------------------------------------------------------
# Preflight
# ---------------------------------------------------------------------------

Write-Info "Preflight: checking Docker daemon responsiveness (timeout ${DockerPreflightTimeoutSeconds}s)..."
$dockerOk = Test-DockerAvailable -TimeoutSeconds $DockerPreflightTimeoutSeconds
if (-not $dockerOk) {
    Write-Warn 'Docker daemon did not respond in time. Aborting before running any tests -- nothing was started or touched.'
    $summary = [PSCustomObject]@{
        startedAtUtc         = $startedAtUtc.ToString('o')
        finishedAtUtc        = [DateTime]::UtcNow.ToString('o')
        durationSeconds      = [math]::Round($stopwatch.Elapsed.TotalSeconds, 2)
        project              = $Project
        testExitCode         = $null
        scriptExitCode       = $EXIT_PREFLIGHT_ABORT
        aborted              = $true
        abortReason          = 'docker-preflight-unresponsive'
        dockerAvailable      = $false
        freeMemoryMB         = $null
        baselineContainerIds = @()
        postRunContainerIds  = @()
        newContainerIds      = @()
        removedContainerIds  = @()
        protectedContainerIds = @()
        ambiguousContainerIds = @()
        ignoredContainerIds  = @()
        peakContainerCount   = 0
        cleanupStatus        = 'skipped-preflight-abort'
        whatIfCleanup        = [bool]$WhatIfCleanup
    }
    $summary | ConvertTo-Json -Depth 5 | Write-Output
    if ($SummaryPath) { $summary | ConvertTo-Json -Depth 5 | Set-Content -Path $SummaryPath -Encoding utf8 }
    exit $EXIT_PREFLIGHT_ABORT
}
Write-Info 'Docker daemon is responsive.'

$freeMemoryMB = Get-FreeMemoryMB
Write-Info "Free memory: ${freeMemoryMB} MB (advisory threshold: ${MinFreeMemoryMB} MB)."
if ($freeMemoryMB -lt $MinFreeMemoryMB) {
    if ($FailOnLowMemory) {
        Write-Warn "Free memory (${freeMemoryMB} MB) is below threshold (${MinFreeMemoryMB} MB) and -FailOnLowMemory was set. Aborting before running any tests."
        $summary = [PSCustomObject]@{
            startedAtUtc         = $startedAtUtc.ToString('o')
            finishedAtUtc        = [DateTime]::UtcNow.ToString('o')
            durationSeconds      = [math]::Round($stopwatch.Elapsed.TotalSeconds, 2)
            project              = $Project
            testExitCode         = $null
            scriptExitCode       = $EXIT_PREFLIGHT_ABORT
            aborted              = $true
            abortReason          = 'low-memory'
            dockerAvailable      = $true
            freeMemoryMB         = $freeMemoryMB
            baselineContainerIds = @()
            postRunContainerIds  = @()
            newContainerIds      = @()
            removedContainerIds  = @()
            protectedContainerIds = @()
            ambiguousContainerIds = @()
            ignoredContainerIds  = @()
            peakContainerCount   = 0
            cleanupStatus        = 'skipped-preflight-abort'
            whatIfCleanup        = [bool]$WhatIfCleanup
        }
        $summary | ConvertTo-Json -Depth 5 | Write-Output
        if ($SummaryPath) { $summary | ConvertTo-Json -Depth 5 | Set-Content -Path $SummaryPath -Encoding utf8 }
        exit $EXIT_PREFLIGHT_ABORT
    } else {
        Write-Warn "Free memory (${freeMemoryMB} MB) is below the advisory threshold (${MinFreeMemoryMB} MB). Continuing (use -FailOnLowMemory to abort instead)."
    }
}

Write-Info 'Preflight: snapshotting baseline Testcontainers-labeled container IDs...'
$baselineIds = Get-TestcontainersContainerIds -Label $TestcontainersLabel
Write-Info "Baseline: $($baselineIds.Count) pre-existing labeled container(s): $($baselineIds -join ', ')"

# ---------------------------------------------------------------------------
# Run the actual test command
# ---------------------------------------------------------------------------

$testExitCode = $null
$peakContainerCount = $baselineIds.Count
$proc = $null

try {
    $dotnetArgs = @('test', $Project) + $TestArgs
    Write-Info "Running: dotnet $($dotnetArgs -join ' ')"

    # Start-Process with a real argument array -- never a concatenated command
    # line -- so nothing in $TestArgs/$Project can be interpreted as extra shell
    # syntax by dotnet or by PowerShell.
    $proc = Start-Process -FilePath 'dotnet' -ArgumentList $dotnetArgs -NoNewWindow -PassThru

    # Windows PowerShell 5.1 / .NET Framework quirk: System.Diagnostics.Process
    # lazily populates its exit-code-tracking internals. If .Handle is never
    # touched before the process exits, .HasExited/.ExitCode can come back
    # wrong (observed: ExitCode empty/blank) -- silently breaking the "preserve
    # the real exit code" guarantee this wrapper exists for. Touching .Handle
    # once, immediately, forces correct initialization.
    $null = $proc.Handle

    while (-not $proc.HasExited) {
        Start-Sleep -Milliseconds $ContainerPollIntervalMs
        try {
            $currentIds = Get-TestcontainersContainerIds -Label $TestcontainersLabel
            if ($currentIds.Count -gt $peakContainerCount) {
                $peakContainerCount = $currentIds.Count
            }
        } catch {
            # Docker hiccuping mid-run is not a reason to kill the test run;
            # the peak metric is best-effort telemetry, not a safety gate.
            Write-Warn "Peak-count poll failed (non-fatal): $($_.Exception.Message)"
        }
    }

    $proc.WaitForExit()
    $testExitCode = $proc.ExitCode
    Write-Info "dotnet test finished with exit code $testExitCode."
}
catch {
    # Make sure a failure to even launch `dotnet` (e.g. not on PATH) still falls
    # through to the finally block's cleanup/summary instead of aborting the
    # script mid-way with no accounting of what Docker state looks like.
    Write-Warn "Failed to run the test command: $($_.Exception.Message)"
    if ($null -eq $testExitCode) { $testExitCode = 1 }
}
finally {
    # If the wrapper itself is unwinding (Ctrl+C, terminating error) while the
    # child process is still alive, make sure it -- and any child test-host
    # process it spawned -- is actually gone before we decide what "new
    # container" means. `Process.Kill(bool)` (tree-kill) is a .NET Core 3+-only
    # overload and is not available under Windows PowerShell 5.1's .NET
    # Framework runtime, so `taskkill /T` is used for a real process-tree kill.
    if ($proc -and -not $proc.HasExited) {
        Write-Warn "dotnet test process (PID $($proc.Id)) still running during cleanup -- terminating its process tree."
        try {
            & taskkill /PID $proc.Id /T /F *> $null
        } catch {
            Write-Warn "taskkill failed for PID $($proc.Id): $($_.Exception.Message)"
        }
        if ($null -eq $testExitCode) { $testExitCode = 1 }
    }

    Write-Info 'Cleanup: snapshotting post-run Testcontainers-labeled container IDs...'
    $cleanupStatus = 'ok'
    $postRunIds = @()
    $plan = $null

    try {
        $postRunIds = Get-TestcontainersContainerIds -Label $TestcontainersLabel
    } catch {
        # Stop/escalation rule: if we cannot even establish what exists right
        # now, we must not delete anything.
        Write-Warn "Could not snapshot post-run containers -- Docker may be unresponsive. Skipping cleanup entirely (blocked). Error: $($_.Exception.Message)"
        $cleanupStatus = 'blocked-docker-unavailable'
    }

    $postRunContainers = @()
    if ($cleanupStatus -eq 'ok') {
        foreach ($id in $postRunIds) {
            $name = $null
            try {
                $name = Get-ContainerName -Id $id
            } catch {
                Write-Warn "Could not resolve name for container '$id': $($_.Exception.Message)"
            }
            $postRunContainers += [PSCustomObject]@{
                Id                      = $id
                Name                    = $name
                IsTestcontainersLabeled = $true # already guaranteed by the label filter above
            }
        }

        $plan = Resolve-OrphanCleanupPlan -BaselineIds $baselineIds -PostRunContainers $postRunContainers -ProtectedNames $ProtectedContainerNames

        if ($plan.ProtectedIds.Count -gt 0) {
            Write-Warn "Refusing to remove $($plan.ProtectedIds.Count) container(s) matching a protected name: $($plan.ProtectedIds -join ', ')"
        }
        if ($plan.AmbiguousIds.Count -gt 0) {
            Write-Warn "Refusing to remove $($plan.AmbiguousIds.Count) container(s) with unresolved identity (stop/escalation rule): $($plan.AmbiguousIds -join ', ')"
        }
        if ($plan.IgnoredIds.Count -gt 0) {
            Write-Info "Ignoring $($plan.IgnoredIds.Count) new but non-Testcontainers-labeled container(s) (never in scope): $($plan.IgnoredIds -join ', ')"
        }
    }

    $removedIds = @()
    if ($plan -and $plan.ToRemoveIds.Count -gt 0) {
        if ($WhatIfCleanup) {
            Write-Info "WhatIfCleanup: would remove $($plan.ToRemoveIds.Count) new labeled container(s): $($plan.ToRemoveIds -join ', ')"
            $cleanupStatus = 'dry-run'
        } else {
            foreach ($id in $plan.ToRemoveIds) {
                # Paranoid re-check right before removal: still labeled, right now.
                if (-not (Test-ContainerHasLabel -Id $id -LabelKey 'org.testcontainers')) {
                    Write-Warn "Skipping '$id': no longer carries the Testcontainers label at removal time (re-check failed)."
                    continue
                }
                $ok = Remove-OrphanContainer -Id $id
                if ($ok) {
                    Write-Info "Removed orphan container $id."
                    $removedIds += $id
                } else {
                    Write-Warn "Failed to remove container $id."
                }
            }
        }
    } elseif (-not $plan) {
        # cleanup was blocked before a plan could even be computed
    } else {
        Write-Info 'No new orphan Testcontainers containers to clean up.'
    }

    $stopwatch.Stop()

    $summary = [PSCustomObject]@{
        startedAtUtc          = $startedAtUtc.ToString('o')
        finishedAtUtc         = [DateTime]::UtcNow.ToString('o')
        durationSeconds       = [math]::Round($stopwatch.Elapsed.TotalSeconds, 2)
        project               = $Project
        testExitCode          = $testExitCode
        scriptExitCode        = $testExitCode
        aborted               = $false
        abortReason           = $null
        dockerAvailable       = $true
        freeMemoryMB          = $freeMemoryMB
        baselineContainerIds  = @($baselineIds)
        postRunContainerIds   = @($postRunIds)
        newContainerIds       = @(if ($plan) { $plan.NewLabeledIds } else { @() })
        removedContainerIds   = @($removedIds)
        protectedContainerIds = @(if ($plan) { $plan.ProtectedIds } else { @() })
        ambiguousContainerIds = @(if ($plan) { $plan.AmbiguousIds } else { @() })
        ignoredContainerIds   = @(if ($plan) { $plan.IgnoredIds } else { @() })
        peakContainerCount    = $peakContainerCount
        cleanupStatus         = $cleanupStatus
        whatIfCleanup         = [bool]$WhatIfCleanup
    }

    $json = $summary | ConvertTo-Json -Depth 5
    Write-Output $json
    if ($SummaryPath) { $json | Set-Content -Path $SummaryPath -Encoding utf8 }
}

exit $testExitCode
