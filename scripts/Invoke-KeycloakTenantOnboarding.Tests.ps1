#requires -Version 5.1
<#
    Pester 5.x tests for the tenant-onboarding decision logic
    (STAB-TENANT-ONBOARDING-RUNBOOK).

    Everything under test is pure: no Keycloak, no network, no Docker. The live
    realm is exercised separately (see the task doc "Átadási bizonyíték").

    Invoke-Pester -Path scripts/Invoke-KeycloakTenantOnboarding.Tests.ps1 -Output Detailed
#>

BeforeAll {
    $script:ScriptRoot = Split-Path -Parent $PSCommandPath
    $script:RepoRoot = Split-Path -Parent $script:ScriptRoot
    Import-Module (Join-Path $script:ScriptRoot 'KeycloakOnboarding.psm1') -Force
    $script:AliasMap = Get-ModuleAliasMap -Path (Join-Path $script:RepoRoot 'docs/knowledge/contracts/module-id-legacy-aliases.json')

    function New-TestProfile {
        param([hashtable] $Override = @{})
        $base = [ordered]@{
            keycloak   = [ordered]@{ baseUrl = 'https://example.test/auth'; realm = 'spaceos'; clientId = 'portal-app'; adminRealm = 'master'; adminClientId = 'admin-cli' }
            claims     = [ordered]@{ tenantIdAttribute = 'tid'; modulesAttribute = 'enabled_modules'; moduleIdFormat = 'canonical'; audiences = @('kernel-api') }
            realmRoles = @('Admin', 'Designer', 'Joiner')
            tenant     = [ordered]@{ id = '11111111-2222-4333-8444-555555555555'; name = 'Teszt Kft.'; tenantType = 'Manufacturer'; modules = @('joinerytech.cutting', 'spaceos.crm') }
            users      = @([ordered]@{ username = 'teszt.admin'; email = 'a@example.test'; firstName = 'Teszt'; lastName = 'Admin'; enabled = $true; realmRoles = @('Admin') })
        }
        foreach ($key in $Override.Keys) { $base[$key] = $Override[$key] }
        return ($base | ConvertTo-Json -Depth 8 | ConvertFrom-Json)
    }
}

Describe 'ADR-067 module alias map' {
    It 'loads both directions of the contract table' {
        $script:AliasMap.ToCanonical['crm'] | Should -Be 'spaceos.crm'
        $script:AliasMap.ToCanonical['kontrolling'] | Should -Be 'spaceos.controlling'
        $script:AliasMap.ToLegacy['joinerytech.cutting'] | Should -Be 'cutting'
    }

    It 'passes a canonical id through unchanged and rejects an unknown one' {
        ConvertTo-CanonicalModuleId -ModuleId 'spaceos.hr' -AliasMap $script:AliasMap | Should -Be 'spaceos.hr'
        ConvertTo-CanonicalModuleId -ModuleId 'hr' -AliasMap $script:AliasMap | Should -Be 'spaceos.hr'
        ConvertTo-CanonicalModuleId -ModuleId 'nem.letezik' -AliasMap $script:AliasMap | Should -BeNullOrEmpty
    }

    It 'guards the mirrored Kernel allowlist against drifting from the contract' {
        @(Test-KernelAllowlistDrift -AliasMap $script:AliasMap).Count | Should -Be 0
    }

    It 'mirrors the Kernel trigger allowlist exactly (Migration_0029)' {
        (Get-KernelModuleAllowlist -TenantType 'Manufacturer').Allowed | Should -Be @('door', 'cabinet', 'window', 'cutting', 'spatial')
        (Get-KernelModuleAllowlist -TenantType 'PanelCutter').Required | Should -Be @('cutting')
        Get-KernelModuleAllowlist -TenantType 'Nonexistent' | Should -BeNullOrEmpty
    }
}

Describe 'Resolve-TenantModulePlan -- the legacy/canonical split the Kernel trigger forces' {
    It 'keeps ERP modules in the claim but out of the Kernel record' {
        $plan = Resolve-TenantModulePlan -TenantType 'Manufacturer' `
            -Modules @('joinerytech.cutting', 'spaceos.crm', 'spaceos.dms') -AliasMap $script:AliasMap

        $plan.ClaimValues | Should -Contain 'spaceos.crm'
        $plan.ClaimValues | Should -Contain 'joinerytech.cutting'
        $plan.KernelEnabledModules | Should -Be @('cutting')
        @($plan.NotRepresentableInKernel | ForEach-Object { $_.ModuleId }) | Should -Be @('spaceos.crm', 'spaceos.dms')
        $plan.NotRepresentableInKernel[0].Reason | Should -Match 'validate_enabled_modules_for_type'
    }

    It 'accepts legacy short names on input and normalises them to canonical claims' {
        $plan = Resolve-TenantModulePlan -TenantType 'Manufacturer' -Modules @('cutting', 'crm') -AliasMap $script:AliasMap
        $plan.CanonicalModules | Should -Be @('joinerytech.cutting', 'spaceos.crm')
        $plan.ClaimValues | Should -Be @('joinerytech.cutting', 'spaceos.crm')
        $plan.KernelEnabledModules | Should -Be @('cutting')
    }

    It 'emits legacy claim values when the profile asks for pre-ADR-067 compatibility' {
        $plan = Resolve-TenantModulePlan -TenantType 'Manufacturer' -Modules @('spaceos.crm') -AliasMap $script:AliasMap -ClaimFormat 'legacy'
        $plan.ClaimValues | Should -Be @('crm')
    }

    It 'emits both forms during the transition' {
        $plan = Resolve-TenantModulePlan -TenantType 'Manufacturer' -Modules @('spaceos.crm') -AliasMap $script:AliasMap -ClaimFormat 'both'
        $plan.ClaimValues | Should -Be @('crm', 'spaceos.crm')
    }

    It 'reports a module a different TenantType may not have' {
        $plan = Resolve-TenantModulePlan -TenantType 'PanelCutter' -Modules @('joinerytech.cutting', 'joinerytech.door') -AliasMap $script:AliasMap
        $plan.KernelEnabledModules | Should -Be @('cutting')
        @($plan.NotRepresentableInKernel | ForEach-Object { $_.ModuleId }) | Should -Be @('joinerytech.door')
        $plan.MissingKernelRequired.Count | Should -Be 0
    }

    It 'flags a missing TenantType-required module (the INSERT would be rejected)' {
        $plan = Resolve-TenantModulePlan -TenantType 'PanelCutter' -Modules @('spaceos.crm') -AliasMap $script:AliasMap
        $plan.MissingKernelRequired | Should -Be @('cutting')
    }

    It 'collects unknown module ids instead of silently dropping them' {
        $plan = Resolve-TenantModulePlan -TenantType 'Manufacturer' -Modules @('spaceos.crm', 'valami.ismeretlen') -AliasMap $script:AliasMap
        $plan.UnknownModules | Should -Be @('valami.ismeretlen')
    }
}

Describe 'Test-OnboardingProfile -- fail before touching Keycloak' {
    It 'accepts a well-formed profile' {
        $findings = @(Test-OnboardingProfile -Profile (New-TestProfile) -AliasMap $script:AliasMap)
        @($findings | Where-Object { $_.Severity -eq 'Error' }).Count | Should -Be 0
    }

    It 'treats a missing lastName as an Error (KC24 VERIFY_PROFILE trap)' {
        $profile = New-TestProfile
        $profile.users[0].lastName = ''
        $findings = @(Test-OnboardingProfile -Profile $profile -AliasMap $script:AliasMap)
        $verifyProfile = @($findings | Where-Object { $_.Code -eq 'VerifyProfile' })
        $verifyProfile.Count | Should -Be 1
        $verifyProfile[0].Severity | Should -Be 'Error'
        $verifyProfile[0].Message | Should -Match 'Account is not fully set up'
    }

    It 'rejects an unknown TenantType before any API call' {
        $profile = New-TestProfile
        $profile.tenant.tenantType = 'Woodshop'
        $findings = @(Test-OnboardingProfile -Profile $profile -AliasMap $script:AliasMap)
        @($findings | Where-Object { $_.Code -eq 'TenantType' -and $_.Severity -eq 'Error' }).Count | Should -Be 1
    }

    It 'rejects a non-GUID tenant id (it becomes the tid claim and the Kernel PK)' {
        $profile = New-TestProfile
        $profile.tenant.id = 'joinerytech-demo'
        $findings = @(Test-OnboardingProfile -Profile $profile -AliasMap $script:AliasMap)
        @($findings | Where-Object { $_.Code -eq 'TenantId' }).Count | Should -Be 1
    }

    It 'rejects a role that is assigned but never declared' {
        $profile = New-TestProfile
        $profile.users[0].realmRoles = @('Superuser')
        $findings = @(Test-OnboardingProfile -Profile $profile -AliasMap $script:AliasMap)
        @($findings | Where-Object { $_.Code -eq 'UndeclaredRole' }).Count | Should -Be 1
    }

    It 'warns about an empty module set (fail-closed empty world grid)' {
        $profile = New-TestProfile
        $profile.tenant.modules = @()
        $findings = @(Test-OnboardingProfile -Profile $profile -AliasMap $script:AliasMap)
        @($findings | Where-Object { $_.Code -eq 'Modules' -and $_.Severity -eq 'Warning' }).Count | Should -Be 1
    }

    It 'warns when admin credentials would travel over plain http to a remote host' {
        $profile = New-TestProfile
        $profile.keycloak.baseUrl = 'http://joinerytech.hu/auth'
        $findings = @(Test-OnboardingProfile -Profile $profile -AliasMap $script:AliasMap)
        @($findings | Where-Object { $_.Code -eq 'KeycloakConfig' -and $_.Severity -eq 'Warning' }).Count | Should -Be 1
    }
}

Describe 'Idempotency: plan is empty when the realm already matches' {
    It 'reports NoChange for existing realm roles and Create for missing ones' {
        $plan = Get-RealmRolePlan -DesiredRoles @('Admin', 'Designer') -ExistingRoles @('Admin', 'default-roles-spaceos')
        @($plan | Where-Object { $_.Target -eq 'Admin' }).Action | Should -Be 'NoChange'
        @($plan | Where-Object { $_.Target -eq 'Designer' }).Action | Should -Be 'Create'
    }

    It 'creates both mappers when the client has none (the live 2026-07-27 case)' {
        $desired = @(
            [pscustomobject]@{ name = 'tid'; protocolMapper = 'oidc-usermodel-attribute-mapper'; config = [ordered]@{ 'claim.name' = 'tid'; 'multivalued' = 'false' } },
            [pscustomobject]@{ name = 'enabled_modules'; protocolMapper = 'oidc-usermodel-attribute-mapper'; config = [ordered]@{ 'claim.name' = 'enabled_modules'; 'multivalued' = 'true' } }
        )
        $plan = Get-ProtocolMapperPlan -DesiredMappers $desired -ExistingMappers @()
        @($plan | Where-Object { $_.Action -eq 'Create' }).Count | Should -Be 2
    }

    It 'detects a mapper that exists but lost its multivalued flag' {
        $desired = @([pscustomobject]@{ name = 'enabled_modules'; protocolMapper = 'oidc-usermodel-attribute-mapper'; config = [ordered]@{ 'claim.name' = 'enabled_modules'; 'multivalued' = 'true' } })
        $existing = @(([pscustomobject]@{ name = 'enabled_modules'; protocolMapper = 'oidc-usermodel-attribute-mapper'; config = [pscustomobject]@{ 'claim.name' = 'enabled_modules'; 'multivalued' = 'false' } }))
        $plan = Get-ProtocolMapperPlan -DesiredMappers $desired -ExistingMappers $existing
        $plan[0].Action | Should -Be 'Update'
        $plan[0].Detail | Should -Match 'multivalued'
    }

    It 'reports NoChange for a converged mapper' {
        $desired = @([pscustomobject]@{ name = 'tid'; protocolMapper = 'oidc-usermodel-attribute-mapper'; config = [ordered]@{ 'claim.name' = 'tid' } })
        $existing = @(([pscustomobject]@{ name = 'tid'; protocolMapper = 'oidc-usermodel-attribute-mapper'; config = [pscustomobject]@{ 'claim.name' = 'tid'; extra = 'ignored' } }))
        (Get-ProtocolMapperPlan -DesiredMappers $desired -ExistingMappers $existing)[0].Action | Should -Be 'NoChange'
    }

    It 'plans a full create for a user that does not exist yet' {
        $user = [pscustomobject]@{ username = 'uj.user'; email = 'u@example.test'; firstName = 'Uj'; lastName = 'User'; realmRoles = @('Admin') }
        $plan = Get-UserPlan -DesiredUser $user -TenantId '11111111-2222-4333-8444-555555555555' `
            -ClaimValues @('spaceos.crm') -TenantIdAttribute 'tid' -ModulesAttribute 'enabled_modules'
        @($plan | Where-Object { $_.Action -eq 'NoChange' }).Count | Should -Be 0
        @($plan | Where-Object { $_.Step -eq 'user-attribute' }).Count | Should -Be 2
        @($plan | Where-Object { $_.Step -eq 'role-mapping' }).Action | Should -Be 'Create'
    }

    It 'is a no-op for a fully provisioned user (second run changes nothing)' {
        $user = [pscustomobject]@{ username = 'anna.kovacs'; email = 'a@joinerytech.hu'; firstName = 'Anna'; lastName = 'Kovacs'; realmRoles = @('Admin') }
        # emailVerified is part of every real Keycloak user representation, and the plan
        # now reports it as drift (root-review P2-2) -- so the fixture carries it too.
        $existing = [pscustomobject]@{
            id = 'u1'; username = 'anna.kovacs'; email = 'a@joinerytech.hu'; firstName = 'Anna'; lastName = 'Kovacs'; enabled = $true; emailVerified = $true
            attributes = [pscustomobject]@{ tid = @('11111111-2222-4333-8444-555555555555'); enabled_modules = @('spaceos.crm', 'joinerytech.cutting') }
            requiredActions = @()
        }
        $plan = Get-UserPlan -DesiredUser $user -TenantId '11111111-2222-4333-8444-555555555555' `
            -ClaimValues @('joinerytech.cutting', 'spaceos.crm') -TenantIdAttribute 'tid' -ModulesAttribute 'enabled_modules' `
            -ExistingUser $existing -ExistingRealmRoles @('Admin')

        (Get-PlanSummary -Plan $plan).PendingCount | Should -Be 0
    }

    It 'plans an attribute update when the purchased module set changed' {
        $user = [pscustomobject]@{ username = 'anna.kovacs'; email = 'a@joinerytech.hu'; firstName = 'Anna'; lastName = 'Kovacs'; realmRoles = @('Admin') }
        $existing = [pscustomobject]@{
            id = 'u1'; username = 'anna.kovacs'; email = 'a@joinerytech.hu'; firstName = 'Anna'; lastName = 'Kovacs'; enabled = $true
            attributes = [pscustomobject]@{ tid = @('11111111-2222-4333-8444-555555555555'); enabled_modules = @('spaceos.crm') }
            requiredActions = @()
        }
        $plan = Get-UserPlan -DesiredUser $user -TenantId '11111111-2222-4333-8444-555555555555' `
            -ClaimValues @('spaceos.crm', 'spaceos.hr') -TenantIdAttribute 'tid' -ModulesAttribute 'enabled_modules' `
            -ExistingUser $existing -ExistingRealmRoles @('Admin')

        $attributeAction = @($plan | Where-Object { $_.Step -eq 'user-attribute' -and $_.Target -like '*enabled_modules' })
        $attributeAction.Action | Should -Be 'Update'
        $attributeAction.Detail | Should -Match 'spaceos.hr'
    }

    It 'plans to clear a stale VERIFY_PROFILE that blocks login on a complete profile' {
        $user = [pscustomobject]@{ username = 'demo'; email = 'd@example.test'; firstName = 'De'; lastName = 'Mo'; realmRoles = @() }
        $existing = [pscustomobject]@{
            id = 'u2'; username = 'demo'; email = 'd@example.test'; firstName = 'De'; lastName = 'Mo'; enabled = $true
            attributes = [pscustomobject]@{ tid = @('11111111-2222-4333-8444-555555555555'); enabled_modules = @('spaceos.crm') }
            requiredActions = @('VERIFY_PROFILE')
        }
        $plan = Get-UserPlan -DesiredUser $user -TenantId '11111111-2222-4333-8444-555555555555' `
            -ClaimValues @('spaceos.crm') -TenantIdAttribute 'tid' -ModulesAttribute 'enabled_modules' `
            -ExistingUser $existing -ExistingRealmRoles @()

        @($plan | Where-Object { $_.Step -eq 'required-action' }).Action | Should -Be 'Update'
    }

    It 'requires the unmanaged-attribute policy before attributes can be stored' {
        (Get-UserProfilePolicyPlan -CurrentPolicy '').Action | Should -Be 'Update'
        (Get-UserProfilePolicyPlan -CurrentPolicy 'DISABLED').Action | Should -Be 'Update'
        (Get-UserProfilePolicyPlan -CurrentPolicy 'ADMIN_EDIT').Action | Should -Be 'NoChange'
        (Get-UserProfilePolicyPlan -CurrentPolicy 'ENABLED').Action | Should -Be 'NoChange'
        (Get-UserProfilePolicyPlan -CurrentPolicy 'ADMIN_VIEW').Action | Should -Be 'Update'
    }
}

Describe 'Root-review P2 findings' {
    It 'reports a structurally missing profile section as a finding, not a StrictMode crash' {
        $profile = New-TestProfile
        $profile.tenant.PSObject.Properties.Remove('id')
        $profile.users[0].PSObject.Properties.Remove('lastName')
        { Test-OnboardingProfile -Profile $profile -AliasMap $script:AliasMap } | Should -Not -Throw

        $findings = @(Test-OnboardingProfile -Profile $profile -AliasMap $script:AliasMap)
        @($findings | Where-Object { $_.Code -eq 'TenantId' }).Count | Should -Be 1
        @($findings | Where-Object { $_.Code -eq 'VerifyProfile' }).Count | Should -Be 1
    }

    It 'reads a dotted path safely and returns $null for an absent segment' {
        $object = [pscustomobject]@{ a = [pscustomobject]@{ b = 'x' } }
        Get-ProfileValue -Object $object -Path 'a.b' | Should -Be 'x'
        Get-ProfileValue -Object $object -Path 'a.missing' | Should -BeNullOrEmpty
        Get-ProfileValue -Object $object -Path 'missing.deep.deeper' | Should -BeNullOrEmpty
    }

    It 'detects emailVerified drift so the apply step never mutates outside the plan' {
        $user = [pscustomobject]@{ username = 'x'; email = 'x@t.hu'; firstName = 'X'; lastName = 'Y'; realmRoles = @() }
        $existing = [pscustomobject]@{
            id = 'u1'; username = 'x'; email = 'x@t.hu'; firstName = 'X'; lastName = 'Y'; enabled = $true; emailVerified = $false
            attributes = [pscustomobject]@{ tid = @('11111111-2222-4333-8444-555555555555'); enabled_modules = @('spaceos.crm') }
            requiredActions = @()
        }
        $plan = Get-UserPlan -DesiredUser $user -TenantId '11111111-2222-4333-8444-555555555555' `
            -ClaimValues @('spaceos.crm') -TenantIdAttribute 'tid' -ModulesAttribute 'enabled_modules' `
            -ExistingUser $existing -ExistingRealmRoles @()

        $userAction = @($plan | Where-Object { $_.Step -eq 'user' })
        $userAction.Action | Should -Be 'Update'
        $userAction.Detail | Should -Match 'emailVerified'
    }

    It 'honours an explicit emailVerified=false in the profile (config-driven, no drift)' {
        $user = [pscustomobject]@{ username = 'x'; email = 'x@t.hu'; firstName = 'X'; lastName = 'Y'; emailVerified = $false; realmRoles = @() }
        Get-DesiredEmailVerified -DesiredUser $user | Should -BeFalse

        $existing = [pscustomobject]@{
            id = 'u1'; username = 'x'; email = 'x@t.hu'; firstName = 'X'; lastName = 'Y'; enabled = $true; emailVerified = $false
            attributes = [pscustomobject]@{ tid = @('11111111-2222-4333-8444-555555555555'); enabled_modules = @('spaceos.crm') }
            requiredActions = @()
        }
        $plan = Get-UserPlan -DesiredUser $user -TenantId '11111111-2222-4333-8444-555555555555' `
            -ClaimValues @('spaceos.crm') -TenantIdAttribute 'tid' -ModulesAttribute 'enabled_modules' `
            -ExistingUser $existing -ExistingRealmRoles @()
        (Get-PlanSummary -Plan $plan).PendingCount | Should -Be 0
    }

    It 'defaults emailVerified to true when the profile omits it' {
        Get-DesiredEmailVerified -DesiredUser ([pscustomobject]@{ username = 'x' }) | Should -BeTrue
    }

    It 'refuses to emit a runnable INSERT that the trigger would reject' {
        $sql = New-KernelTenantStatement -TenantId '11111111-2222-4333-8444-555555555555' -Name 'X' `
            -TenantType 'PanelCutter' -KernelEnabledModules @() -MissingRequired @('cutting')
        $sql | Should -Match 'NOT EMITTED'
        $sql | Should -Not -Match 'INSERT INTO'
    }

    It 'treats ADMIN_VIEW as insufficient (read-only unmanaged attributes cannot be written)' {
        (Get-UserProfilePolicyPlan -CurrentPolicy 'ADMIN_VIEW').Action | Should -Be 'Update'
        (Get-UserProfilePolicyPlan -CurrentPolicy 'ADMIN_EDIT').Action | Should -Be 'NoChange'
    }
}

Describe 'Client audience mapper (root live finding, 2026-07-28)' {
    # The module hosts validate JWT_AUDIENCE, but the portal client's token does not carry
    # it by default -- a valid login still gets 401 from every module API.
    It 'plans an audience mapper for each declared audience' {
        $desired = @(
            [pscustomobject]@{ name = 'kernel-api-audience'; protocolMapper = 'oidc-audience-mapper'
                               config = [ordered]@{ 'included.custom.audience' = 'kernel-api'; 'access.token.claim' = 'true' } }
        )
        $plan = Get-ProtocolMapperPlan -DesiredMappers $desired -ExistingMappers @()

        $plan[0].Action | Should -Be 'Create'
        $plan[0].Target | Should -Be 'kernel-api-audience'
    }

    It 'detects an audience mapper pointing at the wrong audience' {
        $desired = @(
            [pscustomobject]@{ name = 'kernel-api-audience'; protocolMapper = 'oidc-audience-mapper'
                               config = [ordered]@{ 'included.custom.audience' = 'kernel-api' } }
        )
        $existing = @(([pscustomobject]@{ name = 'kernel-api-audience'; protocolMapper = 'oidc-audience-mapper'
                                          config = [pscustomobject]@{ 'included.custom.audience' = 'wrong-api' } }))
        $plan = Get-ProtocolMapperPlan -DesiredMappers $desired -ExistingMappers $existing

        $plan[0].Action | Should -Be 'Update'
        $plan[0].Detail | Should -Match 'wrong-api'
    }

    It 'reads the declared audiences from the profile' {
        $profile = New-TestProfile
        Get-ProfileAudiences -Profile $profile | Should -Be @('kernel-api')
    }

    It 'returns no audience when the profile declares none' {
        $profile = New-TestProfile
        $profile.claims.PSObject.Properties.Remove('audiences')
        @(Get-ProfileAudiences -Profile $profile).Count | Should -Be 0

        $profile.claims | Add-Member -NotePropertyName 'audiences' -NotePropertyValue @('', '  ')
        @(Get-ProfileAudiences -Profile $profile).Count | Should -Be 0
    }

    It 'adds one audience mapper per declared audience, and none otherwise' {
        $none = Get-DesiredClientMappers -TenantIdAttribute 'tid' -ModulesAttribute 'enabled_modules'
        @($none).Count | Should -Be 2
        @($none | Where-Object { $_.protocolMapper -eq 'oidc-audience-mapper' }).Count | Should -Be 0

        $two = Get-DesiredClientMappers -TenantIdAttribute 'tid' -ModulesAttribute 'enabled_modules' `
            -Audiences @('kernel-api', 'scheduling-api')
        @($two).Count | Should -Be 4
        @($two | ForEach-Object { $_.name }) | Should -Contain 'kernel-api-audience'
        @($two | ForEach-Object { $_.name }) | Should -Contain 'scheduling-api-audience'
    }

    It 'puts the audience in the access token only' {
        $mapper = @(Get-DesiredClientMappers -TenantIdAttribute 'tid' -ModulesAttribute 'enabled_modules' `
            -Audiences @('kernel-api')) | Where-Object { $_.name -eq 'kernel-api-audience' }

        $mapper.protocolMapper | Should -Be 'oidc-audience-mapper'
        $mapper.config['included.custom.audience'] | Should -Be 'kernel-api'
        $mapper.config['access.token.claim'] | Should -Be 'true'
        $mapper.config['id.token.claim'] | Should -Be 'false'
    }
}

Describe 'New-KernelTenantStatement -- emitted, never executed' {
    It 'emits an idempotent INSERT with the allowlist-validated module array' {
        $sql = New-KernelTenantStatement -TenantId '11111111-2222-4333-8444-555555555555' -Name 'JoineryTech Kft. (demo)' `
            -TenantType 'Manufacturer' -KernelEnabledModules @('cutting', 'door')
        $sql | Should -Match 'ON CONFLICT \("Id"\) DO NOTHING'
        $sql | Should -Match "ARRAY\['cutting','door'\]"
        $sql | Should -Match "'Manufacturer'"
    }

    It 'escapes an apostrophe in the tenant name' {
        $sql = New-KernelTenantStatement -TenantId '11111111-2222-4333-8444-555555555555' -Name "O'Brien Kft." `
            -TenantType 'Manufacturer' -KernelEnabledModules @()
        $sql | Should -Match "O''Brien"
        $sql | Should -Match 'ARRAY\[\]::varchar\(32\)\[\]'
    }

    It 'refuses to emit SQL for an injection-shaped module key' {
        { New-KernelTenantStatement -TenantId '11111111-2222-4333-8444-555555555555' -Name 'X' `
            -TenantType 'Manufacturer' -KernelEnabledModules @("cutting'); DROP TABLE ""Tenants"";--") } | Should -Throw
    }

    It 'refuses an unknown TenantType and a non-GUID id' {
        { New-KernelTenantStatement -TenantId 'not-a-guid' -Name 'X' -TenantType 'Manufacturer' -KernelEnabledModules @() } | Should -Throw
        { New-KernelTenantStatement -TenantId '11111111-2222-4333-8444-555555555555' -Name 'X' -TenantType 'Woodshop' -KernelEnabledModules @() } | Should -Throw
    }
}

Describe 'Script contract (no Keycloak needed)' {
    It 'refuses -Apply together with -Offline' {
        $script = Join-Path $script:ScriptRoot 'Invoke-KeycloakTenantOnboarding.ps1'
        $profilePath = Join-Path $script:RepoRoot 'config/tenant-onboarding.sample.json'
        $output = & powershell -NoProfile -File $script -ProfilePath $profilePath -Apply -Offline 2>&1
        $LASTEXITCODE | Should -Be 2
        ($output -join "`n") | Should -Match 'mutually exclusive'
    }

    It 'refuses -VerifyOnly together with -Offline (an offline run cannot verify a realm)' {
        # Root-review P1: without this guard the Offline branch wins and returns exit 0
        # without a single Keycloak call -- a CI verify caller reads that as convergence.
        $script = Join-Path $script:ScriptRoot 'Invoke-KeycloakTenantOnboarding.ps1'
        $profilePath = Join-Path $script:RepoRoot 'config/tenant-onboarding.sample.json'
        $output = & powershell -NoProfile -File $script -ProfilePath $profilePath -VerifyOnly -Offline 2>&1
        $LASTEXITCODE | Should -Be 2
        ($output -join "`n") | Should -Match 'mutually exclusive'
    }

    It 'runs the sample profile offline, emits the plan and exits 0' {
        $script = Join-Path $script:ScriptRoot 'Invoke-KeycloakTenantOnboarding.ps1'
        $profilePath = Join-Path $script:RepoRoot 'config/tenant-onboarding.sample.json'
        $output = & powershell -NoProfile -File $script -ProfilePath $profilePath -Offline 2>&1
        $LASTEXITCODE | Should -Be 0

        $text = ($output -join "`n")
        $json = $text.Substring($text.IndexOf('{')) | ConvertFrom-Json
        $json.mode | Should -Be 'Offline'
        $json.tenant.kernelEnabledModules | Should -Be @('cutting')
        @($json.tenant.notRepresentableInKernel | ForEach-Object { $_.ModuleId }) | Should -Contain 'spaceos.crm'
        $json.kernelTenantSql | Should -Match 'ON CONFLICT'
    }

    It 'fails validation (exit 2) without contacting Keycloak when a user has no lastName' {
        $script = Join-Path $script:ScriptRoot 'Invoke-KeycloakTenantOnboarding.ps1'
        $broken = Join-Path $TestDrive 'broken-profile.json'
        $profile = Get-Content -LiteralPath (Join-Path $script:RepoRoot 'config/tenant-onboarding.sample.json') -Raw | ConvertFrom-Json
        $profile.users[0].lastName = ''
        $profile.keycloak.baseUrl = 'http://127.0.0.1:1/unreachable'
        $profile | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $broken -Encoding UTF8

        $output = & powershell -NoProfile -File $script -ProfilePath $broken 2>&1
        $LASTEXITCODE | Should -Be 2
        ($output -join "`n") | Should -Match 'VERIFY_PROFILE|Account is not fully set up'
    }
}
