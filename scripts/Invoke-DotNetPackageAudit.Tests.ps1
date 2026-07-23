#requires -Version 5.1

BeforeAll {
    . "$PSScriptRoot/Invoke-DotNetPackageAudit.ps1"
}

Describe 'ConvertFrom-DotNetVulnerabilityOutput' {
    It 'parses direct rows with requested and resolved versions' {
        $sample = @'
Project `Example` has the following vulnerable packages
   Top-level Package        Requested   Resolved   Severity   Advisory URL
   > AutoMapper             13.0.2      14.0.0     High       https://github.com/advisories/GHSA-rvv3-g6hj-g44x
'@

        $result = @(ConvertFrom-DotNetVulnerabilityOutput -Output $sample)

        $result | Should -HaveCount 1
        $result[0].package | Should -Be 'AutoMapper'
        $result[0].resolvedVersion | Should -Be '14.0.0'
        $result[0].severity | Should -Be 'High'
    }

    It 'parses primary and continuation advisory rows without losing package ownership' {
        $sample = @'
Project `Example` has the following vulnerable packages
   Transitive Package                         Resolved   Severity   Advisory URL
   > Npgsql                                   8.0.0      High       https://github.com/advisories/GHSA-x9vc-6hfv-hg8c
   > System.Text.Json                         8.0.0      High       https://github.com/advisories/GHSA-hh2w-p6rv-4g7w
                                                               High       https://github.com/advisories/GHSA-8g4q-xg66-9fp4
'@

        $result = @(ConvertFrom-DotNetVulnerabilityOutput -Output $sample)

        $result.Count | Should -Be 3
        $result[0].package | Should -Be 'Npgsql'
        $result[1].package | Should -Be 'System.Text.Json'
        $result[2].package | Should -Be 'System.Text.Json'
        $result[2].resolvedVersion | Should -Be '8.0.0'
        $result[2].advisoryUrl | Should -Be 'https://github.com/advisories/GHSA-8g4q-xg66-9fp4'
    }

    It 'returns an empty collection for a clean audit' {
        $result = @(ConvertFrom-DotNetVulnerabilityOutput -Output 'has no vulnerable packages')
        $result.Count | Should -Be 0
    }

    It 'does not attach a continuation across a framework or table boundary' {
        $sample = @'
   > System.Text.Json 8.0.0 High https://github.com/advisories/GHSA-one
[net9.0]:
   Top-level Package Requested Resolved Severity Advisory URL
                              High https://github.com/advisories/GHSA-two
'@

        $result = @(ConvertFrom-DotNetVulnerabilityOutput -Output $sample)

        $result | Should -HaveCount 1
        $result[0].advisoryUrl | Should -Be 'https://github.com/advisories/GHSA-one'
    }
}

Describe 'audit source diagnostics' {
    It 'fails closed for NU1900 even when dotnet can exit successfully' {
        (Test-DotNetAuditSourceUnavailable -Output `
            'warning NU1900: Error occurred while getting package vulnerability data') |
            Should -BeTrue
        (Test-DotNetAuditSourceUnavailable -Output 'has no vulnerable packages') |
            Should -BeFalse
    }

    It 'fails closed when a vulnerability-shaped row was not parsed' {
        $changedShape = '   > Package [1.0, 2.0) 1.5.0 High https://example.test/GHSA-x'

        (Test-DotNetAuditParseIncomplete `
            -Output $changedShape `
            -ParsedFindings @()) | Should -BeTrue
        (Test-DotNetAuditParseIncomplete `
            -Output 'has no vulnerable packages' `
            -ParsedFindings @()) | Should -BeFalse
    }
}

Describe 'severity threshold' {
    It 'fails findings at or above the configured threshold' {
        (Test-FindingFailsThreshold -Severity Critical -Threshold High) | Should -BeTrue
        (Test-FindingFailsThreshold -Severity High -Threshold High) | Should -BeTrue
        (Test-FindingFailsThreshold -Severity Moderate -Threshold High) | Should -BeFalse
    }

    It 'supports an explicit report-only threshold' {
        (Test-FindingFailsThreshold -Severity Critical -Threshold None) | Should -BeFalse
    }
}

Describe 'native argument quoting' {
    It 'leaves simple switches untouched' {
        (ConvertTo-NativeArgument -Value '--no-restore') | Should -Be '--no-restore'
    }

    It 'quotes a project path containing spaces' {
        (ConvertTo-NativeArgument -Value 'C:\work tree\module.csproj') |
            Should -Be '"C:\work tree\module.csproj"'
    }
}

Describe 'Resolve-AuditProjects' {
    It 'requires an explicit project or Discover opt-in' {
        $root = (Resolve-Path -LiteralPath $PSScriptRoot).Path
        { Resolve-AuditProjects -RequestedProjects @() -DiscoverProjects $false -ResolvedRoot $root } |
            Should -Throw '*Specify at least one*'
    }

    It 'rejects a project reached through a junction below RootPath' `
        -Skip:([System.Environment]::OSVersion.Platform -ne [System.PlatformID]::Win32NT) {
        $root = Join-Path $TestDrive 'root'
        $outside = Join-Path $TestDrive 'outside'
        $link = Join-Path $root 'linked'
        New-Item -ItemType Directory -Path $root, $outside -Force | Out-Null
        Set-Content -LiteralPath (Join-Path $outside 'Outside.csproj') -Value '<Project />'
        New-Item -ItemType Junction -Path $link -Target $outside | Out-Null

        { Resolve-AuditProjects `
            -RequestedProjects @((Join-Path $link 'Outside.csproj')) `
            -DiscoverProjects $false `
            -ResolvedRoot $root } | Should -Throw '*reparse point*'
    }
}

Describe 'discovery exclusions' {
    It 'excludes dependency and generated build trees' {
        (Test-IsExcludedDiscoveryPath -Path 'C:\repo\node_modules\x\x.csproj') |
            Should -BeTrue
        (Test-IsExcludedDiscoveryPath -Path 'C:\repo\src\obj\x.csproj') |
            Should -BeTrue
        (Test-IsExcludedDiscoveryPath -Path 'C:\repo\artifacts\x.csproj') |
            Should -BeTrue
        (Test-IsExcludedDiscoveryPath -Path 'C:\repo\src\x.csproj') |
            Should -BeFalse
    }
}

Describe 'bounded task waits' {
    It 'returns without blocking when a redirected stream never completes' {
        $pending = New-Object 'System.Threading.Tasks.TaskCompletionSource[string]'
        $timer = [System.Diagnostics.Stopwatch]::StartNew()

        $completed = Wait-TasksBounded -Tasks @($pending.Task) -TimeoutMilliseconds 100

        $completed | Should -BeFalse
        $timer.ElapsedMilliseconds | Should -BeLessThan 1000
    }

    It 'distinguishes faulted stream tasks from successful completion' {
        $failed = New-Object 'System.Threading.Tasks.TaskCompletionSource[string]'
        $failed.SetException((New-Object System.InvalidOperationException 'read failed'))

        (Wait-TasksBounded -Tasks @($failed.Task) -TimeoutMilliseconds 100) |
            Should -BeTrue
        (Test-TasksCompletedSuccessfully -Tasks @($failed.Task)) |
            Should -BeFalse
        (Get-CompletedStringTaskResult -Task $failed.Task) | Should -Be ''
    }
}

Describe 'Invoke-DotNetPackageAudit fail-closed classification' {
    It 'returns AuditError for a successful native exit with NU1900' {
        $root = Join-Path $TestDrive 'nu1900-root'
        New-Item -ItemType Directory -Path $root -Force | Out-Null
        $project = Join-Path $root 'Example.csproj'
        Set-Content -LiteralPath $project -Value '<Project />'
        Mock Invoke-DotNetListProcess {
            [pscustomobject]@{
                timedOut = $false
                exitCode = 0
                captureError = $false
                stdout = 'warning NU1900: vulnerability data is unavailable'
                stderr = ''
                durationMs = 1
            }
        }

        $execution = Invoke-DotNetPackageAudit `
            -RequestedProjects @($project) `
            -DiscoverProjects $false `
            -AuditRoot $root `
            -AllowRestore $false `
            -SeverityThreshold High `
            -TimeoutSeconds 10

        $execution.exitCode | Should -Be 2
        $execution.summary.overallStatus | Should -Be 'AuditError'
        $execution.summary.totals.auditErrors | Should -Be 1
    }

    It 'blocks a release summary while any runtime host source is unavailable' {
        $root = Join-Path $TestDrive 'blocked-root'
        New-Item -ItemType Directory -Path $root -Force | Out-Null
        $project = Join-Path $root 'Example.csproj'
        Set-Content -LiteralPath $project -Value '<Project />'
        Mock Invoke-DotNetListProcess {
            [pscustomobject]@{
                timedOut = $false
                exitCode = 0
                captureError = $false
                stdout = 'has no vulnerable packages'
                stderr = ''
                durationMs = 1
            }
        }

        $execution = Invoke-DotNetPackageAudit `
            -RequestedProjects @($project) `
            -DiscoverProjects $false `
            -UnavailableRuntimeHosts @([pscustomobject]@{ service = 'missing-host' }) `
            -AuditRoot $root `
            -AllowRestore $false `
            -SeverityThreshold High `
            -TimeoutSeconds 10

        $execution.exitCode | Should -Be 2
        $execution.summary.overallStatus | Should -Be 'Blocked'
        $execution.summary.totals.unavailableRuntimeHosts | Should -Be 1
    }
}

Describe 'release inventory integrity' {
    It 'matches every checked-out non-script Program.cs entrypoint' {
        $repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
        $projects = @(Read-AuditProjectList `
            -ListPath 'config\nuget-release-projects.txt' `
            -ResolvedRoot $repoRoot)
        $resolved = @(Resolve-AuditProjects `
            -RequestedProjects $projects `
            -DiscoverProjects $false `
            -ResolvedRoot $repoRoot)

        { Assert-ReleaseHostInventoryMatchesCheckout `
            -ConfiguredProjects $resolved `
            -ResolvedRoot $repoRoot } | Should -Not -Throw
    }

    It 'records the currently unavailable VPS runtime hosts explicitly' {
        $repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
        $hosts = @(Read-UnavailableRuntimeHosts `
            -InventoryPath 'config\nuget-unavailable-runtime-hosts.json' `
            -ResolvedRoot $repoRoot)

        $hosts | Should -HaveCount 3
        $hosts.service | Should -Contain 'spaceos-abstractions'
        $hosts.service | Should -Contain 'spaceos-modules-identity'
        $hosts.service | Should -Contain 'spaceos-modules-sales'
        $hosts[0].sourceState | Should -Match 'checkoutban|hostforr'
        ([int[]][char[]]$hosts[0].sourceState) | Should -Contain 225
        ($hosts.sourceState -join ' ') | Should -Not -Match ([char]0xfffd)
    }

    It 'fails when a new runtime entrypoint is not configured' {
        $root = Join-Path $TestDrive 'inventory-root'
        $first = Join-Path $root 'src\First'
        $second = Join-Path $root 'src\Second'
        New-Item -ItemType Directory -Path $first, $second -Force | Out-Null
        Set-Content -LiteralPath (Join-Path $first 'Program.cs') -Value '// entry'
        Set-Content -LiteralPath (Join-Path $first 'First.csproj') -Value '<Project />'
        Set-Content -LiteralPath (Join-Path $second 'Program.cs') -Value '// entry'
        Set-Content -LiteralPath (Join-Path $second 'Second.csproj') -Value '<Project />'

        { Assert-ReleaseHostInventoryMatchesCheckout `
            -ConfiguredProjects @((Join-Path $first 'First.csproj')) `
            -ResolvedRoot $root } | Should -Throw '*inventory drift*'
    }
}

Describe 'ConvertFrom-AuditProjectList' {
    It 'accepts comments and blank lines while preserving project order' {
        $result = @(ConvertFrom-AuditProjectList -Lines @(
            '# release hosts',
            '',
            '  src/one/One.csproj  ',
            'src/two/Two.csproj'
        ))

        $result | Should -HaveCount 2
        $result[0] | Should -Be 'src/one/One.csproj'
        $result[1] | Should -Be 'src/two/Two.csproj'
    }
}

Describe 'single JSON stdout contract' {
    It 'emits only the error JSON when SummaryPath writing fails' {
        $repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
        $project = Join-Path $repoRoot `
            'src\spaceos-modules-cutting\src\SpaceOS.Modules.Cutting.Api\SpaceOS.Modules.Cutting.Api.csproj'
        $script = Join-Path $PSScriptRoot 'Invoke-DotNetPackageAudit.ps1'

        $output = & powershell.exe -NoProfile -File $script `
            -RootPath $repoRoot `
            -Project $project `
            -SummaryPath $repoRoot 2>$null
        $nativeExitCode = $LASTEXITCODE
        $document = ($output -join "`n") | ConvertFrom-Json

        $nativeExitCode | Should -Be 2
        $document.overallStatus | Should -Be 'UsageOrToolError'
    }
}
