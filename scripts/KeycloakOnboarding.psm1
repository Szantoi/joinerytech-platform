#requires -Version 5.1
Set-StrictMode -Version Latest

<#
.SYNOPSIS
    Pure decision logic for tenant onboarding (STAB-TENANT-ONBOARDING-RUNBOOK).

.DESCRIPTION
    This module contains NO network calls and NO mutations. Everything here is a
    deterministic function over (desired profile, observed state) -> plan, so the
    whole onboarding decision surface can be unit-tested without a live Keycloak
    (same pattern as TestcontainersHygiene.psm1 / STAB-TESTCONTAINERS-HYGIENE).

    Sources of truth this module mirrors (see the runbook for the drift risk):
      - ADR-067 legacy -> canonical ModuleId map:
        docs/knowledge/contracts/module-id-legacy-aliases.json (loaded, not copied)
      - Kernel TenantType allowlist:
        src/spaceos-kernel/SpaceOS.Kernel.Domain/Services/ModuleRegistryService.cs
        src/spaceos-kernel/SpaceOS.Infrastructure/Migrations/
          20260415054837_Migration_0029_EcosystemActorTypes.cs (validate_enabled_modules_for_type)
        ADR-067 decision 6 will generate both from the signed catalogue; until then
        this table is a documented mirror and Test-KernelAllowlistDrift guards it.
#>

# --- Kernel allowlist mirror (Migration_0029 + ModuleRegistryService) ----------

$script:KernelModuleAllowlist = @{
    'Manufacturer' = @{ Required = @();               Optional = @('door', 'cabinet', 'window', 'cutting', 'spatial') }
    'PanelCutter'  = @{ Required = @('cutting');      Optional = @() }
    'Trader'       = @{ Required = @('trading');      Optional = @('delivery') }
    'Logistics'    = @{ Required = @('delivery');     Optional = @() }
    'Installer'    = @{ Required = @('installation'); Optional = @() }
    'EndCustomer'  = @{ Required = @('orders');       Optional = @() }
}

function Get-KernelTenantTypes {
    <#
    .SYNOPSIS
        The TenantType values the Kernel DB trigger accepts (any other raises).
    #>
    [CmdletBinding()]
    param()
    return @($script:KernelModuleAllowlist.Keys | Sort-Object)
}

function Get-KernelModuleAllowlist {
    <#
    .SYNOPSIS
        Legacy module keys the Kernel accepts in Tenants.EnabledModules for a TenantType.
    #>
    [CmdletBinding()]
    param([Parameter(Mandatory)][string] $TenantType)

    if (-not $script:KernelModuleAllowlist.ContainsKey($TenantType)) { return $null }
    $entry = $script:KernelModuleAllowlist[$TenantType]
    return [pscustomobject]@{
        TenantType = $TenantType
        Required   = @($entry.Required)
        Allowed    = @(@($entry.Required) + @($entry.Optional))
    }
}

# --- ADR-067 alias map --------------------------------------------------------

function Get-ModuleAliasMap {
    <#
    .SYNOPSIS
        Loads the ADR-067 legacy -> canonical ModuleId table and derives the inverse.
    .PARAMETER Path
        docs/knowledge/contracts/module-id-legacy-aliases.json
    #>
    [CmdletBinding()]
    param([Parameter(Mandatory)][string] $Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Module alias map not found: $Path (ADR-067 contract file)"
    }

    $raw = Get-Content -LiteralPath $Path -Raw -Encoding UTF8 | ConvertFrom-Json
    if (-not $raw.PSObject.Properties.Match('aliases').Count) {
        throw "Module alias map has no 'aliases' object: $Path"
    }

    $toCanonical = @{}
    $toLegacy = @{}
    foreach ($property in $raw.aliases.PSObject.Properties) {
        $toCanonical[$property.Name] = [string] $property.Value
        # The map is one-way by contract; the inverse is only used to talk to the
        # Kernel, which still stores legacy short names (ADR-067 decision 2).
        if (-not $toLegacy.ContainsKey([string] $property.Value)) {
            $toLegacy[[string] $property.Value] = $property.Name
        }
    }

    return [pscustomobject]@{
        Version     = [string] $raw.version
        ToCanonical = $toCanonical
        ToLegacy    = $toLegacy
    }
}

function ConvertTo-CanonicalModuleId {
    <#
    .SYNOPSIS
        Legacy short name -> canonical ModuleId; a canonical ID passes through.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][AllowEmptyString()][string] $ModuleId,
        [Parameter(Mandatory)] $AliasMap
    )

    if ($AliasMap.ToCanonical.ContainsKey($ModuleId)) { return $AliasMap.ToCanonical[$ModuleId] }
    if ($AliasMap.ToLegacy.ContainsKey($ModuleId)) { return $ModuleId }
    return $null
}

function ConvertTo-LegacyModuleId {
    <#
    .SYNOPSIS
        Canonical ModuleId -> the legacy short name the Kernel row still stores.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][AllowEmptyString()][string] $ModuleId,
        [Parameter(Mandatory)] $AliasMap
    )

    if ($AliasMap.ToLegacy.ContainsKey($ModuleId)) { return $AliasMap.ToLegacy[$ModuleId] }
    if ($AliasMap.ToCanonical.ContainsKey($ModuleId)) { return $ModuleId }
    return $null
}

function Test-KernelAllowlistDrift {
    <#
    .SYNOPSIS
        Fails closed if a mirrored Kernel allowlist key is missing from the ADR-067
        alias table -- the mirror and the contract must not drift apart silently.
    #>
    [CmdletBinding()]
    param([Parameter(Mandatory)] $AliasMap)

    $unknown = @()
    foreach ($tenantType in Get-KernelTenantTypes) {
        foreach ($legacy in (Get-KernelModuleAllowlist -TenantType $tenantType).Allowed) {
            if (-not $AliasMap.ToCanonical.ContainsKey($legacy)) { $unknown += $legacy }
        }
    }
    return @($unknown | Sort-Object -Unique)
}

# --- Profile validation -------------------------------------------------------

function Get-ProfileValue {
    <#
    .SYNOPSIS
        Safe dotted-path read of a profile property; $null when any segment is absent.
    .DESCRIPTION
        A hand-edited profile can be missing whole sections. Under Set-StrictMode Latest
        a direct `$Profile.tenant.id` on a missing property throws a raw PowerShell
        exception, which surfaces as a tooling error instead of a readable validation
        finding. Every validator read goes through here.
    #>
    [CmdletBinding()]
    param($Object, [Parameter(Mandatory)][string] $Path)

    $current = $Object
    foreach ($segment in $Path.Split('.')) {
        if ($null -eq $current) { return $null }
        $property = $current.PSObject.Properties[$segment]
        if ($null -eq $property) { return $null }
        $current = $property.Value
    }
    return $current
}

function Get-ProfileAudiences {
    <#
    .SYNOPSIS
        Audience values declared in the profile (claims.audiences); empty when none.
    .DESCRIPTION
        Live finding (root, 2026-07-28): the module hosts validate JWT_AUDIENCE (e.g.
        'kernel-api'), but the portal client's token does not carry that audience by
        default, so a perfectly valid login is rejected with 401 by every module API.
        The value is config-driven because it differs per instance.
    #>
    [CmdletBinding()]
    param([Parameter(Mandatory)] $Profile)

    return @(@(Get-ProfileValue -Object $Profile -Path 'claims.audiences') |
        Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
        ForEach-Object { [string] $_ })
}

function Get-DesiredClientMappers {
    <#
    .SYNOPSIS
        The protocol mappers the portal client must carry: the tenant claim, the modules
        claim, and one audience mapper per declared audience.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string] $TenantIdAttribute,
        [Parameter(Mandatory)][string] $ModulesAttribute,
        [AllowEmptyCollection()][string[]] $Audiences = @()
    )

    $mappers = @(
        [pscustomobject]@{
            name           = $TenantIdAttribute
            protocol       = 'openid-connect'
            protocolMapper = 'oidc-usermodel-attribute-mapper'
            config         = [ordered]@{
                'user.attribute'       = $TenantIdAttribute
                'claim.name'           = $TenantIdAttribute
                'jsonType.label'       = 'String'
                'id.token.claim'       = 'true'
                'access.token.claim'   = 'true'
                'userinfo.token.claim' = 'true'
                'multivalued'          = 'false'
            }
        },
        [pscustomobject]@{
            name           = $ModulesAttribute
            protocol       = 'openid-connect'
            protocolMapper = 'oidc-usermodel-attribute-mapper'
            config         = [ordered]@{
                'user.attribute'       = $ModulesAttribute
                'claim.name'           = $ModulesAttribute
                'jsonType.label'       = 'String'
                'id.token.claim'       = 'true'
                'access.token.claim'   = 'true'
                'userinfo.token.claim' = 'true'
                'multivalued'          = 'true'
                'aggregate.attrs'      = 'true'
            }
        }
    )

    foreach ($audience in $Audiences) {
        if ([string]::IsNullOrWhiteSpace($audience)) { continue }
        $mappers += [pscustomobject]@{
            # One mapper per audience, named after it, so adding a second module API is an
            # additive change and never rewrites the first one's mapper.
            name           = "$audience-audience"
            protocol       = 'openid-connect'
            protocolMapper = 'oidc-audience-mapper'
            config         = [ordered]@{
                'included.custom.audience' = $audience
                # Access token only: the audience exists so a module API accepts the call.
                # Putting it in the id token would widen the token's stated purpose for no gain.
                'access.token.claim'       = 'true'
                'id.token.claim'           = 'false'
            }
        }
    }

    return [object[]] $mappers
}

function Test-OnboardingProfile {
    <#
    .SYNOPSIS
        Validates the onboarding profile BEFORE any Keycloak call is made.
    .DESCRIPTION
        Returns a list of finding objects (Severity = Error | Warning). Errors abort
        the run; warnings are reported and carried into the summary.

        Known pitfalls encoded here (2026-07-27 live provisioning, see runbook):
          - firstName/lastName missing -> Keycloak 24 attaches VERIFY_PROFILE and the
            login stops with "Account is not fully set up" (Error, not Warning).
          - the 7 ERP module keys are rejected by validate_enabled_modules_for_type()
            -> reported as a Warning with the ADR-067 reference, never silently dropped.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] $Profile,
        [Parameter(Mandatory)] $AliasMap
    )

    $findings = New-Object System.Collections.Generic.List[object]
    function Add-Finding([string] $severity, [string] $code, [string] $target, [string] $message) {
        $findings.Add([pscustomobject]@{
            Severity = $severity; Code = $code; Target = $target; Message = $message
        })
    }

    foreach ($required in @('keycloak', 'tenant', 'users')) {
        if (-not $Profile.PSObject.Properties.Match($required).Count) {
            Add-Finding 'Error' 'ProfileSection' $required "Missing required profile section '$required'."
        }
    }
    if ($findings.Count -gt 0) { return $findings }

    foreach ($required in @('baseUrl', 'realm', 'clientId')) {
        if ([string]::IsNullOrWhiteSpace([string] (Get-ProfileValue -Object $Profile -Path "keycloak.$required"))) {
            Add-Finding 'Error' 'KeycloakConfig' $required "keycloak.$required is required."
        }
    }
    $baseUrl = [string] (Get-ProfileValue -Object $Profile -Path 'keycloak.baseUrl')
    if ($baseUrl -and $baseUrl -notmatch '^https?://') {
        Add-Finding 'Error' 'KeycloakConfig' 'baseUrl' 'keycloak.baseUrl must be an absolute http(s) URL.'
    }
    if ($baseUrl -match '^http://(?!localhost|127\.0\.0\.1)') {
        Add-Finding 'Warning' 'KeycloakConfig' 'baseUrl' 'Plain http against a non-local host: admin credentials would travel unencrypted.'
    }

    # --- tenant ---
    $tenantId = [string] (Get-ProfileValue -Object $Profile -Path 'tenant.id')
    $parsedGuid = [guid]::Empty
    if (-not [guid]::TryParse($tenantId, [ref] $parsedGuid)) {
        Add-Finding 'Error' 'TenantId' $tenantId 'tenant.id must be a GUID (it becomes the tid claim and the Kernel Tenants.Id).'
    }
    if ([string]::IsNullOrWhiteSpace([string] (Get-ProfileValue -Object $Profile -Path 'tenant.name'))) {
        Add-Finding 'Error' 'TenantName' '' 'tenant.name is required.'
    }
    $tenantType = [string] (Get-ProfileValue -Object $Profile -Path 'tenant.tenantType')
    if ((Get-KernelTenantTypes) -notcontains $tenantType) {
        Add-Finding 'Error' 'TenantType' $tenantType (
            "Unknown TenantType. The Kernel trigger raises for anything outside: " +
            ((Get-KernelTenantTypes) -join ', '))
    }

    $modules = @(Get-ProfileValue -Object $Profile -Path 'tenant.modules')
    if ($modules.Count -eq 0) {
        Add-Finding 'Warning' 'Modules' '' 'tenant.modules is empty: the tenant would get a fail-closed, empty world grid.'
    }
    foreach ($module in $modules) {
        if (-not (ConvertTo-CanonicalModuleId -ModuleId ([string] $module) -AliasMap $AliasMap)) {
            Add-Finding 'Error' 'UnknownModule' ([string] $module) (
                'Module is not in the ADR-067 alias table (docs/knowledge/contracts/module-id-legacy-aliases.json).')
        }
    }

    # --- users ---
    $declaredRoles = @(Get-ProfileValue -Object $Profile -Path 'realmRoles')
    $users = @(Get-ProfileValue -Object $Profile -Path 'users')
    if ($users.Count -eq 0) {
        Add-Finding 'Warning' 'Users' '' 'No users declared: only realm-level scaffolding will be provisioned.'
    }
    foreach ($user in $users) {
        $username = [string] (Get-ProfileValue -Object $user -Path 'username')
        if ([string]::IsNullOrWhiteSpace($username)) {
            Add-Finding 'Error' 'Username' '' 'users[].username is required.'
            continue
        }
        # KC24 VERIFY_PROFILE trap -- an Error on purpose: the account would be
        # created successfully and then be unable to log in.
        foreach ($field in @('firstName', 'lastName', 'email')) {
            if ([string]::IsNullOrWhiteSpace([string] (Get-ProfileValue -Object $user -Path $field))) {
                Add-Finding 'Error' 'VerifyProfile' $username (
                    "users[].$field is missing. Keycloak 24 then adds the VERIFY_PROFILE required action " +
                    "and the login stops with 'Account is not fully set up'.")
            }
        }
        foreach ($role in @(Get-ProfileValue -Object $user -Path 'realmRoles')) {
            if ($declaredRoles -notcontains [string] $role) {
                Add-Finding 'Error' 'UndeclaredRole' $username (
                    "Role '$role' is assigned but not declared in realmRoles, so it would not be created.")
            }
        }
    }

    return $findings
}

# --- Module plan --------------------------------------------------------------

function Resolve-TenantModulePlan {
    <#
    .SYNOPSIS
        Splits the purchased module set into the claim value set (Keycloak) and the
        Kernel-representable set (Tenants.EnabledModules).
    .DESCRIPTION
        This is the "legacy -> canonical module map" the task calls for. The Kernel
        DB trigger only knows industry module keys per TenantType, so the 7 ERP
        modules cannot be written into the Kernel tenant row today (ADR-067, live
        proof 2026-07-27). Instead of failing the onboarding, the plan reports them
        as NotRepresentableInKernel, and the tenant record carries only the subset
        the trigger accepts.
    .PARAMETER ClaimFormat
        canonical (ADR-067 default) | legacy (pre-ADR-067 portal compatibility) | both
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string] $TenantType,
        [Parameter(Mandatory)][AllowEmptyCollection()][string[]] $Modules,
        [Parameter(Mandatory)] $AliasMap,
        [ValidateSet('canonical', 'legacy', 'both')][string] $ClaimFormat = 'canonical'
    )

    $canonical = New-Object System.Collections.Generic.List[string]
    $unknown = New-Object System.Collections.Generic.List[string]
    foreach ($module in $Modules) {
        $resolved = ConvertTo-CanonicalModuleId -ModuleId ([string] $module) -AliasMap $AliasMap
        if ($null -eq $resolved) { $unknown.Add([string] $module); continue }
        if (-not $canonical.Contains($resolved)) { $canonical.Add($resolved) }
    }

    $allowlist = Get-KernelModuleAllowlist -TenantType $TenantType
    $kernelModules = New-Object System.Collections.Generic.List[string]
    $notRepresentable = New-Object System.Collections.Generic.List[object]

    foreach ($canonicalId in $canonical) {
        $legacy = ConvertTo-LegacyModuleId -ModuleId $canonicalId -AliasMap $AliasMap
        if ($null -eq $allowlist) {
            $notRepresentable.Add([pscustomobject]@{ ModuleId = $canonicalId; LegacyId = $legacy; Reason = "Unknown TenantType '$TenantType'" })
            continue
        }
        if ($allowlist.Allowed -contains $legacy) {
            if (-not $kernelModules.Contains($legacy)) { $kernelModules.Add($legacy) }
        }
        else {
            $notRepresentable.Add([pscustomobject]@{
                ModuleId = $canonicalId
                LegacyId = $legacy
                Reason   = "validate_enabled_modules_for_type() rejects '$legacy' for TenantType '$TenantType' (allowed: $($allowlist.Allowed -join ', '))"
            })
        }
    }

    $missingRequired = @()
    if ($null -ne $allowlist) {
        $missingRequired = @($allowlist.Required | Where-Object { $kernelModules -notcontains $_ })
    }

    $claimValues = New-Object System.Collections.Generic.List[string]
    foreach ($canonicalId in $canonical) {
        if ($ClaimFormat -eq 'canonical' -or $ClaimFormat -eq 'both') {
            if (-not $claimValues.Contains($canonicalId)) { $claimValues.Add($canonicalId) }
        }
        if ($ClaimFormat -eq 'legacy' -or $ClaimFormat -eq 'both') {
            $legacy = ConvertTo-LegacyModuleId -ModuleId $canonicalId -AliasMap $AliasMap
            if ($legacy -and -not $claimValues.Contains($legacy)) { $claimValues.Add($legacy) }
        }
    }

    return [pscustomobject]@{
        TenantType                 = $TenantType
        CanonicalModules           = @($canonical)
        UnknownModules             = @($unknown)
        ClaimValues                = @($claimValues | Sort-Object)
        KernelEnabledModules       = @($kernelModules | Sort-Object)
        # ToArray(): Windows PowerShell 5.1 throws ArgumentException when a
        # [pscustomobject] cast receives a generic List of PSCustomObjects.
        NotRepresentableInKernel   = [object[]] $notRepresentable.ToArray()
        MissingKernelRequired      = @($missingRequired)
    }
}

function New-KernelTenantStatement {
    <#
    .SYNOPSIS
        Emits the idempotent SQL for the Kernel tenant record (never executed here).
    .DESCRIPTION
        Writing to the live Kernel database is a Gabor gate (repo CLAUDE.md), so the
        script only emits a reviewed, allowlist-validated statement for the runbook's
        DB step. ON CONFLICT DO NOTHING mirrors the Migration_0029 demo seed style,
        so re-running the runbook cannot clobber an existing tenant row.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string] $TenantId,
        [Parameter(Mandatory)][string] $Name,
        [Parameter(Mandatory)][string] $TenantType,
        [Parameter(Mandatory)][AllowEmptyCollection()][string[]] $KernelEnabledModules,
        [AllowEmptyCollection()][string[]] $MissingRequired = @()
    )

    # A TenantType-required module that is absent would make the trigger raise. Emitting a
    # runnable INSERT that is certain to fail invites a confusing live-DB error at the very
    # step that sits behind Gabor's approval gate, so the artifact refuses to be runnable.
    if ($MissingRequired.Count -gt 0) {
        return @"
-- STAB-TENANT-ONBOARDING-RUNBOOK -- Kernel tenant record NOT EMITTED
-- TenantType '$TenantType' requires module(s): $($MissingRequired -join ', ')
-- which the purchased module set does not contain. validate_enabled_modules_for_type()
-- would reject this INSERT. Fix tenant.modules in the onboarding profile and re-run;
-- do NOT hand-edit this file into a runnable statement.
"@
    }

    $parsed = [guid]::Empty
    if (-not [guid]::TryParse($TenantId, [ref] $parsed)) { throw "TenantId is not a GUID: $TenantId" }
    if ((Get-KernelTenantTypes) -notcontains $TenantType) { throw "Unknown TenantType: $TenantType" }

    foreach ($module in $KernelEnabledModules) {
        if ($module -notmatch '^[a-z][a-z0-9-]{0,31}$') {
            throw "Refusing to emit SQL for a non-conforming module key: '$module'"
        }
    }

    $escapedName = $Name.Replace("'", "''")
    if ($KernelEnabledModules.Count -eq 0) {
        $moduleArray = "ARRAY[]::varchar(32)[]"
    }
    else {
        $moduleArray = "ARRAY[" + (($KernelEnabledModules | ForEach-Object { "'$_'" }) -join ',') + "]"
    }

    return @"
-- STAB-TENANT-ONBOARDING-RUNBOOK -- Kernel tenant record
-- Validated against validate_enabled_modules_for_type() allowlist for TenantType '$TenantType'.
-- Run only with Gabor's explicit approval (live DB mutation).
INSERT INTO "Tenants" ("Id","Name","TenantType","EnabledModules","IsArchived")
VALUES ('$parsed','$escapedName','$TenantType',$moduleArray,false)
ON CONFLICT ("Id") DO NOTHING;
"@
}

# --- Desired-vs-observed plans (idempotency core) -----------------------------

function New-PlanAction {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string] $Step,
        [Parameter(Mandatory)][string] $Target,
        [Parameter(Mandatory)][ValidateSet('Create', 'Update', 'NoChange')][string] $Action,
        [string] $Detail = ''
    )
    return [pscustomobject]@{ Step = $Step; Target = $Target; Action = $Action; Detail = $Detail; Status = 'Planned' }
}

function Get-RealmRolePlan {
    <#
    .SYNOPSIS
        Which realm roles are missing. Existing roles are never modified.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][AllowEmptyCollection()][string[]] $DesiredRoles,
        [Parameter(Mandatory)][AllowEmptyCollection()][string[]] $ExistingRoles
    )

    $plan = @()
    foreach ($role in $DesiredRoles) {
        if ($ExistingRoles -contains $role) {
            $plan += New-PlanAction -Step 'realm-role' -Target $role -Action 'NoChange' -Detail 'Role already exists.'
        }
        else {
            $plan += New-PlanAction -Step 'realm-role' -Target $role -Action 'Create' -Detail 'Realm role missing (HomeScreen role gating depends on it).'
        }
    }
    return @($plan)
}

function Get-ProtocolMapperPlan {
    <#
    .SYNOPSIS
        Which protocol mappers are missing or misconfigured on the portal client.
    .DESCRIPTION
        A mapper is "converged" only if every desired config key matches -- a mapper
        that exists with the wrong claim name or a lost multivalued flag is an Update,
        not a NoChange (the live realm had ZERO mappers on 2026-07-27).
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][AllowEmptyCollection()][object[]] $DesiredMappers,
        [Parameter(Mandatory)][AllowEmptyCollection()][object[]] $ExistingMappers
    )

    $plan = @()
    foreach ($desired in $DesiredMappers) {
        # Select-Object -First 1 (not [0]): indexing an empty array throws under Set-StrictMode Latest.
        $existing = $ExistingMappers | Where-Object { $_.name -eq $desired.name } | Select-Object -First 1
        if ($null -eq $existing) {
            $plan += New-PlanAction -Step 'protocol-mapper' -Target $desired.name -Action 'Create' -Detail "Mapper missing on the client."
            continue
        }

        $drift = @()
        if ([string] $existing.protocolMapper -ne [string] $desired.protocolMapper) {
            $drift += "protocolMapper: '$($existing.protocolMapper)' -> '$($desired.protocolMapper)'"
        }
        foreach ($key in $desired.config.Keys) {
            $current = $null
            if ($existing.config -and $existing.config.PSObject.Properties.Match($key).Count) {
                $current = [string] $existing.config.$key
            }
            if ($current -ne [string] $desired.config[$key]) {
                $drift += "config.${key}: '$current' -> '$($desired.config[$key])'"
            }
        }

        if ($drift.Count -eq 0) {
            $plan += New-PlanAction -Step 'protocol-mapper' -Target $desired.name -Action 'NoChange' -Detail 'Mapper matches the desired claim contract.'
        }
        else {
            $plan += New-PlanAction -Step 'protocol-mapper' -Target $desired.name -Action 'Update' -Detail ($drift -join '; ')
        }
    }
    return @($plan)
}

function Get-DesiredEmailVerified {
    <#
    .SYNOPSIS
        Desired emailVerified for a profile user: opt-out via users[].emailVerified,
        default $true.
    .DESCRIPTION
        Admin-provisioned accounts use a known corporate address, and an unverified
        e-mail earns a VERIFY_EMAIL required action -- the same login blocker class as
        VERIFY_PROFILE. The default is therefore $true, but it stays config-driven.
    #>
    [CmdletBinding()]
    param([Parameter(Mandatory)] $DesiredUser)

    $value = Get-ProfileValue -Object $DesiredUser -Path 'emailVerified'
    if ($null -eq $value) { return $true }
    return [bool] $value
}

function Get-UserPlan {
    <#
    .SYNOPSIS
        Create/update plan for a single user: profile fields, tid/enabled_modules
        attributes, realm-role mapping and stale VERIFY_PROFILE required actions.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] $DesiredUser,
        [Parameter(Mandatory)][AllowEmptyString()][string] $TenantId,
        [Parameter(Mandatory)][AllowEmptyCollection()][string[]] $ClaimValues,
        [Parameter(Mandatory)][string] $TenantIdAttribute,
        [Parameter(Mandatory)][string] $ModulesAttribute,
        $ExistingUser = $null,
        [AllowEmptyCollection()][string[]] $ExistingRealmRoles = @()
    )

    $username = [string] $DesiredUser.username
    $plan = @()

    if ($null -eq $ExistingUser) {
        $plan += New-PlanAction -Step 'user' -Target $username -Action 'Create' -Detail 'User does not exist in the realm.'
    }
    else {
        $drift = @()
        foreach ($field in @('email', 'firstName', 'lastName')) {
            $current = [string] (Get-ProfileValue -Object $ExistingUser -Path $field)
            if ($current -ne [string] (Get-ProfileValue -Object $DesiredUser -Path $field)) {
                $drift += "${field}: '$current' -> '$(Get-ProfileValue -Object $DesiredUser -Path $field)'"
            }
        }
        if ($ExistingUser.PSObject.Properties.Match('enabled').Count -and -not $ExistingUser.enabled) {
            $drift += 'enabled: false -> true'
        }
        # emailVerified is written by the apply step, so it must be visible in the plan --
        # otherwise the run mutates something the plan never announced, and the drift
        # would never be reported as repaired.
        if ((Get-DesiredEmailVerified -DesiredUser $DesiredUser) -ne [bool] (Get-ProfileValue -Object $ExistingUser -Path 'emailVerified')) {
            $drift += "emailVerified: '$([bool] (Get-ProfileValue -Object $ExistingUser -Path 'emailVerified'))' -> '$(Get-DesiredEmailVerified -DesiredUser $DesiredUser)'"
        }
        if ($drift.Count -eq 0) {
            $plan += New-PlanAction -Step 'user' -Target $username -Action 'NoChange' -Detail 'Profile fields match.'
        }
        else {
            $plan += New-PlanAction -Step 'user' -Target $username -Action 'Update' -Detail ($drift -join '; ')
        }
    }

    $attributePlan = @(
        @{ Name = $TenantIdAttribute; Desired = @($TenantId) },
        @{ Name = $ModulesAttribute;  Desired = @($ClaimValues) }
    )
    foreach ($attribute in $attributePlan) {
        $current = @()
        if ($null -ne $ExistingUser -and
            $ExistingUser.PSObject.Properties.Match('attributes').Count -and
            $null -ne $ExistingUser.attributes -and
            $ExistingUser.attributes.PSObject.Properties.Match($attribute.Name).Count) {
            $current = @($ExistingUser.attributes.($attribute.Name) | ForEach-Object { [string] $_ })
        }
        $desiredSorted = @(@($attribute.Desired) | Sort-Object)
        $currentSorted = @($current | Sort-Object)
        if (($currentSorted -join '|') -eq ($desiredSorted -join '|')) {
            $plan += New-PlanAction -Step 'user-attribute' -Target "$username/$($attribute.Name)" -Action 'NoChange' -Detail 'Attribute already carries the desired value set.'
        }
        else {
            $action = 'Update'
            if ($currentSorted.Count -eq 0) { $action = 'Create' }
            $plan += New-PlanAction -Step 'user-attribute' -Target "$username/$($attribute.Name)" -Action $action `
                -Detail ("[" + ($currentSorted -join ', ') + "] -> [" + ($desiredSorted -join ', ') + "]")
        }
    }

    foreach ($role in @($DesiredUser.realmRoles)) {
        if ($ExistingRealmRoles -contains [string] $role) {
            $plan += New-PlanAction -Step 'role-mapping' -Target "$username/$role" -Action 'NoChange' -Detail 'Role already mapped.'
        }
        else {
            $plan += New-PlanAction -Step 'role-mapping' -Target "$username/$role" -Action 'Create' -Detail 'Realm role not mapped to the user.'
        }
    }

    # VERIFY_PROFILE cleanup: a user created earlier without firstName/lastName keeps
    # the required action even after the fields are filled in -> login still blocked.
    $requiredActions = @()
    if ($null -ne $ExistingUser -and $ExistingUser.PSObject.Properties.Match('requiredActions').Count) {
        $requiredActions = @($ExistingUser.requiredActions | ForEach-Object { [string] $_ })
    }
    if ($requiredActions -contains 'VERIFY_PROFILE') {
        $plan += New-PlanAction -Step 'required-action' -Target "$username/VERIFY_PROFILE" -Action 'Update' `
            -Detail 'Stale VERIFY_PROFILE blocks login even with a complete profile; it is cleared once the profile fields are written.'
    }

    return @($plan)
}

function Get-UserProfilePolicyPlan {
    <#
    .SYNOPSIS
        unmanagedAttributePolicy must allow admin-written attributes, otherwise
        tid/enabled_modules cannot be stored at all (KC24 declarative user profile).
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][AllowEmptyString()][string] $CurrentPolicy,
        [string] $DesiredPolicy = 'ADMIN_EDIT'
    )

    # ADMIN_VIEW is deliberately NOT here: it lets an admin read unmanaged attributes
    # but not write them, so tid/enabled_modules still could not be stored.
    $acceptable = @('ADMIN_EDIT', 'ENABLED')
    if ($CurrentPolicy -eq $DesiredPolicy) {
        return New-PlanAction -Step 'user-profile-policy' -Target 'unmanagedAttributePolicy' -Action 'NoChange' -Detail "Already '$DesiredPolicy'."
    }
    if ($acceptable -contains $CurrentPolicy) {
        return New-PlanAction -Step 'user-profile-policy' -Target 'unmanagedAttributePolicy' -Action 'NoChange' `
            -Detail "Current policy '$CurrentPolicy' already permits admin-written unmanaged attributes."
    }
    return New-PlanAction -Step 'user-profile-policy' -Target 'unmanagedAttributePolicy' -Action 'Update' `
        -Detail "'$CurrentPolicy' -> '$DesiredPolicy' (without it tid/enabled_modules cannot be stored)."
}

function Get-PlanSummary {
    <#
    .SYNOPSIS
        Counts per action; PendingCount drives the exit code.
    #>
    [CmdletBinding()]
    param([Parameter(Mandatory)][AllowEmptyCollection()][object[]] $Plan)

    $create = @($Plan | Where-Object { $_.Action -eq 'Create' }).Count
    $update = @($Plan | Where-Object { $_.Action -eq 'Update' }).Count
    $noChange = @($Plan | Where-Object { $_.Action -eq 'NoChange' }).Count
    return [pscustomobject]@{
        Create       = $create
        Update       = $update
        NoChange     = $noChange
        PendingCount = $create + $update
        Total        = $Plan.Count
    }
}

Export-ModuleMember -Function `
    Get-KernelTenantTypes, Get-KernelModuleAllowlist, Get-ModuleAliasMap, `
    ConvertTo-CanonicalModuleId, ConvertTo-LegacyModuleId, Test-KernelAllowlistDrift, `
    Test-OnboardingProfile, Resolve-TenantModulePlan, New-KernelTenantStatement, `
    Get-ProfileValue, Get-DesiredEmailVerified, Get-ProfileAudiences, Get-DesiredClientMappers, `
    New-PlanAction, Get-RealmRolePlan, Get-ProtocolMapperPlan, Get-UserPlan, `
    Get-UserProfilePolicyPlan, Get-PlanSummary
