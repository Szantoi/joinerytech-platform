#requires -Version 5.1

<#
.SYNOPSIS
Runs sequential, read-only NuGet vulnerability audits and emits one JSON summary.

.DESCRIPTION
The script intentionally requires either explicit -Project values or -Discover.
This prevents an accidental full-repository scan on a developer workstation.
Projects are processed sequentially, with a per-project timeout. Restore is
disabled by default so the gate observes the already-restored dependency graph;
pass -Restore explicitly when a fresh graph is required.

.EXAMPLE
powershell -File scripts/Invoke-DotNetPackageAudit.ps1 `
  -Project src/ehs/src/Api/SpaceOS.Modules.Ehs.Api.csproj

.EXAMPLE
powershell -File scripts/Invoke-DotNetPackageAudit.ps1 -Discover `
  -ProjectTimeoutSeconds 180 -SummaryPath artifacts/nuget-audit.json
#>

[CmdletBinding()]
param(
    [string[]]$Project = @(),

    [string]$ProjectListPath,

    [switch]$Discover,

    [switch]$ReleaseInventory,

    [string]$RootPath = (Get-Location).Path,

    [switch]$Restore,

    [ValidateSet('Critical', 'High', 'Moderate', 'Low', 'None')]
    [string]$FailOnSeverity = 'High',

    [ValidateRange(10, 1800)]
    [int]$ProjectTimeoutSeconds = 180,

    [string]$SummaryPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function ConvertTo-NativeArgument {
    param([Parameter(Mandatory = $true)][AllowEmptyString()][string]$Value)

    if ($Value.Length -eq 0) {
        return '""'
    }

    if ($Value -notmatch '[\s"]') {
        return $Value
    }

    # ProcessStartInfo.Arguments is not a shell command. This quoting only
    # preserves whitespace/quotes for the native argv parser.
    $builder = New-Object System.Text.StringBuilder
    [void]$builder.Append('"')
    $backslashes = 0

    foreach ($character in $Value.ToCharArray()) {
        if ($character -eq '\') {
            $backslashes++
            continue
        }

        if ($character -eq '"') {
            [void]$builder.Append(('\' * (($backslashes * 2) + 1)))
            [void]$builder.Append('"')
            $backslashes = 0
            continue
        }

        if ($backslashes -gt 0) {
            [void]$builder.Append(('\' * $backslashes))
            $backslashes = 0
        }
        [void]$builder.Append($character)
    }

    if ($backslashes -gt 0) {
        [void]$builder.Append(('\' * ($backslashes * 2)))
    }
    [void]$builder.Append('"')
    return $builder.ToString()
}

function Test-PathWithinRoot {
    param(
        [Parameter(Mandatory = $true)][string]$CandidatePath,
        [Parameter(Mandatory = $true)][string]$ResolvedRoot
    )

    $candidate = [System.IO.Path]::GetFullPath($CandidatePath)
    $root = [System.IO.Path]::GetFullPath($ResolvedRoot).TrimEnd(
        [System.IO.Path]::DirectorySeparatorChar,
        [System.IO.Path]::AltDirectorySeparatorChar)
    $prefix = $root + [System.IO.Path]::DirectorySeparatorChar
    $comparison = [System.StringComparison]::Ordinal
    if ([System.Environment]::OSVersion.Platform -eq [System.PlatformID]::Win32NT) {
        $comparison = [System.StringComparison]::OrdinalIgnoreCase
    }

    return $candidate.StartsWith($prefix, $comparison)
}

function Assert-NoReparsePointBelowRoot {
    param(
        [Parameter(Mandatory = $true)][string]$CandidatePath,
        [Parameter(Mandatory = $true)][string]$ResolvedRoot
    )

    $candidate = [System.IO.Path]::GetFullPath($CandidatePath)
    $root = [System.IO.Path]::GetFullPath($ResolvedRoot).TrimEnd(
        [System.IO.Path]::DirectorySeparatorChar,
        [System.IO.Path]::AltDirectorySeparatorChar)
    if (-not (Test-PathWithinRoot -CandidatePath $candidate -ResolvedRoot $root)) {
        throw "Path is outside RootPath: $candidate"
    }

    # Lexical containment alone is insufficient: a junction or symlink below
    # RootPath can redirect an otherwise valid-looking path outside the repo.
    # RootPath itself is an explicitly trusted boundary; every segment below
    # it, including the target file, must be a normal filesystem entry.
    $relativePath = $candidate.Substring($root.Length).TrimStart(
        [System.IO.Path]::DirectorySeparatorChar,
        [System.IO.Path]::AltDirectorySeparatorChar)
    $currentPath = $root
    foreach ($segment in ($relativePath -split '[\\/]')) {
        if ([string]::IsNullOrWhiteSpace($segment)) {
            continue
        }
        $currentPath = Join-Path -Path $currentPath -ChildPath $segment
        $attributes = [System.IO.File]::GetAttributes($currentPath)
        if (($attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
            throw "Path contains a reparse point below RootPath: $currentPath"
        }
    }
}

function Test-IsExcludedDiscoveryPath {
    param([Parameter(Mandatory = $true)][string]$Path)

    return $Path -match '[\\/](\.git|node_modules|bin|obj|TestResults|artifacts|dist|coverage|\.next)[\\/]'
}

function Test-IsExcludedDiscoveryDirectoryName {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [string[]]$AdditionalExcludedNames = @()
    )

    $excluded = @(
        '.git', 'node_modules', 'bin', 'obj', 'testresults',
        'artifacts', 'dist', 'coverage', '.next'
    ) + @($AdditionalExcludedNames | ForEach-Object { $_.ToLowerInvariant() })
    return $excluded -contains $Name.ToLowerInvariant()
}

function Get-AuditFilesUnderRoot {
    param(
        [Parameter(Mandatory = $true)][string]$ResolvedRoot,
        [Parameter(Mandatory = $true)][string]$FilePattern,
        [string[]]$AdditionalExcludedDirectoryNames = @()
    )

    # Do not use Get-ChildItem -Recurse followed by Where-Object: that still
    # traverses node_modules/build trees before discarding their files. The
    # explicit stack prunes excluded and reparse directories before descent.
    $files = New-Object System.Collections.Generic.List[System.IO.FileInfo]
    $pending = New-Object System.Collections.Generic.Stack[string]
    $pending.Push($ResolvedRoot)
    while ($pending.Count -gt 0) {
        $directory = $pending.Pop()
        foreach ($item in Get-ChildItem -LiteralPath $directory -Force -ErrorAction Stop) {
            if ($item.PSIsContainer) {
                if (($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
                    continue
                }
                if (Test-IsExcludedDiscoveryDirectoryName `
                    -Name $item.Name `
                    -AdditionalExcludedNames $AdditionalExcludedDirectoryNames) {
                    continue
                }
                $pending.Push($item.FullName)
                continue
            }
            if ($item.Name -like $FilePattern) {
                $files.Add($item)
            }
        }
    }
    return @($files)
}

function ConvertFrom-AuditProjectList {
    param([string[]]$Lines)

    $projects = @()
    foreach ($line in $Lines) {
        if ($null -eq $line) {
            continue
        }
        $trimmed = $line.Trim()
        if ($trimmed.Length -eq 0 -or $trimmed.StartsWith('#')) {
            continue
        }
        $projects += $trimmed
    }
    return $projects
}

function Read-AuditProjectList {
    param(
        [Parameter(Mandatory = $true)][string]$ListPath,
        [Parameter(Mandatory = $true)][string]$ResolvedRoot
    )

    $candidatePath = $ListPath
    if (-not [System.IO.Path]::IsPathRooted($candidatePath)) {
        $candidatePath = Join-Path -Path $ResolvedRoot -ChildPath $candidatePath
    }
    $item = Get-Item -LiteralPath $candidatePath -ErrorAction Stop
    if ($item.PSIsContainer) {
        throw "ProjectListPath must be a file: $ListPath"
    }
    if (-not (Test-PathWithinRoot -CandidatePath $item.FullName -ResolvedRoot $ResolvedRoot)) {
        throw "ProjectListPath is outside RootPath: $($item.FullName)"
    }
    Assert-NoReparsePointBelowRoot -CandidatePath $item.FullName -ResolvedRoot $ResolvedRoot
    return @(ConvertFrom-AuditProjectList -Lines (
        Get-Content -LiteralPath $item.FullName -Encoding UTF8))
}

function Read-UnavailableRuntimeHosts {
    param(
        [Parameter(Mandatory = $true)][string]$InventoryPath,
        [Parameter(Mandatory = $true)][string]$ResolvedRoot
    )

    $candidatePath = $InventoryPath
    if (-not [System.IO.Path]::IsPathRooted($candidatePath)) {
        $candidatePath = Join-Path -Path $ResolvedRoot -ChildPath $candidatePath
    }
    $item = Get-Item -LiteralPath $candidatePath -ErrorAction Stop
    if ($item.PSIsContainer) {
        throw "Unavailable runtime host inventory must be a file: $InventoryPath"
    }
    Assert-NoReparsePointBelowRoot -CandidatePath $item.FullName -ResolvedRoot $ResolvedRoot

    $document = Get-Content -LiteralPath $item.FullName -Raw -Encoding UTF8 |
        ConvertFrom-Json
    if ($null -eq $document -or $document.schemaVersion -ne 1) {
        throw 'Unavailable runtime host inventory schemaVersion must be 1.'
    }

    $hosts = @()
    foreach ($hostEntry in @($document.hosts)) {
        $normalized = [ordered]@{}
        foreach ($propertyName in @('service', 'sourceState', 'recoveryTask', 'evidence')) {
            $property = $hostEntry.PSObject.Properties[$propertyName]
            if ($null -eq $property -or
                [string]::IsNullOrWhiteSpace([string]$property.Value)) {
                throw "Unavailable runtime host entry requires '$propertyName'."
            }
            $normalized[$propertyName] = [string]$property.Value
        }
        $hosts += [pscustomobject]$normalized
    }

    $duplicateServices = @($hosts | Group-Object service | Where-Object Count -gt 1)
    if ($duplicateServices.Count -gt 0) {
        throw "Unavailable runtime host inventory contains duplicate service names."
    }
    return @($hosts | Sort-Object service)
}

function Resolve-AuditProjects {
    param(
        [string[]]$RequestedProjects,
        [bool]$DiscoverProjects,
        [Parameter(Mandatory = $true)][string]$ResolvedRoot
    )

    $candidates = New-Object System.Collections.Generic.List[string]
    foreach ($requested in $RequestedProjects) {
        if ([string]::IsNullOrWhiteSpace($requested)) {
            continue
        }
        $candidates.Add($requested)
    }

    if ($DiscoverProjects) {
        Get-AuditFilesUnderRoot -ResolvedRoot $ResolvedRoot -FilePattern '*.csproj' |
            ForEach-Object { $candidates.Add($_.FullName) }
    }

    if ($candidates.Count -eq 0) {
        throw 'Specify at least one -Project or pass -Discover explicitly.'
    }

    $resolved = New-Object System.Collections.Generic.List[string]
    foreach ($candidate in $candidates) {
        $candidatePath = $candidate
        if (-not [System.IO.Path]::IsPathRooted($candidatePath)) {
            $candidatePath = Join-Path -Path $ResolvedRoot -ChildPath $candidatePath
        }

        $item = Get-Item -LiteralPath $candidatePath -ErrorAction Stop
        if ($item.PSIsContainer -or $item.Extension -ne '.csproj') {
            throw "Audit target must be an existing .csproj file: $candidate"
        }
        if (-not (Test-PathWithinRoot -CandidatePath $item.FullName -ResolvedRoot $ResolvedRoot)) {
            throw "Audit target is outside RootPath: $($item.FullName)"
        }
        Assert-NoReparsePointBelowRoot -CandidatePath $item.FullName -ResolvedRoot $ResolvedRoot
        $resolved.Add($item.FullName)
    }

    return @($resolved | Sort-Object -Unique)
}

function Assert-ReleaseHostInventoryMatchesCheckout {
    param(
        [Parameter(Mandatory = $true)][string[]]$ConfiguredProjects,
        [Parameter(Mandatory = $true)][string]$ResolvedRoot
    )

    $discovered = New-Object System.Collections.Generic.List[string]
    $programFiles = Get-AuditFilesUnderRoot `
        -ResolvedRoot $ResolvedRoot `
        -FilePattern 'Program.cs' `
        -AdditionalExcludedDirectoryNames @('script', 'scripts', 'test', 'tests')
    foreach ($programFile in $programFiles) {
        $projectFiles = @(Get-ChildItem -LiteralPath $programFile.DirectoryName `
            -File -Filter '*.csproj')
        if ($projectFiles.Count -ne 1) {
            throw "Runtime entrypoint directory must contain exactly one .csproj: $($programFile.DirectoryName)"
        }
        Assert-NoReparsePointBelowRoot `
            -CandidatePath $projectFiles[0].FullName `
            -ResolvedRoot $ResolvedRoot
        $discovered.Add($projectFiles[0].FullName)
    }

    $isWindows = [System.Environment]::OSVersion.Platform -eq
        [System.PlatformID]::Win32NT
    $configuredSet = @($ConfiguredProjects | ForEach-Object {
        $fullPath = [System.IO.Path]::GetFullPath($_)
        if ($isWindows) { $fullPath.ToLowerInvariant() } else { $fullPath }
    } | Sort-Object -Unique)
    $discoveredSet = @($discovered | ForEach-Object {
        $fullPath = [System.IO.Path]::GetFullPath($_)
        if ($isWindows) { $fullPath.ToLowerInvariant() } else { $fullPath }
    } | Sort-Object -Unique)

    $missingFromConfig = @($discoveredSet | Where-Object {
        $_ -notin $configuredSet
    })
    $missingEntrypoint = @($configuredSet | Where-Object {
        $_ -notin $discoveredSet
    })
    if ($missingFromConfig.Count -gt 0 -or $missingEntrypoint.Count -gt 0) {
        $missingText = ($missingFromConfig -join ', ')
        $staleText = ($missingEntrypoint -join ', ')
        throw "Release host inventory drift. Unconfigured entrypoints: [$missingText]. Configured without Program.cs: [$staleText]."
    }
}

function ConvertFrom-DotNetVulnerabilityOutput {
    param([AllowEmptyString()][string]$Output)

    $findings = @()
    $currentPackage = $null
    $currentVersion = $null
    $directPattern = '^\s*>\s+(?<package>\S+)\s+(?<requested>\S+)\s+(?<version>\S+)\s+(?<severity>Critical|High|Moderate|Low)\s+(?<url>https?://\S+)\s*$'
    $transitivePattern = '^\s*>\s+(?<package>\S+)\s+(?<version>\S+)\s+(?<severity>Critical|High|Moderate|Low)\s+(?<url>https?://\S+)\s*$'
    $continuationPattern = '^\s+(?<severity>Critical|High|Moderate|Low)\s+(?<url>https?://\S+)\s*$'

    foreach ($line in ($Output -split "`r?`n")) {
        $packageRow = [regex]::Match($line, $directPattern)
        if (-not $packageRow.Success) {
            $packageRow = [regex]::Match($line, $transitivePattern)
        }
        if ($packageRow.Success) {
            $currentPackage = $packageRow.Groups['package'].Value
            $currentVersion = $packageRow.Groups['version'].Value
            $findings += [pscustomobject][ordered]@{
                package = $currentPackage
                resolvedVersion = $currentVersion
                severity = $packageRow.Groups['severity'].Value
                advisoryUrl = $packageRow.Groups['url'].Value
            }
            continue
        }

        $continuation = [regex]::Match($line, $continuationPattern)
        if ($continuation.Success -and $null -ne $currentPackage) {
            $findings += [pscustomobject][ordered]@{
                package = $currentPackage
                resolvedVersion = $currentVersion
                severity = $continuation.Groups['severity'].Value
                advisoryUrl = $continuation.Groups['url'].Value
            }
            continue
        }

        # A continuation may only belong to the immediately preceding package
        # row (or another advisory of that same row). Framework/table headers,
        # blank lines and unknown output reset ownership fail-closed.
        $currentPackage = $null
        $currentVersion = $null
    }

    return @($findings)
}

function Test-DotNetAuditSourceUnavailable {
    param([AllowEmptyString()][string]$Output)

    # NU1900 is NuGet's stable diagnostic code for unavailable vulnerability
    # data. It can be emitted as a warning with process exit code 0, therefore
    # relying on the native exit code would turn a degraded feed into Clean.
    return $Output -match '(?im)\bNU1900\b'
}

function Test-DotNetAuditParseIncomplete {
    param(
        [AllowEmptyString()][string]$Output,
        [object[]]$ParsedFindings
    )

    # If NuGet changes column shape, a permissive regex must never silently
    # downgrade a vulnerable row to Clean. Count every severity+advisory row
    # independently from the package parser and fail the audit on mismatch.
    $candidateRows = @($Output -split "`r?`n" | Where-Object {
        $_ -match '(?i)\b(Critical|High|Moderate|Low)\s+(https?://\S+)\s*$'
    }).Count
    return $candidateRows -ne @($ParsedFindings).Count
}

function Get-SeverityRank {
    param([Parameter(Mandatory = $true)][string]$Severity)

    switch ($Severity) {
        'Low' { return 1 }
        'Moderate' { return 2 }
        'High' { return 3 }
        'Critical' { return 4 }
        'None' { return [int]::MaxValue }
        default { throw "Unknown severity: $Severity" }
    }
}

function Test-FindingFailsThreshold {
    param(
        [Parameter(Mandatory = $true)][string]$Severity,
        [Parameter(Mandatory = $true)][string]$Threshold
    )

    if ($Threshold -eq 'None') {
        return $false
    }
    return (Get-SeverityRank -Severity $Severity) -ge
        (Get-SeverityRank -Severity $Threshold)
}

function Wait-TasksBounded {
    param(
        [Parameter(Mandatory = $true)][object[]]$Tasks,
        [Parameter(Mandatory = $true)][int]$TimeoutMilliseconds
    )

    $wait = [System.Diagnostics.Stopwatch]::StartNew()
    do {
        $allCompleted = $true
        foreach ($task in $Tasks) {
            if (-not $task.IsCompleted) {
                $allCompleted = $false
                break
            }
        }
        if ($allCompleted) {
            return $true
        }
        if ($wait.ElapsedMilliseconds -ge $TimeoutMilliseconds) {
            return $false
        }
        Start-Sleep -Milliseconds 25
    } while ($true)
}

function Get-CompletedStringTaskResult {
    param([Parameter(Mandatory = $true)][object]$Task)

    if ($Task.Status -eq [System.Threading.Tasks.TaskStatus]::RanToCompletion) {
        return [string]$Task.Result
    }
    return ''
}

function Test-TasksCompletedSuccessfully {
    param([Parameter(Mandatory = $true)][object[]]$Tasks)

    foreach ($task in $Tasks) {
        if ($task.Status -ne [System.Threading.Tasks.TaskStatus]::RanToCompletion) {
            return $false
        }
    }
    return $true
}

function New-AuditProcessJob {
    if ([System.Environment]::OSVersion.Platform -ne [System.PlatformID]::Win32NT) {
        return $null
    }

    if ($null -eq ('JoineryTechAuditProcessJob' -as [type])) {
        Add-Type -TypeDefinition @'
using System;
using System.ComponentModel;
using System.Diagnostics;
using System.Runtime.InteropServices;

[StructLayout(LayoutKind.Sequential)]
internal struct JOBOBJECT_BASIC_LIMIT_INFORMATION
{
    public long PerProcessUserTimeLimit;
    public long PerJobUserTimeLimit;
    public uint LimitFlags;
    public UIntPtr MinimumWorkingSetSize;
    public UIntPtr MaximumWorkingSetSize;
    public uint ActiveProcessLimit;
    public UIntPtr Affinity;
    public uint PriorityClass;
    public uint SchedulingClass;
}

[StructLayout(LayoutKind.Sequential)]
internal struct IO_COUNTERS
{
    public ulong ReadOperationCount;
    public ulong WriteOperationCount;
    public ulong OtherOperationCount;
    public ulong ReadTransferCount;
    public ulong WriteTransferCount;
    public ulong OtherTransferCount;
}

[StructLayout(LayoutKind.Sequential)]
internal struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION
{
    public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation;
    public IO_COUNTERS IoInfo;
    public UIntPtr ProcessMemoryLimit;
    public UIntPtr JobMemoryLimit;
    public UIntPtr PeakProcessMemoryUsed;
    public UIntPtr PeakJobMemoryUsed;
}

public sealed class JoineryTechAuditProcessJob : IDisposable
{
    private const int JobObjectExtendedLimitInformation = 9;
    private const uint JobObjectLimitKillOnJobClose = 0x00002000;
    private IntPtr handle;

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern IntPtr CreateJobObject(IntPtr securityAttributes, string name);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool SetInformationJobObject(
        IntPtr job,
        int infoClass,
        ref JOBOBJECT_EXTENDED_LIMIT_INFORMATION info,
        uint length);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool TerminateJobObject(IntPtr job, uint exitCode);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool CloseHandle(IntPtr handle);

    public JoineryTechAuditProcessJob()
    {
        handle = CreateJobObject(IntPtr.Zero, null);
        if (handle == IntPtr.Zero)
            throw new Win32Exception(Marshal.GetLastWin32Error(), "CreateJobObject failed");

        var info = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION();
        info.BasicLimitInformation.LimitFlags = JobObjectLimitKillOnJobClose;
        if (!SetInformationJobObject(
            handle,
            JobObjectExtendedLimitInformation,
            ref info,
            (uint)Marshal.SizeOf(typeof(JOBOBJECT_EXTENDED_LIMIT_INFORMATION))))
        {
            var error = Marshal.GetLastWin32Error();
            CloseHandle(handle);
            handle = IntPtr.Zero;
            throw new Win32Exception(error, "SetInformationJobObject failed");
        }
    }

    public void Assign(Process process)
    {
        if (process == null) throw new ArgumentNullException("process");
        if (handle == IntPtr.Zero) throw new ObjectDisposedException(GetType().Name);
        if (!AssignProcessToJobObject(handle, process.Handle))
            throw new Win32Exception(Marshal.GetLastWin32Error(), "AssignProcessToJobObject failed");
    }

    public void Terminate()
    {
        if (handle != IntPtr.Zero && !TerminateJobObject(handle, 1))
            throw new Win32Exception(Marshal.GetLastWin32Error(), "TerminateJobObject failed");
    }

    public void Dispose()
    {
        if (handle != IntPtr.Zero)
        {
            CloseHandle(handle);
            handle = IntPtr.Zero;
        }
        GC.SuppressFinalize(this);
    }

    ~JoineryTechAuditProcessJob()
    {
        Dispose();
    }
}
'@
    }

    return New-Object JoineryTechAuditProcessJob
}

function Stop-AuditProcessTree {
    param(
        [Parameter(Mandatory = $true)][System.Diagnostics.Process]$Process,
        [AllowNull()][object]$ProcessJob,
        [ValidateRange(100, 30000)][int]$GraceMilliseconds = 5000
    )

    if ($null -ne $ProcessJob) {
        try {
            $ProcessJob.Terminate()
        }
        catch {
            # taskkill/direct fallback below still runs for a live parent.
        }
    }

    try {
        if ($Process.HasExited) {
            return $true
        }
    }
    catch {
        return $true
    }

    $isWindows = [System.Environment]::OSVersion.Platform -eq
        [System.PlatformID]::Win32NT

    if ($isWindows) {
        # Windows PowerShell 5.1 has no Process.Kill(entireProcessTree). The
        # OS taskkill primitive is invoked without a shell and with a numeric
        # PID, so descendants cannot keep inherited stdout handles open.
        $killer = New-Object System.Diagnostics.Process
        try {
            $killInfo = New-Object System.Diagnostics.ProcessStartInfo
            $killInfo.FileName = Join-Path $env:SystemRoot 'System32\taskkill.exe'
            $killInfo.Arguments = "/PID $($Process.Id) /T /F"
            $killInfo.UseShellExecute = $false
            $killInfo.CreateNoWindow = $true
            $killInfo.RedirectStandardOutput = $true
            $killInfo.RedirectStandardError = $true
            $killer.StartInfo = $killInfo
            if ($killer.Start()) {
                $killerOut = $killer.StandardOutput.ReadToEndAsync()
                $killerError = $killer.StandardError.ReadToEndAsync()
                if (-not $killer.WaitForExit($GraceMilliseconds)) {
                    try { $killer.Kill() } catch { }
                }
                [void](Wait-TasksBounded `
                    -Tasks @($killerOut, $killerError) `
                    -TimeoutMilliseconds 500)
            }
        }
        catch {
            # The direct parent kill below is a last-resort fallback. The
            # caller still returns a timeout/tool error, never Clean.
        }
        finally {
            $killer.Dispose()
        }
    }
    else {
        # PowerShell 7/.NET Core exposes Kill(bool). Resolve it by reflection
        # so this file remains parseable and runnable on Windows PS 5.1.
        try {
            $treeKill = @($Process.GetType().GetMethods() | Where-Object {
                $_.Name -eq 'Kill' -and $_.GetParameters().Count -eq 1 -and
                $_.GetParameters()[0].ParameterType -eq [bool]
            } | Select-Object -First 1)
            if ($treeKill.Count -eq 1) {
                [void]$treeKill[0].Invoke($Process, @($true))
            }
        }
        catch { }
    }

    try {
        if (-not $Process.HasExited) {
            $Process.Kill()
        }
    }
    catch { }

    try {
        return $Process.WaitForExit($GraceMilliseconds)
    }
    catch {
        return $false
    }
}

function Invoke-DotNetListProcess {
    param(
        [Parameter(Mandatory = $true)][string]$ProjectPath,
        [Parameter(Mandatory = $true)][string]$WorkingDirectory,
        [Parameter(Mandatory = $true)][bool]$AllowRestore,
        [Parameter(Mandatory = $true)][int]$TimeoutSeconds
    )

    $arguments = @('list', $ProjectPath, 'package', '--vulnerable', '--include-transitive')
    if (-not $AllowRestore) {
        $arguments += '--no-restore'
    }

    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = 'dotnet'
    $startInfo.Arguments = (($arguments | ForEach-Object {
        ConvertTo-NativeArgument -Value $_
    }) -join ' ')
    $startInfo.WorkingDirectory = $WorkingDirectory
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $startInfo
    $processJob = $null
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        $processJob = New-AuditProcessJob
        if (-not $process.Start()) {
            throw 'Failed to start dotnet.'
        }
        if ($null -ne $processJob) {
            try {
                $processJob.Assign($process)
            }
            catch {
                [void](Stop-AuditProcessTree `
                    -Process $process `
                    -ProcessJob $processJob `
                    -GraceMilliseconds 1000)
                throw
            }
        }
        $stdoutTask = $process.StandardOutput.ReadToEndAsync()
        $stderrTask = $process.StandardError.ReadToEndAsync()
        $completed = $process.WaitForExit($TimeoutSeconds * 1000)
        $terminationCompleted = $true
        if (-not $completed) {
            $terminationCompleted = Stop-AuditProcessTree `
                -Process $process `
                -ProcessJob $processJob `
                -GraceMilliseconds 5000
        }

        # Never call Task.Result until both redirected streams reached a
        # terminal state. A descendant with inherited handles must not turn
        # either a normal exit or timeout into an unbounded wait.
        $captureCompleted = Wait-TasksBounded `
            -Tasks @($stdoutTask, $stderrTask) `
            -TimeoutMilliseconds 2000
        if (-not $captureCompleted -and $completed) {
            $terminationCompleted = Stop-AuditProcessTree `
                -Process $process `
                -ProcessJob $processJob `
                -GraceMilliseconds 1000
            [void](Wait-TasksBounded `
                -Tasks @($stdoutTask, $stderrTask) `
                -TimeoutMilliseconds 1000)
        }
        $stopwatch.Stop()

        $stdoutText = Get-CompletedStringTaskResult -Task $stdoutTask
        $stderrText = Get-CompletedStringTaskResult -Task $stderrTask
        $captureError = -not $captureCompleted -or
            -not (Test-TasksCompletedSuccessfully -Tasks @($stdoutTask, $stderrTask))
        if (-not $terminationCompleted) {
            $captureError = $true
            $stderrText = ($stderrText + "`nProcess tree did not terminate within the bounded grace period.").Trim()
        }

        return [pscustomobject][ordered]@{
            timedOut = -not $completed
            exitCode = if ($completed) { $process.ExitCode } else { $null }
            captureError = $captureError
            stdout = $stdoutText
            stderr = $stderrText
            durationMs = $stopwatch.ElapsedMilliseconds
        }
    }
    finally {
        if ($null -ne $processJob) {
            $processJob.Dispose()
        }
        $process.Dispose()
    }
}

function Invoke-DotNetPackageAudit {
    param(
        [string[]]$RequestedProjects,
        [bool]$DiscoverProjects,
        [object[]]$UnavailableRuntimeHosts = @(),
        [Parameter(Mandatory = $true)][string]$AuditRoot,
        [Parameter(Mandatory = $true)][bool]$AllowRestore,
        [Parameter(Mandatory = $true)][string]$SeverityThreshold,
        [Parameter(Mandatory = $true)][int]$TimeoutSeconds
    )

    $root = (Resolve-Path -LiteralPath $AuditRoot -ErrorAction Stop).Path
    $projects = Resolve-AuditProjects `
        -RequestedProjects $RequestedProjects `
        -DiscoverProjects $DiscoverProjects `
        -ResolvedRoot $root
    $results = @()

    foreach ($projectPath in $projects) {
        $relativePath = $projectPath.Substring($root.Length).TrimStart('\', '/')
        $invocation = Invoke-DotNetListProcess `
            -ProjectPath $projectPath `
            -WorkingDirectory $root `
            -AllowRestore $AllowRestore `
            -TimeoutSeconds $TimeoutSeconds
        $combinedOutput = ($invocation.stdout + "`n" + $invocation.stderr).Trim()
        $findings = @(ConvertFrom-DotNetVulnerabilityOutput -Output $combinedOutput)
        $auditSourceUnavailable = Test-DotNetAuditSourceUnavailable `
            -Output $combinedOutput
        $parseIncomplete = Test-DotNetAuditParseIncomplete `
            -Output $combinedOutput `
            -ParsedFindings $findings
        $status = 'Clean'
        if ($invocation.timedOut) {
            $status = 'Timeout'
        }
        elseif ($invocation.captureError -or $invocation.exitCode -ne 0 -or
            $auditSourceUnavailable -or $parseIncomplete) {
            $status = 'AuditError'
        }
        elseif ($findings.Count -gt 0) {
            $status = 'Findings'
        }

        $diagnosticLines = @()
        if ($status -eq 'Timeout' -or $status -eq 'AuditError') {
            $diagnosticLines = @($combinedOutput -split "`r?`n" |
                Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
                Select-Object -Last 20)
        }

        $results += [pscustomobject][ordered]@{
            project = $relativePath.Replace('\', '/')
            status = $status
            durationMs = $invocation.durationMs
            exitCode = $invocation.exitCode
            findings = @($findings)
            diagnostics = $diagnosticLines
        }
    }

    $allFindings = @($results | ForEach-Object { $_.findings })
    $auditErrors = @($results | Where-Object {
        $_.status -eq 'Timeout' -or $_.status -eq 'AuditError'
    }).Count
    $blockingFindings = @($allFindings | Where-Object {
        Test-FindingFailsThreshold -Severity $_.severity -Threshold $SeverityThreshold
    }).Count
    $unavailableRuntimeHostCount = @($UnavailableRuntimeHosts).Count
    $overallStatus = 'Passed'
    $exitCode = 0
    if ($auditErrors -gt 0) {
        $overallStatus = 'AuditError'
        $exitCode = 2
    }
    elseif ($unavailableRuntimeHostCount -gt 0) {
        $overallStatus = 'Blocked'
        $exitCode = 2
    }
    elseif ($blockingFindings -gt 0) {
        $overallStatus = 'Failed'
        $exitCode = 1
    }

    $severityCounts = [ordered]@{ critical = 0; high = 0; moderate = 0; low = 0 }
    foreach ($finding in $allFindings) {
        $key = $finding.severity.ToLowerInvariant()
        $severityCounts[$key] = [int]$severityCounts[$key] + 1
    }

    return [pscustomobject][ordered]@{
        exitCode = $exitCode
        summary = [pscustomobject][ordered]@{
            schemaVersion = 1
            generatedAtUtc = [DateTime]::UtcNow.ToString('o')
            rootPath = $root
            restoreMode = if ($AllowRestore) { 'restore-allowed' } else { 'no-restore' }
            failOnSeverity = $SeverityThreshold
            projectTimeoutSeconds = $TimeoutSeconds
            overallStatus = $overallStatus
            totals = [pscustomobject][ordered]@{
                projects = $results.Count
                auditErrors = $auditErrors
                unavailableRuntimeHosts = $unavailableRuntimeHostCount
                findings = $allFindings.Count
                blockingFindings = $blockingFindings
                bySeverity = [pscustomobject]$severityCounts
            }
            unavailableRuntimeHosts = @($UnavailableRuntimeHosts)
            projects = @($results)
        }
    }
}

if ($MyInvocation.InvocationName -ne '.') {
    try {
        $resolvedRoot = (Resolve-Path -LiteralPath $RootPath -ErrorAction Stop).Path
        if ($ReleaseInventory -and
            ($Project.Count -gt 0 -or
             -not [string]::IsNullOrWhiteSpace($ProjectListPath) -or
             $Discover)) {
            throw 'ReleaseInventory cannot be combined with Project, ProjectListPath or Discover.'
        }

        $requestedProjects = @($Project)
        $unavailableRuntimeHosts = @()
        if ($ReleaseInventory) {
            $releaseProjectList = Join-Path $resolvedRoot `
                'config\nuget-release-projects.txt'
            $requestedProjects += @(Read-AuditProjectList `
                -ListPath $releaseProjectList `
                -ResolvedRoot $resolvedRoot)
            $unavailableRuntimeHosts = @(Read-UnavailableRuntimeHosts `
                -InventoryPath 'config\nuget-unavailable-runtime-hosts.json' `
                -ResolvedRoot $resolvedRoot)
        }
        if (-not [string]::IsNullOrWhiteSpace($ProjectListPath)) {
            $requestedProjects += @(Read-AuditProjectList `
                -ListPath $ProjectListPath `
                -ResolvedRoot $resolvedRoot)
        }
        $resolvedProjects = Resolve-AuditProjects `
            -RequestedProjects $requestedProjects `
            -DiscoverProjects ([bool]$Discover) `
            -ResolvedRoot $resolvedRoot
        if ($ReleaseInventory) {
            Assert-ReleaseHostInventoryMatchesCheckout `
                -ConfiguredProjects $resolvedProjects `
                -ResolvedRoot $resolvedRoot
        }
        $execution = Invoke-DotNetPackageAudit `
            -RequestedProjects $resolvedProjects `
            -DiscoverProjects $false `
            -UnavailableRuntimeHosts $unavailableRuntimeHosts `
            -AuditRoot $resolvedRoot `
            -AllowRestore ([bool]$Restore) `
            -SeverityThreshold $FailOnSeverity `
            -TimeoutSeconds $ProjectTimeoutSeconds
        $json = $execution.summary | ConvertTo-Json -Depth 10

        if (-not [string]::IsNullOrWhiteSpace($SummaryPath)) {
            $resolvedSummary = $SummaryPath
            if (-not [System.IO.Path]::IsPathRooted($resolvedSummary)) {
                $resolvedSummary = Join-Path -Path $execution.summary.rootPath -ChildPath $resolvedSummary
            }
            $summaryDirectory = Split-Path -Parent $resolvedSummary
            if (-not [string]::IsNullOrWhiteSpace($summaryDirectory) -and
                -not (Test-Path -LiteralPath $summaryDirectory)) {
                New-Item -ItemType Directory -Path $summaryDirectory -Force | Out-Null
            }
            [System.IO.File]::WriteAllText(
                [System.IO.Path]::GetFullPath($resolvedSummary),
                $json,
                (New-Object System.Text.UTF8Encoding($false)))
        }

        # Publish stdout only after every requested artifact write succeeds.
        # A SummaryPath failure is caught below and therefore still emits
        # exactly one (error) JSON document instead of success + error JSON.
        [Console]::Out.WriteLine($json)

        exit $execution.exitCode
    }
    catch {
        $failure = [pscustomobject][ordered]@{
            schemaVersion = 1
            generatedAtUtc = [DateTime]::UtcNow.ToString('o')
            overallStatus = 'UsageOrToolError'
            error = $_.Exception.Message
        }
        [Console]::Out.WriteLine(($failure | ConvertTo-Json -Depth 4))
        exit 2
    }
}
