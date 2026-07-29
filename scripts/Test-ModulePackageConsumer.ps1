#requires -Version 5.1
<#
.SYNOPSIS
    Builds an isolated consumer against locally packed SpaceOS module packages.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string] $PackageSource,

    [Parameter(Mandatory)]
    [string] $PackageId,

    [Parameter(Mandatory)]
    [string] $Version
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$resolvedSource = [System.IO.Path]::GetFullPath($PackageSource)
if (-not (Test-Path -LiteralPath $resolvedSource -PathType Container)) {
    throw "Package source does not exist: $resolvedSource"
}

$temporaryRoot = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "spaceos-package-smoke-$([Guid]::NewGuid().ToString('N'))")
try {
    New-Item -ItemType Directory -Path $temporaryRoot | Out-Null
    & dotnet new classlib --framework net8.0 --no-restore --output $temporaryRoot
    if ($LASTEXITCODE -ne 0) { throw 'dotnet new failed.' }

    & dotnet add $temporaryRoot package $PackageId --version $Version --source $resolvedSource
    if ($LASTEXITCODE -ne 0) { throw 'Package restore failed.' }

    & dotnet build $temporaryRoot --no-restore
    if ($LASTEXITCODE -ne 0) { throw 'Consumer build failed.' }

    [pscustomobject]@{
        packageId = $PackageId
        version = $Version
        packageSource = $resolvedSource
        relativeProjectReferenceUsed = $false
        result = 'passed'
    } | ConvertTo-Json -Compress
}
finally {
    $resolvedTemporaryRoot = [System.IO.Path]::GetFullPath($temporaryRoot)
    $systemTemporaryRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
    if ($resolvedTemporaryRoot.StartsWith($systemTemporaryRoot, [System.StringComparison]::OrdinalIgnoreCase) -and
        (Test-Path -LiteralPath $resolvedTemporaryRoot)) {
        Remove-Item -LiteralPath $resolvedTemporaryRoot -Recurse -Force
    }
}
