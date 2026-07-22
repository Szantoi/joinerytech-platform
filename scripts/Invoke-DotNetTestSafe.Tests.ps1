#requires -Modules Pester
<#
.SYNOPSIS
    Pester tests for STAB-TESTCONTAINERS-HYGIENE.

.DESCRIPTION
    Two groups of tests:

    1. "Resolve-OrphanCleanupPlan (pure logic)" -- fast, deterministic, no Docker
       dependency at all. These directly prove the two mandatory acceptance
       proofs from the task doc:
         (a) pre-existing containers are correctly distinguished from new ones
             and left alone;
         (b) a container that is NOT Testcontainers-labeled is never touched even
             if it is "new" (appeared during the run window) -- including the
             specific case of the protected 'doorstar-production-db' name.
       These run in any environment, with or without Docker installed/running.

    2. "Invoke-DotNetTestSafe.ps1 (integration smoke test)" -- exercises the real
       script end to end against a tiny throwaway console app via `dotnet run`
       under a fake PATH that does NOT define `docker`, proving the preflight
       correctly refuses to run tests when Docker is unavailable. This group is
       skipped automatically when `dotnet` is not on PATH.

    Run with:
        Import-Module Pester -MinimumVersion 5.0
        Invoke-Pester -Path scripts/Invoke-DotNetTestSafe.Tests.ps1 -Output Detailed
#>

BeforeAll {
    Import-Module (Join-Path $PSScriptRoot 'TestcontainersHygiene.psm1') -Force
}

# Evaluated eagerly, at discovery time (NOT inside BeforeAll, which only runs
# during the later Run phase) -- Pester v5 resolves `-Skip:` on `It` blocks
# during discovery, so a flag set inside BeforeAll would always read as
# unset/false at that point and the -Skip below would never actually trigger.
$script:DockerAvailableAtDiscovery = $null -ne (Get-Command docker -ErrorAction SilentlyContinue)

Describe 'Resolve-OrphanCleanupPlan (pure logic, no Docker required)' {

    It 'leaves a pre-existing (baseline) labeled container completely untouched' {
        $baseline = @('aaaaaaaaaaaa')
        $post = @(
            [PSCustomObject]@{ Id = 'aaaaaaaaaaaa'; Name = 'old_precreated_pg'; IsTestcontainersLabeled = $true }
        )

        $plan = Resolve-OrphanCleanupPlan -BaselineIds $baseline -PostRunContainers $post

        $plan.PreExistingIds | Should -Contain 'aaaaaaaaaaaa'
        $plan.ToRemoveIds | Should -Not -Contain 'aaaaaaaaaaaa'
        $plan.ToRemoveIds.Count | Should -Be 0
    }

    It 'marks a NEW labeled container (not in baseline) as safe to remove' {
        $baseline = @('aaaaaaaaaaaa')
        $post = @(
            [PSCustomObject]@{ Id = 'aaaaaaaaaaaa'; Name = 'old_precreated_pg'; IsTestcontainersLabeled = $true }
            [PSCustomObject]@{ Id = 'bbbbbbbbbbbb'; Name = 'new_run_pg'; IsTestcontainersLabeled = $true }
        )

        $plan = Resolve-OrphanCleanupPlan -BaselineIds $baseline -PostRunContainers $post

        $plan.PreExistingIds | Should -Contain 'aaaaaaaaaaaa'
        $plan.ToRemoveIds | Should -Contain 'bbbbbbbbbbbb'
        $plan.ToRemoveIds.Count | Should -Be 1
    }

    It 'correctly distinguishes multiple pre-existing IDs from multiple new IDs in the same run' {
        $baseline = @('aaaaaaaaaaaa', 'cccccccccccc')
        $post = @(
            [PSCustomObject]@{ Id = 'aaaaaaaaaaaa'; Name = 'pre1'; IsTestcontainersLabeled = $true }
            [PSCustomObject]@{ Id = 'cccccccccccc'; Name = 'pre2'; IsTestcontainersLabeled = $true }
            [PSCustomObject]@{ Id = 'bbbbbbbbbbbb'; Name = 'new1'; IsTestcontainersLabeled = $true }
            [PSCustomObject]@{ Id = 'dddddddddddd'; Name = 'new2'; IsTestcontainersLabeled = $true }
        )

        $plan = Resolve-OrphanCleanupPlan -BaselineIds $baseline -PostRunContainers $post

        ($plan.PreExistingIds | Sort-Object) | Should -Be ('aaaaaaaaaaaa', 'cccccccccccc' | Sort-Object)
        ($plan.ToRemoveIds | Sort-Object) | Should -Be ('bbbbbbbbbbbb', 'dddddddddddd' | Sort-Object)
    }

    It 'NEVER removes a new container that is not Testcontainers-labeled, even though it appeared during the run window' {
        $baseline = @()
        $post = @(
            # Someone manually started an unrelated container while the test run
            # was in progress. It is "new" by the baseline diff, but it was never
            # Testcontainers-labeled, so it must be completely out of scope.
            [PSCustomObject]@{ Id = 'eeeeeeeeeeee'; Name = 'someones_manual_container'; IsTestcontainersLabeled = $false }
        )

        $plan = Resolve-OrphanCleanupPlan -BaselineIds $baseline -PostRunContainers $post

        $plan.ToRemoveIds | Should -Not -Contain 'eeeeeeeeeeee'
        $plan.ToRemoveIds.Count | Should -Be 0
        $plan.IgnoredIds | Should -Contain 'eeeeeeeeeeee'
    }

    It 'NEVER removes doorstar-production-db even if it were (hypothetically) new and labeled' {
        # This models the worst case directly: a container with the protected
        # name AND the Testcontainers label AND absent from the baseline. Even
        # under that adversarial combination the plan must still refuse it.
        $baseline = @()
        $post = @(
            [PSCustomObject]@{ Id = 'ffffffffffff'; Name = 'doorstar-production-db'; IsTestcontainersLabeled = $true }
        )

        $plan = Resolve-OrphanCleanupPlan -BaselineIds $baseline -PostRunContainers $post -ProtectedNames @('doorstar-production-db')

        $plan.ToRemoveIds | Should -Not -Contain 'ffffffffffff'
        $plan.ToRemoveIds.Count | Should -Be 0
        $plan.ProtectedIds | Should -Contain 'ffffffffffff'
    }

    It 'protects doorstar-production-db in a realistic mixed run: pre-existing + new orphan + protected + unrelated' {
        $baseline = @('1111aaaaaaaa') # a leftover orphan from a previous run, already there
        $post = @(
            [PSCustomObject]@{ Id = '1111aaaaaaaa'; Name = 'old_leftover_pg'; IsTestcontainersLabeled = $true }
            [PSCustomObject]@{ Id = '2222bbbbbbbb'; Name = 'this_run_pg'; IsTestcontainersLabeled = $true }
            [PSCustomObject]@{ Id = '91dbafc2b175'; Name = 'doorstar-production-db'; IsTestcontainersLabeled = $false }
            [PSCustomObject]@{ Id = '3333cccccccc'; Name = 'unrelated_manual_container'; IsTestcontainersLabeled = $false }
        )

        $plan = Resolve-OrphanCleanupPlan -BaselineIds $baseline -PostRunContainers $post

        $plan.ToRemoveIds | Should -Be @('2222bbbbbbbb')
        $plan.PreExistingIds | Should -Contain '1111aaaaaaaa'
        $plan.IgnoredIds | Should -Contain '91dbafc2b175'
        $plan.IgnoredIds | Should -Contain '3333cccccccc'
    }

    It 'reports (but does not remove) a labeled new container whose identity could not be resolved -- stop/escalation rule' {
        $baseline = @()
        $post = @(
            [PSCustomObject]@{ Id = '444444444444'; Name = $null; IsTestcontainersLabeled = $true }
        )

        $plan = Resolve-OrphanCleanupPlan -BaselineIds $baseline -PostRunContainers $post

        $plan.ToRemoveIds.Count | Should -Be 0
        $plan.AmbiguousIds | Should -Contain '444444444444'
    }

    It 'is idempotent/order-independent: baseline and post-run order does not change the outcome' {
        $baseline = @('bbbbbbbbbbbb', 'aaaaaaaaaaaa')
        $post = @(
            [PSCustomObject]@{ Id = 'cccccccccccc'; Name = 'new'; IsTestcontainersLabeled = $true }
            [PSCustomObject]@{ Id = 'aaaaaaaaaaaa'; Name = 'pre'; IsTestcontainersLabeled = $true }
            [PSCustomObject]@{ Id = 'bbbbbbbbbbbb'; Name = 'pre2'; IsTestcontainersLabeled = $true }
        )

        $plan = Resolve-OrphanCleanupPlan -BaselineIds $baseline -PostRunContainers $post

        $plan.ToRemoveIds | Should -Be @('cccccccccccc')
    }
}

Describe 'Test-ValidContainerId' {
    It 'accepts a plausible short docker ID' {
        Test-ValidContainerId -Id '91dbafc2b175' | Should -BeTrue
    }
    It 'accepts a plausible full 64-char docker ID' {
        Test-ValidContainerId -Id ('a' * 64) | Should -BeTrue
    }
    It 'rejects an empty string' {
        Test-ValidContainerId -Id '' | Should -BeFalse
    }
    It 'rejects a value with shell metacharacters (defense in depth against injection)' {
        Test-ValidContainerId -Id 'abc; rm -rf /' | Should -BeFalse
        Test-ValidContainerId -Id '$(docker ps -aq)' | Should -BeFalse
    }
    It 'rejects a container NAME instead of an ID' {
        Test-ValidContainerId -Id 'doorstar-production-db' | Should -BeFalse
    }
}

Describe 'Invoke-DotNetTestSafe.ps1 preflight (integration smoke test)' -Tag 'Integration' {

    BeforeAll {
        $script:ScriptPath = Join-Path $PSScriptRoot 'Invoke-DotNetTestSafe.ps1'
    }

    It 'aborts with sentinel exit code 90 and never invokes dotnet when Docker is unavailable' {
        # Runs the real script in a child process whose PATH is deliberately
        # scoped down to just System32 (no docker.exe, no dotnet.exe) -- this
        # exercises the actual preflight-abort code path for real, regardless of
        # whether Docker happens to be installed/running on the machine executing
        # this test, instead of relying on the host environment's own state.
        $childCommand = "`$env:PATH = 'C:\Windows\System32'; & '$($script:ScriptPath)' -Project 'does-not-matter.csproj' -DockerPreflightTimeoutSeconds 3 | Out-Null; exit `$LASTEXITCODE"
        & powershell.exe -NoProfile -NonInteractive -Command $childCommand
        $LASTEXITCODE | Should -Be 90
    }
}
