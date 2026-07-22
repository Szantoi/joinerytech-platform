#requires -Version 5.1
<#
.SYNOPSIS
    Core, Docker-I/O-free logic for STAB-TESTCONTAINERS-HYGIENE.

.DESCRIPTION
    This module intentionally separates two concerns:

    1. Talking to Docker (the `Get-*`/`Remove-*`/`Test-*` functions below) — thin
       wrappers around `docker` CLI calls that always go through Docker's own
       structured `--filter`/`--format`/`inspect` output, never free-text `docker ps`
       table parsing and never a concatenated shell string built from caller input.

    2. Deciding WHAT to clean up (`Resolve-OrphanCleanupPlan`) — a pure function with
       no side effects and no Docker dependency at all, so it can be unit-tested
       (see Invoke-DotNetTestSafe.Tests.ps1) without Docker Desktop running and
       without spinning up real containers. `Invoke-DotNetTestSafe.ps1` is the only
       caller that feeds this function real Docker data.

    Keeping the decision logic pure is what makes the two mandatory proofs in the
    task doc ("pre-existing vs. new" and "never touch a non-labeled/protected
    container") testable as fast, deterministic, Docker-free unit tests instead of
    slow, flaky container-based integration tests.
#>

Set-StrictMode -Version Latest

# Docker container IDs are hex strings, 12 (short) to 64 (full sha256) chars.
# Any value that does not match this shape is rejected before it is ever used as
# a `docker rm`/`docker inspect` argument — defense in depth on top of the fact
# that these values only ever originate from Docker's own `--format "{{.ID}}"`
# output, never from free-text parsing or unsanitized caller input.
$script:ContainerIdPattern = '^[0-9a-fA-F]{12,64}$'

function Test-ValidContainerId {
    [CmdletBinding()]
    [OutputType([bool])]
    param(
        [Parameter(Mandatory)] [AllowEmptyString()] [string] $Id
    )
    return $Id -match $script:ContainerIdPattern
}

function Test-DockerAvailable {
    <#
    .SYNOPSIS
        Preflight: is the Docker daemon responsive within a bounded timeout?
    .DESCRIPTION
        Runs `docker info` on a background job so a hung daemon/named pipe cannot
        block the wrapper forever. Never touches any container.
    #>
    [CmdletBinding()]
    [OutputType([bool])]
    param(
        [int] $TimeoutSeconds = 10
    )

    $job = Start-Job -ScriptBlock { docker info --format '{{.ServerVersion}}' *>$null; $LASTEXITCODE }
    try {
        $completed = Wait-Job -Job $job -Timeout $TimeoutSeconds
        if (-not $completed) {
            return $false
        }
        $exitCode = Receive-Job -Job $job -ErrorAction SilentlyContinue
        return ($exitCode -eq 0)
    } finally {
        Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
    }
}

function Get-FreeMemoryMB {
    <#
    .SYNOPSIS
        Free physical memory in MB, for the preflight resource check.
    #>
    [CmdletBinding()]
    [OutputType([double])]
    param()

    $os = Get-CimInstance -ClassName Win32_OperatingSystem
    return [math]::Round($os.FreePhysicalMemory / 1024, 1) # FreePhysicalMemory is in KB
}

function Get-TestcontainersContainerIds {
    <#
    .SYNOPSIS
        All container IDs (any state) carrying the Testcontainers label, via Docker's
        own structured filter — never by parsing `docker ps` human-readable output.
    .DESCRIPTION
        Uses `-a` (all states, not just running) so a container that already exited
        or is mid-teardown by the time we snapshot is still counted as "present" —
        an orphan that already died is still an orphan we must account for in the
        diff, not one we should silently miss.
    #>
    [CmdletBinding()]
    [OutputType([string[]])]
    param(
        [string] $Label = 'org.testcontainers=true'
    )

    $raw = & docker ps -a --filter "label=$Label" --format '{{.ID}}' 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "docker ps --filter `"label=$Label`" failed with exit code $LASTEXITCODE"
    }
    $ids = @($raw | Where-Object { $_ }) # drop blank lines
    foreach ($id in $ids) {
        if (-not (Test-ValidContainerId -Id $id)) {
            throw "docker returned a value that does not look like a container ID: '$id'"
        }
    }
    return $ids
}

function Get-ContainerName {
    <#
    .SYNOPSIS
        Resolves a single container's name via `docker inspect`, ID-scoped —
        never a table scan. Returns $null if the container can no longer be found
        (already removed, e.g. by its own Testcontainers/Ryuk reaper) rather than
        throwing, so callers can treat that as "ownership ambiguous" instead of a
        hard failure.
    #>
    [CmdletBinding()]
    [OutputType([string])]
    param(
        [Parameter(Mandatory)] [string] $Id
    )

    if (-not (Test-ValidContainerId -Id $Id)) {
        throw "Refusing to inspect a value that is not a valid container ID: '$Id'"
    }

    $name = & docker inspect --format '{{.Name}}' $Id 2>$null
    if ($LASTEXITCODE -ne 0 -or -not $name) {
        return $null
    }
    return $name.TrimStart('/')
}

function Test-ContainerHasLabel {
    <#
    .SYNOPSIS
        Paranoid re-check, right before removal, that a container still actually
        carries the Testcontainers label (belt-and-braces on top of the fact the
        candidate list was already produced via a label filter).
    .NOTES
        Deliberately emits the WHOLE labels map as JSON (`{{json .Config.Labels}}`)
        and parses it in PowerShell, rather than building a Go template that embeds
        the label key inside double quotes (e.g. `{{index .Config.Labels "key"}}`).
        The latter was tried first and is broken in practice: PowerShell's native
        argument passing mangles embedded `"` characters on the way to `docker.exe`,
        so the quotes never arrive intact and Go's template parser fails with
        "function \"org\" not defined" -- which made this safety check ALWAYS
        return false (i.e. it would have silently blocked every real cleanup).
        Confirmed by direct reproduction against a live container before this fix.
    #>
    [CmdletBinding()]
    [OutputType([bool])]
    param(
        [Parameter(Mandatory)] [string] $Id,
        [string] $LabelKey = 'org.testcontainers'
    )

    if (-not (Test-ValidContainerId -Id $Id)) {
        return $false
    }

    $json = & docker inspect --format '{{json .Config.Labels}}' $Id 2>$null
    if ($LASTEXITCODE -ne 0 -or -not $json) {
        return $false
    }

    try {
        $labels = $json | ConvertFrom-Json
    } catch {
        return $false
    }

    if ($null -eq $labels) {
        return $false
    }

    $propName = ($labels.PSObject.Properties | Where-Object { $_.Name -eq $LabelKey } | Select-Object -First 1)
    if (-not $propName) {
        return $false
    }
    return ([string]$propName.Value -eq 'true')
}

function Remove-OrphanContainer {
    <#
    .SYNOPSIS
        Force-removes exactly one container by ID. Never called with anything but a
        single, previously-validated, previously-verified-as-new-and-labeled ID.
        Never a `docker system prune` / blanket call.
    #>
    [CmdletBinding(SupportsShouldProcess)]
    [OutputType([bool])]
    param(
        [Parameter(Mandatory)] [string] $Id
    )

    if (-not (Test-ValidContainerId -Id $Id)) {
        throw "Refusing to remove a value that is not a valid container ID: '$Id'"
    }
    if (-not $PSCmdlet.ShouldProcess($Id, 'docker rm -f')) {
        return $false
    }

    & docker rm -f $Id 2>$null 1>$null
    return ($LASTEXITCODE -eq 0)
}

function Resolve-OrphanCleanupPlan {
    <#
    .SYNOPSIS
        Pure decision function (no Docker calls, no side effects): given the
        pre-run baseline and the full set of containers observed after the run,
        decide which ones are safe to remove.

    .PARAMETER BaselineIds
        Testcontainers-labeled container IDs that already existed BEFORE this run
        started. Anything in this list is pre-existing and must never be touched.

    .PARAMETER PostRunContainers
        Every container observed after the run finished. Each element is a
        PSCustomObject with:
          - Id                       (string)
          - Name                     (string, may be $null/blank if unresolved)
          - IsTestcontainersLabeled  (bool)
        In production this list is built exclusively from containers Docker's own
        label filter already returned (see Invoke-DotNetTestSafe.ps1), so an
        unlabeled entry never actually reaches this function from real Docker
        data. The parameter still accepts unlabeled/mixed entries so the
        containment logic itself can be proven directly in a unit test (see
        Invoke-DotNetTestSafe.Tests.ps1) without relying on that upstream filter
        as the only line of defense.

    .PARAMETER ProtectedNames
        Container names that must NEVER be removed regardless of label or
        baseline membership (e.g. 'doorstar-production-db').

    .OUTPUTS
        PSCustomObject with:
          PreExistingIds   - baseline IDs, confirmed untouched
          NewLabeledIds    - new + Testcontainers-labeled (before protected-name check)
          ToRemoveIds      - new + labeled + NOT protected-by-name -> safe to remove
          ProtectedIds     - new + labeled but name-protected -> must be skipped
          IgnoredIds       - new but NOT Testcontainers-labeled -> never touched
          AmbiguousIds     - new + labeled but name could not be resolved -> must be
                             skipped and reported, per the task's stop/escalation rule
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [AllowEmptyCollection()] [string[]] $BaselineIds,
        [Parameter(Mandatory)] [AllowEmptyCollection()] [object[]] $PostRunContainers,
        [string[]] $ProtectedNames = @('doorstar-production-db')
    )

    $baselineSet = [System.Collections.Generic.HashSet[string]]::new([string[]]$BaselineIds, [System.StringComparer]::OrdinalIgnoreCase)
    $protectedSet = [System.Collections.Generic.HashSet[string]]::new([string[]]$ProtectedNames, [System.StringComparer]::OrdinalIgnoreCase)

    $preExisting = [System.Collections.Generic.List[string]]::new()
    $newLabeled = [System.Collections.Generic.List[string]]::new()
    $toRemove = [System.Collections.Generic.List[string]]::new()
    $protectedSkipped = [System.Collections.Generic.List[string]]::new()
    $ignored = [System.Collections.Generic.List[string]]::new()
    $ambiguous = [System.Collections.Generic.List[string]]::new()

    foreach ($container in $PostRunContainers) {
        $id = [string]$container.Id
        $isNew = -not $baselineSet.Contains($id)

        if (-not $isNew) {
            $preExisting.Add($id)
            continue
        }

        if (-not $container.IsTestcontainersLabeled) {
            # New, but never carried the Testcontainers label: out of scope, full stop.
            $ignored.Add($id)
            continue
        }

        $newLabeled.Add($id)

        $name = $container.Name
        if ([string]::IsNullOrWhiteSpace($name)) {
            # Ownership/identity could not be established -> stop clause: report, don't delete.
            $ambiguous.Add($id)
            continue
        }

        if ($protectedSet.Contains($name)) {
            $protectedSkipped.Add($id)
            continue
        }

        $toRemove.Add($id)
    }

    return [PSCustomObject]@{
        PreExistingIds = $preExisting.ToArray()
        NewLabeledIds  = $newLabeled.ToArray()
        ToRemoveIds    = $toRemove.ToArray()
        ProtectedIds   = $protectedSkipped.ToArray()
        IgnoredIds     = $ignored.ToArray()
        AmbiguousIds   = $ambiguous.ToArray()
    }
}

Export-ModuleMember -Function @(
    'Test-ValidContainerId',
    'Test-DockerAvailable',
    'Get-FreeMemoryMB',
    'Get-TestcontainersContainerIds',
    'Get-ContainerName',
    'Test-ContainerHasLabel',
    'Remove-OrphanContainer',
    'Resolve-OrphanCleanupPlan'
)
