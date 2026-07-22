#requires -Version 5.1
<#
.SYNOPSIS
    Read-only VPS smoke check: systemd unit state, MainPID<->listener PID
    consistency, and HTTP health-endpoint status codes for every known
    JoineryTech/SpaceOS backend service (STAB-RELEASE-REPRO).

.DESCRIPTION
    This script NEVER mutates anything. It only ever runs, over SSH:
      - systemctl show -p ActiveState -p SubState -p MainPID -p NRestarts
      - ss -tlnp (via sudo, read-only)
      - curl -s -o /dev/null -w '%{http_code}' against local health paths
    No `systemctl start/stop/restart`, no `git pull`, no `curl -X POST`, no
    file writes, ever. It never prints secret/env values -- only status
    codes, PIDs and unit names.

    Motivation: a stale process can keep serving traffic on a port after a
    `git pull` without rebuild+restart, while systemd's MainPID has already
    moved on (or vice versa) -- exactly the class of bug found and fixed
    live for the Cutting module in this session. Comparing the `ss`-reported
    listener PID against the unit's `MainPID` catches that automatically.

    The service/port/health-path list is plain config (the $Services array
    below) -- add a service by adding a row, no logic changes needed.

.PARAMETER VpsAlias
    SSH alias/host to connect to. Must already be configured in the caller's
    ~/.ssh/config (see repo root CLAUDE.md). Default: joinerytech-vps.

.PARAMETER Services
    Optional override of the default service table. Each entry needs
    Name, Unit, Port, HealthPaths (string array).

.PARAMETER SummaryPath
    Optional path to also write the machine-readable JSON summary to
    (e.g. for CI artifact upload). Always printed to stdout regardless.

.PARAMETER SkipVps
    Skip the SSH/VPS section entirely (e.g. offline dev, or when only the
    local Keycloak-config consistency check is wanted).

.PARAMETER SkipKeycloakConfig
    Skip the local Jwt:Authority/Jwt:Audience consistency scan across the
    module hosts checked out in this working tree.

.OUTPUTS
    A summary object with .Services and .KeycloakConfig arrays, and an
    .OverallStatus of 'Healthy' or 'Attention'. Exit code 0 when Healthy,
    1 when Attention (so it can gate a CI/monitor step) -- never anything
    else; the script itself never throws for a *reported* problem, only
    for a genuine tooling failure (e.g. ssh not found).

.EXAMPLE
    pwsh -File scripts/Invoke-VpsHealthSmoke.ps1

.EXAMPLE
    pwsh -File scripts/Invoke-VpsHealthSmoke.ps1 -SummaryPath smoke-summary.json

.NOTES
    STAB-RELEASE-REPRO (docs/tasks/EPIC-PLATFORM-STABILITY-2026Q3/STAB-RELEASE-REPRO.md).
    Mutation boundary for this task explicitly allows a read-only smoke
    script; this script must stay read-only forever -- any future change
    that adds a mutating action (restart/redeploy) needs a separate,
    explicitly-approved task.
#>
[CmdletBinding()]
param(
    [string] $VpsAlias = 'joinerytech-vps',

    [object[]] $Services = @(
        [pscustomobject]@{ Name = 'kernel';        Unit = 'spaceos-kernel';          Port = 5000; HealthPaths = @('/healthz', '/health/ready') },
        [pscustomobject]@{ Name = 'orchestrator';  Unit = 'spaceos-orchestrator';    Port = 3000; HealthPaths = @('/health', '/healthz') },
        [pscustomobject]@{ Name = 'knowledge';     Unit = 'spaceos-knowledge';       Port = 3458; HealthPaths = @('/health', '/ready', '/live') },
        [pscustomobject]@{ Name = 'joinery';       Unit = 'spaceos-joinery';         Port = 5002; HealthPaths = @('/health') },
        [pscustomobject]@{ Name = 'abstractions';  Unit = 'spaceos-abstractions';    Port = 5003; HealthPaths = @('/health') },
        [pscustomobject]@{ Name = 'inventory';     Unit = 'spaceos-inventory';       Port = 5004; HealthPaths = @('/health') },
        [pscustomobject]@{ Name = 'cutting-svc';   Unit = 'spaceos-cutting-svc';     Port = 5005; HealthPaths = @('/healthz') },
        [pscustomobject]@{ Name = 'procurement';   Unit = 'spaceos-procurement';     Port = 5006; HealthPaths = @('/healthz', '/health/ready') },
        [pscustomobject]@{ Name = 'identity';      Unit = 'spaceos-modules-identity'; Port = 5008; HealthPaths = @('/health') },
        [pscustomobject]@{ Name = 'sales';         Unit = 'spaceos-modules-sales';   Port = 5009; HealthPaths = @('/health') },
        [pscustomobject]@{ Name = 'minio';         Unit = 'spaceos-minio';          Port = 9001; HealthPaths = @() }
    ),

    [string] $SummaryPath,

    [switch] $SkipVps,

    [switch] $SkipKeycloakConfig
)

$ErrorActionPreference = 'Stop'

# --- Local, read-only Keycloak config consistency scan ---------------------
# Reads only appsettings.json Jwt:Authority / Jwt:Audience *keys* that are
# already committed to this working tree. Never reads .env/.env.local
# contents beyond confirming the file exists, and never prints a secret.
function Get-KeycloakConfigConsistency {
    $repoRoot = Split-Path -Parent $PSScriptRoot
    $candidates = @(
        'src/spaceos-kernel/SpaceOS.Kernel.Api/appsettings.json',
        'src/ehs/src/Api/appsettings.json',
        'src/spaceos-modules-ehs/Ehs.Api/appsettings.json',
        'src/qa/host/appsettings.json',
        'src/hr/src/Api/appsettings.json',
        'src/maintenance/host/appsettings.json',
        'src/dms/host/appsettings.json',
        'src/spaceos-modules/spaceos-modules-kontrolling/host/appsettings.json',
        'src/SpaceOS.Modules.CRM/src/Lead.Api/appsettings.json',
        'src/spaceos-modules-cutting/src/SpaceOS.Modules.Cutting.Api/appsettings.json',
        'src/spaceos-modules-inventory/src/SpaceOS.Modules.Inventory.Api/appsettings.json',
        'src/spaceos-modules-procurement/src/SpaceOS.Modules.Procurement.Api/appsettings.json',
        'src/spaceos-modules-joinery/SpaceOS.Modules.Joinery.Api/appsettings.json',
        'src/spaceos-modules-joinerytech/SpaceOS.Modules.JoineryTech.Api/appsettings.json'
    )

    $results = foreach ($rel in $candidates) {
        $full = Join-Path $repoRoot $rel
        if (-not (Test-Path $full)) {
            [pscustomobject]@{ Module = $rel; Present = $false; Authority = $null; Audience = $null; Note = 'file not in working tree (submodule not initialized)' }
            continue
        }
        try {
            $json = Get-Content $full -Raw | ConvertFrom-Json
            $jwt = $json.Jwt
            $authValue = $null
            $audValue = $null
            $note = ''
            if ($null -ne $jwt) {
                $audValue = $jwt.Audience
                if ($null -eq $jwt.Authority -and $null -ne $jwt.Issuer) {
                    $authValue = $null
                    $note = "no 'Authority' key -- uses 'Issuer'/'Audience' (self-issued JWT, not Keycloak): Issuer='$($jwt.Issuer)'. Different auth scheme from the other module hosts -- verify manually, this is not the ADR-061 shared Keycloak wiring."
                }
                else {
                    $authValue = $jwt.Authority
                    if ([string]::IsNullOrWhiteSpace($authValue)) {
                        $note = 'Authority empty in tracked file -- expected to be supplied via untracked env/EnvironmentFile at deploy time (verify Jwt__Authority key exists there; do not print its value)'
                    }
                }
            }
            else {
                $note = 'no Jwt section -- module may use a different auth scheme; verify manually'
            }
            [pscustomobject]@{ Module = $rel; Present = $true; Authority = $authValue; Audience = $audValue; Note = $note }
        }
        catch {
            [pscustomobject]@{ Module = $rel; Present = $true; Authority = $null; Audience = $null; Note = "could not parse JSON: $($_.Exception.Message)" }
        }
    }

    return $results
}

# --- Remote (VPS) service smoke ---------------------------------------------
function Invoke-RemoteServiceSmoke {
    param(
        [Parameter(Mandatory)] [string] $VpsAlias,
        [Parameter(Mandatory)] [object[]] $Services
    )

    if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
        throw "ssh not found on PATH -- cannot run the VPS smoke section. Use -SkipVps to run the local-only checks."
    }

    # Build one remote bash script covering every service in a single SSH
    # round-trip. Every command it runs is read-only (systemctl show, ss,
    # curl GET with a short timeout). Output is '|'-delimited, one line per
    # service, easy to parse without requiring jq on the remote host.
    $sb = New-Object System.Text.StringBuilder
    [void]$sb.AppendLine('set -u')
    foreach ($svc in $Services) {
        $pathsCsv = ($svc.HealthPaths -join ',')
        [void]$sb.AppendLine("unit='$($svc.Unit)'")
        [void]$sb.AppendLine("name='$($svc.Name)'")
        [void]$sb.AppendLine("port='$($svc.Port)'")
        [void]$sb.AppendLine("paths='$pathsCsv'")
        [void]$sb.AppendLine(@'
active=$(systemctl show -p ActiveState --value "$unit.service" 2>/dev/null || echo "unknown")
sub=$(systemctl show -p SubState --value "$unit.service" 2>/dev/null || echo "unknown")
restarts=$(systemctl show -p NRestarts --value "$unit.service" 2>/dev/null || echo "-1")
mainpid=$(systemctl show -p MainPID --value "$unit.service" 2>/dev/null || echo "0")
ssline=$(sudo ss -tlnp 2>/dev/null | grep -E ":${port}[[:space:]]" | head -1)
sspid=$(echo "$ssline" | grep -oE 'pid=[0-9]+' | head -1 | cut -d= -f2)
[ -z "$sspid" ] && sspid="none"
codes=""
if [ -n "$paths" ]; then
  IFS=',' read -ra P <<< "$paths"
  for p in "${P[@]}"; do
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 "http://127.0.0.1:${port}${p}" 2>/dev/null || echo "ERR")
    codes="${codes}${p}=${code};"
  done
fi
echo "SMOKE|${name}|${unit}|${active}|${sub}|${restarts}|${mainpid}|${sspid}|${port}|${codes}"
'@)
    }
    $remoteScript = $sb.ToString()

    # Sent to a single non-interactive `ssh ... bash -s` over stdin --
    # nothing is executed with elevated/mutating semantics; sudo is used
    # only for `ss -tlnp` (reading kernel socket table), matching the
    # read-only access pattern already documented in the repo root CLAUDE.md.
    #
    # Written to a BOM-less temp file and fed in via cmd.exe's `<` stdin
    # redirection rather than a PowerShell pipeline: piping a .NET string
    # straight into a native process's stdin in Windows PowerShell 5.1
    # prepends a UTF-8 BOM regardless of $OutputEncoding, which bash then
    # chokes on as literal bytes glued to the first command (observed as
    # "bash: line 1: <BOM>set: command not found"). The temp file is removed
    # again in `finally` -- it never contains anything beyond this generated,
    # non-secret shell script.
    $tempScript = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "jt-vps-smoke-$([Guid]::NewGuid()).sh")
    try {
        # Normalize to LF-only: StringBuilder.AppendLine() emits CRLF on
        # Windows, and a stray trailing "`r" glued onto e.g. "set -u" makes
        # bash treat it as an invalid option character (observed as
        # "bash: line 1: set: -").
        $remoteScriptLf = $remoteScript -replace "`r`n", "`n" -replace "`r", "`n"
        [System.IO.File]::WriteAllText($tempScript, $remoteScriptLf, (New-Object System.Text.UTF8Encoding($false)))
        $rawOutput = cmd /c "ssh $VpsAlias ""bash -s"" < ""$tempScript""" 2>&1
    }
    finally {
        Remove-Item -Path $tempScript -ErrorAction SilentlyContinue
    }

    $parsed = @()
    foreach ($line in $rawOutput) {
        if ($line -notmatch '^SMOKE\|') { continue }
        $parts = $line -split '\|'
        # SMOKE|name|unit|active|sub|restarts|mainpid|sspid|port|codes
        $name = $parts[1]; $unit = $parts[2]; $active = $parts[3]; $sub = $parts[4]
        $restarts = $parts[5]; $mainpid = $parts[6]; $sspid = $parts[7]; $port = $parts[8]
        $codesRaw = ''
        if ($parts.Length -ge 10) { $codesRaw = $parts[9] }

        $codes = @{}
        foreach ($entry in ($codesRaw -split ';' | Where-Object { $_ })) {
            $kv = $entry -split '='
            if ($kv.Length -eq 2) { $codes[$kv[0]] = $kv[1] }
        }

        $pidMatch = 'MISMATCH'
        if ($sspid -eq 'none') { $pidMatch = 'NotListening' }
        elseif ($mainpid -eq $sspid) { $pidMatch = 'Match' }

        $healthy = $true
        if ($codes.Count -gt 0) {
            $anyOk = $false
            foreach ($v in $codes.Values) { if ($v -match '^2\d\d$') { $anyOk = $true } }
            $healthy = $anyOk
        }

        $parsed += [pscustomobject]@{
            Name          = $name
            Unit          = $unit
            ActiveState   = $active
            SubState      = $sub
            NRestarts     = $restarts
            MainPID       = $mainpid
            ListenerPID   = $sspid
            PidCheck      = $pidMatch
            Port          = $port
            HealthCodes   = $codes
            HealthOk      = $healthy
        }
    }

    return $parsed
}

# --- Run ---------------------------------------------------------------
$summary = [ordered]@{
    TimestampUtc   = (Get-Date).ToUniversalTime().ToString('o')
    VpsAlias       = $VpsAlias
    Services       = @()
    KeycloakConfig = @()
    OverallStatus  = 'Healthy'
}

if (-not $SkipVps) {
    Write-Host "== VPS service smoke ($VpsAlias) - read-only ==" -ForegroundColor Cyan
    $serviceResults = Invoke-RemoteServiceSmoke -VpsAlias $VpsAlias -Services $Services
    $summary.Services = $serviceResults

    $serviceResults |
        Select-Object Name, Unit, ActiveState, SubState, NRestarts, MainPID, ListenerPID, PidCheck, Port, HealthOk |
        Format-Table -AutoSize | Out-String | Write-Host

    foreach ($r in $serviceResults) {
        if ($r.PidCheck -ne 'Match') {
            Write-Host "ATTENTION: $($r.Name) PID check = $($r.PidCheck) (MainPID=$($r.MainPID), listener=$($r.ListenerPID))" -ForegroundColor Yellow
            $summary.OverallStatus = 'Attention'
        }
        if ($r.HealthCodes.Count -gt 0 -and -not $r.HealthOk) {
            $codesStr = ($r.HealthCodes.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join ', '
            Write-Host "ATTENTION: $($r.Name) health check(s) not 2xx: $codesStr" -ForegroundColor Yellow
            $summary.OverallStatus = 'Attention'
        }
        if ($r.ActiveState -ne 'active') {
            Write-Host "ATTENTION: $($r.Name) ActiveState=$($r.ActiveState) (expected 'active')" -ForegroundColor Yellow
            $summary.OverallStatus = 'Attention'
        }
    }
}
else {
    Write-Host "Skipping VPS section (-SkipVps)." -ForegroundColor DarkGray
}

if (-not $SkipKeycloakConfig) {
    Write-Host "`n== Keycloak audience/authority config consistency (local, read-only) ==" -ForegroundColor Cyan
    $kcResults = Get-KeycloakConfigConsistency
    $summary.KeycloakConfig = $kcResults
    $kcResults | Format-Table -AutoSize | Out-String | Write-Host
}
else {
    Write-Host "Skipping Keycloak config scan (-SkipKeycloakConfig)." -ForegroundColor DarkGray
}

$json = $summary | ConvertTo-Json -Depth 6
Write-Host "`n== JSON summary ==" -ForegroundColor Cyan
Write-Host $json

if ($SummaryPath) {
    $json | Set-Content -Path $SummaryPath -Encoding utf8
    Write-Host "Summary written to $SummaryPath" -ForegroundColor DarkGray
}

if ($summary.OverallStatus -eq 'Healthy') {
    exit 0
}
else {
    exit 1
}
