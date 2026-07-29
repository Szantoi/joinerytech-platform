#requires -Version 5.1
<#
.SYNOPSIS
    Idempotent tenant onboarding for the SpaceOS/JoineryTech Keycloak realm.
    STAB-TENANT-ONBOARDING-RUNBOOK (EPIC-PLATFORM-STABILITY-2026Q3).

.DESCRIPTION
    Turns the manual 2026-07-27 provisioning sequence (realm roles, tid +
    enabled_modules protocol mappers, unmanaged-attribute policy, user attributes,
    role mapping, tenant record) into a repeatable, config-driven script.

    DRY-RUN IS THE DEFAULT. Without -Apply the script only reads the realm and
    prints the plan; every mutation requires the explicit -Apply switch, and a run
    against the live realm additionally requires Gabor's approval (repo CLAUDE.md).

    Idempotency: every step is observe -> compare -> act-only-on-drift, so a second
    run of the same profile reports PendingCount = 0 and changes nothing.

    The Kernel tenant record is NOT written by this script. Live DB mutation is a
    separate gate, so the script emits an allowlist-validated SQL statement for the
    runbook's DB step instead (see -KernelSqlPath).

    Admin credentials come from -AdminCredential or the KEYCLOAK_ADMIN_USER /
    KEYCLOAK_ADMIN_PASSWORD environment variables. They are never written to the
    console, the summary or the SQL artifact.

.PARAMETER ProfilePath
    Onboarding profile JSON (see config/tenant-onboarding.sample.json).

.PARAMETER Apply
    Execute the plan. Without it the script is strictly read-only.

.PARAMETER Offline
    Validate the profile and compute the module/SQL plan without contacting
    Keycloak. Useful in CI and as reviewable evidence.

.PARAMETER VerifyOnly
    Read-only convergence check: exits 1 if anything still differs from the profile.

.PARAMETER TemporaryPassword
    Optional temporary password set on users CREATED by this run (temporary = true,
    so Keycloak forces a change at first login). Never logged.

.EXAMPLE
    powershell -File scripts/Invoke-KeycloakTenantOnboarding.ps1 -ProfilePath config/tenant-onboarding.sample.json -Offline

.EXAMPLE
    powershell -File scripts/Invoke-KeycloakTenantOnboarding.ps1 -ProfilePath <profile>.json -Apply -SummaryPath artifacts/onboarding.json
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)][string] $ProfilePath,
    [switch] $Apply,
    [switch] $Offline,
    [switch] $VerifyOnly,
    [pscredential] $AdminCredential,
    [securestring] $TemporaryPassword,
    [string] $AliasMapPath,
    [string] $SummaryPath,
    [string] $KernelSqlPath,
    [int] $TimeoutSeconds = 30
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$EXIT_CONVERGED = 0
$EXIT_PENDING = 1
$EXIT_ERROR = 2

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptRoot
Import-Module (Join-Path $scriptRoot 'KeycloakOnboarding.psm1') -Force

if ([string]::IsNullOrWhiteSpace($AliasMapPath)) {
    $AliasMapPath = Join-Path $repoRoot 'docs/knowledge/contracts/module-id-legacy-aliases.json'
}

[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

$script:AccessToken = $null
$script:Log = New-Object System.Collections.Generic.List[object]

function Write-Step {
    param([string] $Message, [string] $Level = 'Info')
    $prefix = '[ ]'
    if ($Level -eq 'Warn') { $prefix = '[!]' }
    if ($Level -eq 'Error') { $prefix = '[x]' }
    if ($Level -eq 'Ok') { $prefix = '[+]' }
    Write-Host "$prefix $Message"
}

function Get-AdminCredentialOrThrow {
    if ($AdminCredential) { return $AdminCredential }
    $user = $env:KEYCLOAK_ADMIN_USER
    $password = $env:KEYCLOAK_ADMIN_PASSWORD
    if ([string]::IsNullOrWhiteSpace($user) -or [string]::IsNullOrWhiteSpace($password)) {
        throw 'Missing admin credentials: pass -AdminCredential or set KEYCLOAK_ADMIN_USER / KEYCLOAK_ADMIN_PASSWORD.'
    }
    return New-Object pscredential($user, (ConvertTo-SecureString $password -AsPlainText -Force))
}

function ConvertFrom-SecureStringPlain {
    param([securestring] $Secure)
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
    try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

function Connect-Keycloak {
    param([string] $BaseUrl, [string] $AdminRealm, [string] $AdminClientId)

    $credential = Get-AdminCredentialOrThrow
    $body = @{
        grant_type = 'password'
        client_id  = $AdminClientId
        username   = $credential.UserName
        password   = ConvertFrom-SecureStringPlain $credential.Password
    }
    $uri = "$BaseUrl/realms/$AdminRealm/protocol/openid-connect/token"
    try {
        $response = Invoke-RestMethod -Method Post -Uri $uri -Body $body -TimeoutSec $TimeoutSeconds `
            -ContentType 'application/x-www-form-urlencoded'
    }
    catch {
        # The message is deliberately generic: a Keycloak auth error body can echo
        # back request parameters.
        throw "Keycloak admin authentication failed against $uri (user '$($credential.UserName)')."
    }
    finally {
        $body['password'] = $null
    }
    $script:AccessToken = $response.access_token
}

function Invoke-KcApi {
    param(
        [Parameter(Mandatory)][ValidateSet('GET', 'POST', 'PUT', 'DELETE')][string] $Method,
        [Parameter(Mandatory)][string] $Uri,
        $Body,
        [switch] $AllowNotFound
    )

    $headers = @{ Authorization = "Bearer $script:AccessToken" }
    $parameters = @{
        Method      = $Method
        Uri         = $Uri
        Headers     = $headers
        TimeoutSec  = $TimeoutSeconds
        ErrorAction = 'Stop'
    }
    if ($null -ne $Body) {
        $json = $Body | ConvertTo-Json -Depth 8 -Compress
        # Windows PowerShell 5.1 has no -AsArray: a single-element array serialises as
        # a bare object, which Keycloak rejects with 400 (e.g. role-mappings).
        if (($Body -is [array]) -and -not $json.StartsWith('[')) { $json = "[$json]" }
        $parameters['Body'] = $json
        $parameters['ContentType'] = 'application/json'
    }

    try {
        # Assign first, then return: `return Invoke-RestMethod ...` forwards the
        # cmdlet's non-enumerated write, so a JSON array would reach the caller as a
        # single element (an empty [] then looks like one item with no properties).
        $response = Invoke-RestMethod @parameters
        return $response
    }
    catch {
        $status = $null
        if ($_.Exception.PSObject.Properties.Match('Response').Count -and $_.Exception.Response) {
            $status = [int] $_.Exception.Response.StatusCode
        }
        if ($AllowNotFound -and $status -eq 404) { return $null }
        throw "Keycloak API $Method $Uri failed (HTTP $status): $($_.Exception.Message)"
    }
}

function Get-RealmState {
    param([string] $BaseUrl, [string] $Realm, [string] $ClientId, [object[]] $Users)

    $adminBase = "$BaseUrl/admin/realms/$Realm"

    $userProfile = Invoke-KcApi -Method GET -Uri "$adminBase/users/profile"
    $policy = ''
    if ($userProfile -and $userProfile.PSObject.Properties.Match('unmanagedAttributePolicy').Count) {
        $policy = [string] $userProfile.unmanagedAttributePolicy
    }

    $roles = @(Invoke-KcApi -Method GET -Uri "$adminBase/roles?briefRepresentation=true&max=1000")
    # Select-Object -First 1 everywhere instead of [0]: indexing an empty result
    # throws under Set-StrictMode Latest, which would mask a real "not found".
    $client = Invoke-KcApi -Method GET -Uri "$adminBase/clients?clientId=$([uri]::EscapeDataString($ClientId))" | Select-Object -First 1
    if ($null -eq $client) { throw "Client '$ClientId' not found in realm '$Realm'." }
    $mappers = @(Invoke-KcApi -Method GET -Uri "$adminBase/clients/$($client.id)/protocol-mappers/models")

    $userStates = @{}
    foreach ($user in $Users) {
        $username = [string] $user.username
        $found = @(Invoke-KcApi -Method GET -Uri "$adminBase/users?username=$([uri]::EscapeDataString($username))&exact=true")
        $existing = $null
        $mappedRoles = @()
        if ($found.Count -gt 0) {
            $existing = Invoke-KcApi -Method GET -Uri "$adminBase/users/$($found[0].id)"
            $mappedRoles = @(Invoke-KcApi -Method GET -Uri "$adminBase/users/$($found[0].id)/role-mappings/realm" | ForEach-Object { [string] $_.name })
        }
        $userStates[$username] = [pscustomobject]@{ User = $existing; RealmRoles = $mappedRoles }
    }

    return [pscustomobject]@{
        AdminBase             = $adminBase
        UserProfile           = $userProfile
        UnmanagedPolicy       = $policy
        Roles                 = @($roles | ForEach-Object { [string] $_.name })
        RoleObjects           = $roles
        Client                = $client
        Mappers               = $mappers
        Users                 = $userStates
    }
}

function New-OnboardingPlan {
    param($Profile, $State, $ModulePlan, [string] $TenantIdAttribute, [string] $ModulesAttribute, [string] $DesiredPolicy)

    $plan = New-Object System.Collections.Generic.List[object]
    $plan.Add((Get-UserProfilePolicyPlan -CurrentPolicy $State.UnmanagedPolicy -DesiredPolicy $DesiredPolicy))
    foreach ($action in (Get-RealmRolePlan -DesiredRoles @($Profile.realmRoles) -ExistingRoles $State.Roles)) { $plan.Add($action) }

    $desiredMappers = Get-DesiredClientMappers -TenantIdAttribute $TenantIdAttribute -ModulesAttribute $ModulesAttribute `
        -Audiences (Get-ProfileAudiences -Profile $Profile)
    foreach ($action in (Get-ProtocolMapperPlan -DesiredMappers $desiredMappers -ExistingMappers $State.Mappers)) { $plan.Add($action) }

    foreach ($user in @($Profile.users)) {
        $username = [string] $user.username
        $observed = $State.Users[$username]
        $existingUser = $null
        $existingRoles = @()
        if ($observed) { $existingUser = $observed.User; $existingRoles = @($observed.RealmRoles) }
        $actions = Get-UserPlan -DesiredUser $user -TenantId ([string] $Profile.tenant.id) `
            -ClaimValues @($ModulePlan.ClaimValues) -TenantIdAttribute $TenantIdAttribute `
            -ModulesAttribute $ModulesAttribute -ExistingUser $existingUser -ExistingRealmRoles $existingRoles
        foreach ($action in $actions) { $plan.Add($action) }
    }

    # ToArray(): @(<List of PSCustomObject>) throws ArgumentException on Windows PowerShell 5.1.
    return [object[]] $plan.ToArray()
}

function Invoke-OnboardingPlan {
    param($Profile, $State, $ModulePlan, [object[]] $Plan, [string] $TenantIdAttribute, [string] $ModulesAttribute, [string] $DesiredPolicy)

    $adminBase = $State.AdminBase
    $pending = @($Plan | Where-Object { $_.Action -ne 'NoChange' })

    # 1. unmanaged attribute policy (must precede any attribute write)
    if (@($pending | Where-Object { $_.Step -eq 'user-profile-policy' }).Count -gt 0) {
        $body = $State.UserProfile
        if ($body.PSObject.Properties.Match('unmanagedAttributePolicy').Count) {
            $body.unmanagedAttributePolicy = $DesiredPolicy
        }
        else {
            $body | Add-Member -NotePropertyName 'unmanagedAttributePolicy' -NotePropertyValue $DesiredPolicy
        }
        Invoke-KcApi -Method PUT -Uri "$adminBase/users/profile" -Body $body | Out-Null
        Write-Step "unmanagedAttributePolicy -> $DesiredPolicy" 'Ok'
    }

    # 2. realm roles
    foreach ($action in @($pending | Where-Object { $_.Step -eq 'realm-role' })) {
        Invoke-KcApi -Method POST -Uri "$adminBase/roles" -Body @{ name = $action.Target; description = "SpaceOS portal role ($($action.Target))" } | Out-Null
        Write-Step "realm role created: $($action.Target)" 'Ok'
    }

    # 3. protocol mappers on the portal client
    $desiredMappers = Get-DesiredClientMappers -TenantIdAttribute $TenantIdAttribute -ModulesAttribute $ModulesAttribute `
        -Audiences (Get-ProfileAudiences -Profile $Profile)
    foreach ($action in @($pending | Where-Object { $_.Step -eq 'protocol-mapper' })) {
        $desired = $desiredMappers | Where-Object { $_.name -eq $action.Target } | Select-Object -First 1
        $body = @{
            name           = $desired.name
            protocol       = $desired.protocol
            protocolMapper = $desired.protocolMapper
            config         = $desired.config
        }
        $existing = $State.Mappers | Where-Object { $_.name -eq $desired.name } | Select-Object -First 1
        if ($null -eq $existing) {
            Invoke-KcApi -Method POST -Uri "$adminBase/clients/$($State.Client.id)/protocol-mappers/models" -Body $body | Out-Null
            Write-Step "protocol mapper created: $($desired.name)" 'Ok'
        }
        else {
            $body['id'] = $existing.id
            Invoke-KcApi -Method PUT -Uri "$adminBase/clients/$($State.Client.id)/protocol-mappers/models/$($existing.id)" -Body $body | Out-Null
            Write-Step "protocol mapper updated: $($desired.name)" 'Ok'
        }
    }

    # 4. users: create/update, attributes, required actions, role mappings
    foreach ($user in @($Profile.users)) {
        $username = [string] $user.username
        # Split the pending actions: a missing role mapping must NOT drag a full user PUT
        # with it -- that would rewrite profile fields and attributes the plan reported as
        # NoChange (out-of-plan mutation).
        $profilePending = @($pending | Where-Object {
            @('user', 'user-attribute', 'required-action') -contains $_.Step -and
            ($_.Target -eq $username -or $_.Target -like "$username/*")
        })
        $rolePending = @($pending | Where-Object { $_.Step -eq 'role-mapping' -and $_.Target -like "$username/*" })
        if ($profilePending.Count -eq 0 -and $rolePending.Count -eq 0) { continue }

        $observed = $State.Users[$username]
        $existingUser = $null
        if ($observed) { $existingUser = $observed.User }

        $attributes = @{}
        if ($null -ne $existingUser -and
            $existingUser.PSObject.Properties.Match('attributes').Count -and
            $null -ne $existingUser.attributes) {
            foreach ($property in $existingUser.attributes.PSObject.Properties) {
                $attributes[$property.Name] = @($property.Value)
            }
        }
        $attributes[$TenantIdAttribute] = @([string] $Profile.tenant.id)
        $attributes[$ModulesAttribute] = @($ModulePlan.ClaimValues)

        $requiredActions = @()
        if ($null -ne $existingUser -and $existingUser.PSObject.Properties.Match('requiredActions').Count) {
            $requiredActions = @($existingUser.requiredActions | Where-Object { $_ -ne 'VERIFY_PROFILE' })
        }

        $body = @{
            username        = $username
            email           = [string] $user.email
            firstName       = [string] $user.firstName
            lastName        = [string] $user.lastName
            enabled         = $true
            emailVerified   = (Get-DesiredEmailVerified -DesiredUser $user)
            attributes      = $attributes
            requiredActions = $requiredActions
        }

        if ($null -eq $existingUser) {
            Invoke-KcApi -Method POST -Uri "$adminBase/users" -Body $body | Out-Null
            $created = Invoke-KcApi -Method GET -Uri "$adminBase/users?username=$([uri]::EscapeDataString($username))&exact=true" | Select-Object -First 1
            if ($null -eq $created) { throw "User '$username' was created but cannot be read back." }
            $userId = $created.id
            Write-Step "user created: $username" 'Ok'
            if ($TemporaryPassword) {
                Invoke-KcApi -Method PUT -Uri "$adminBase/users/$userId/reset-password" -Body @{
                    type      = 'password'
                    value     = (ConvertFrom-SecureStringPlain $TemporaryPassword)
                    temporary = $true
                } | Out-Null
                Write-Step "temporary password set (change required at first login): $username" 'Ok'
            }
        }
        elseif ($profilePending.Count -gt 0) {
            $userId = $existingUser.id
            Invoke-KcApi -Method PUT -Uri "$adminBase/users/$userId" -Body $body | Out-Null
            Write-Step "user updated: $username" 'Ok'
        }
        else {
            # Only role mappings are pending -- leave the user representation untouched.
            $userId = $existingUser.id
        }

        $mappedRoles = @(Invoke-KcApi -Method GET -Uri "$adminBase/users/$userId/role-mappings/realm" | ForEach-Object { [string] $_.name })
        $missingRoles = @(@($user.realmRoles) | Where-Object { $mappedRoles -notcontains [string] $_ })
        if ($missingRoles.Count -gt 0) {
            $roleBodies = @()
            foreach ($role in $missingRoles) {
                $roleObject = Invoke-KcApi -Method GET -Uri "$adminBase/roles/$([uri]::EscapeDataString([string] $role))"
                $roleBodies += @{ id = $roleObject.id; name = $roleObject.name }
            }
            Invoke-KcApi -Method POST -Uri "$adminBase/users/$userId/role-mappings/realm" -Body $roleBodies | Out-Null
            Write-Step "realm roles mapped to ${username}: $($missingRoles -join ', ')" 'Ok'
        }
    }
}

# --- main ---------------------------------------------------------------------

$exitCode = $EXIT_ERROR
$summary = $null

try {
    if ($Apply -and $VerifyOnly) { throw '-Apply and -VerifyOnly are mutually exclusive.' }
    if ($Apply -and $Offline) { throw '-Apply and -Offline are mutually exclusive.' }
    # -VerifyOnly asserts convergence against a live realm; -Offline never contacts one.
    # Allowing both would let the Offline branch return exit 0, which a CI verify caller
    # would read as "converged" without a single Keycloak check.
    if ($VerifyOnly -and $Offline) { throw '-VerifyOnly and -Offline are mutually exclusive: an offline run cannot verify a realm.' }
    if (-not (Test-Path -LiteralPath $ProfilePath)) { throw "Profile not found: $ProfilePath" }

    $profileData = Get-Content -LiteralPath $ProfilePath -Raw -Encoding UTF8 | ConvertFrom-Json
    $aliasMap = Get-ModuleAliasMap -Path $AliasMapPath

    # @(): a function returning an empty array yields $null, and $null.Count throws under StrictMode.
    $drift = @(Test-KernelAllowlistDrift -AliasMap $aliasMap)
    if ($drift.Count -gt 0) {
        throw ("Kernel allowlist mirror drifted from the ADR-067 alias table (unknown keys: " + ($drift -join ', ') + "). Fix scripts/KeycloakOnboarding.psm1 before onboarding.")
    }

    $findings = @(Test-OnboardingProfile -Profile $profileData -AliasMap $aliasMap)
    foreach ($finding in $findings) {
        $level = 'Warn'
        if ($finding.Severity -eq 'Error') { $level = 'Error' }
        Write-Step "$($finding.Severity) [$($finding.Code)] $($finding.Target): $($finding.Message)" $level
    }
    if (@($findings | Where-Object { $_.Severity -eq 'Error' }).Count -gt 0) {
        throw 'Profile validation failed; no Keycloak call was made.'
    }

    $claimFormat = 'canonical'
    if ($profileData.PSObject.Properties.Match('claims').Count -and
        $profileData.claims.PSObject.Properties.Match('moduleIdFormat').Count) {
        $claimFormat = [string] $profileData.claims.moduleIdFormat
    }
    $tenantIdAttribute = 'tid'
    $modulesAttribute = 'enabled_modules'
    if ($profileData.PSObject.Properties.Match('claims').Count) {
        if ($profileData.claims.PSObject.Properties.Match('tenantIdAttribute').Count) { $tenantIdAttribute = [string] $profileData.claims.tenantIdAttribute }
        if ($profileData.claims.PSObject.Properties.Match('modulesAttribute').Count) { $modulesAttribute = [string] $profileData.claims.modulesAttribute }
    }
    $desiredPolicy = 'ADMIN_EDIT'
    if ($profileData.PSObject.Properties.Match('userProfile').Count -and
        $profileData.userProfile.PSObject.Properties.Match('unmanagedAttributePolicy').Count) {
        $desiredPolicy = [string] $profileData.userProfile.unmanagedAttributePolicy
    }

    $modulePlan = Resolve-TenantModulePlan -TenantType ([string] $profileData.tenant.tenantType) `
        -Modules @($profileData.tenant.modules | ForEach-Object { [string] $_ }) -AliasMap $aliasMap -ClaimFormat $claimFormat

    foreach ($blocked in $modulePlan.NotRepresentableInKernel) {
        Write-Step ("Kernel tenant record cannot carry '$($blocked.ModuleId)': $($blocked.Reason). " +
            "ADR-067 known gap -- the module stays in the JWT claim (UI hint) until EntitledModules lands (ERPSEP-05/06).") 'Warn'
    }
    foreach ($missing in $modulePlan.MissingKernelRequired) {
        Write-Step "TenantType '$($profileData.tenant.tenantType)' requires module '$missing' in the Kernel record; the INSERT would be rejected without it." 'Warn'
    }

    $kernelSql = New-KernelTenantStatement -TenantId ([string] $profileData.tenant.id) -Name ([string] $profileData.tenant.name) `
        -TenantType ([string] $profileData.tenant.tenantType) -KernelEnabledModules @($modulePlan.KernelEnabledModules) `
        -MissingRequired @($modulePlan.MissingKernelRequired)
    if ($KernelSqlPath) {
        $sqlDirectory = Split-Path -Parent $KernelSqlPath
        if ($sqlDirectory -and -not (Test-Path -LiteralPath $sqlDirectory)) { New-Item -ItemType Directory -Path $sqlDirectory -Force | Out-Null }
        Set-Content -LiteralPath $KernelSqlPath -Value $kernelSql -Encoding UTF8
        if (@($modulePlan.MissingKernelRequired).Count -gt 0) {
            Write-Step "Kernel tenant SQL REFUSED (not runnable, reason written to the file): $KernelSqlPath" 'Warn'
        }
        else {
            Write-Step "Kernel tenant SQL written (NOT executed): $KernelSqlPath" 'Ok'
        }
    }

    $mode = 'DryRun'
    if ($Offline) { $mode = 'Offline' }
    elseif ($Apply) { $mode = 'Apply' }
    elseif ($VerifyOnly) { $mode = 'Verify' }

    $plan = @()
    $planSummary = $null
    $verified = $null

    if (-not $Offline) {
        Connect-Keycloak -BaseUrl ([string] $profileData.keycloak.baseUrl) `
            -AdminRealm ([string] $profileData.keycloak.adminRealm) `
            -AdminClientId ([string] $profileData.keycloak.adminClientId)

        $state = Get-RealmState -BaseUrl ([string] $profileData.keycloak.baseUrl) -Realm ([string] $profileData.keycloak.realm) `
            -ClientId ([string] $profileData.keycloak.clientId) -Users @($profileData.users)
        $plan = New-OnboardingPlan -Profile $profileData -State $state -ModulePlan $modulePlan `
            -TenantIdAttribute $tenantIdAttribute -ModulesAttribute $modulesAttribute -DesiredPolicy $desiredPolicy
        $planSummary = Get-PlanSummary -Plan $plan

        foreach ($action in $plan) {
            $level = 'Info'
            if ($action.Action -eq 'NoChange') { $level = 'Ok' }
            Write-Step "$($action.Action.PadRight(8)) $($action.Step)/$($action.Target) -- $($action.Detail)" $level
        }

        if ($Apply) {
            if ($planSummary.PendingCount -eq 0) {
                Write-Step 'Nothing to apply: the realm already matches the profile.' 'Ok'
            }
            else {
                Invoke-OnboardingPlan -Profile $profileData -State $state -ModulePlan $modulePlan -Plan $plan `
                    -TenantIdAttribute $tenantIdAttribute -ModulesAttribute $modulesAttribute -DesiredPolicy $desiredPolicy
            }

            # Post-apply convergence proof: re-read and re-plan.
            $state = Get-RealmState -BaseUrl ([string] $profileData.keycloak.baseUrl) -Realm ([string] $profileData.keycloak.realm) `
                -ClientId ([string] $profileData.keycloak.clientId) -Users @($profileData.users)
            $verifyPlan = New-OnboardingPlan -Profile $profileData -State $state -ModulePlan $modulePlan `
                -TenantIdAttribute $tenantIdAttribute -ModulesAttribute $modulesAttribute -DesiredPolicy $desiredPolicy
            $verifySummary = Get-PlanSummary -Plan $verifyPlan
            $verified = ($verifySummary.PendingCount -eq 0)
            if ($verified) { Write-Step 'Verification: realm converged (a re-run would change nothing).' 'Ok' }
            else {
                Write-Step "Verification FAILED: $($verifySummary.PendingCount) action(s) still pending after apply." 'Error'
                foreach ($action in @($verifyPlan | Where-Object { $_.Action -ne 'NoChange' })) {
                    Write-Step "  still pending: $($action.Step)/$($action.Target) -- $($action.Detail)" 'Error'
                }
            }
            $plan = $verifyPlan
            $planSummary = $verifySummary
        }
    }

    $pendingCount = 0
    if ($null -ne $planSummary) { $pendingCount = $planSummary.PendingCount }

    $summary = [pscustomobject]@{
        script            = 'Invoke-KeycloakTenantOnboarding.ps1'
        task              = 'STAB-TENANT-ONBOARDING-RUNBOOK'
        mode              = $mode
        profilePath       = $ProfilePath
        realm             = [string] $profileData.keycloak.realm
        clientId          = [string] $profileData.keycloak.clientId
        aliasMapVersion   = $aliasMap.Version
        tenant            = [pscustomobject]@{
            id                       = [string] $profileData.tenant.id
            name                     = [string] $profileData.tenant.name
            tenantType               = [string] $profileData.tenant.tenantType
            claimFormat              = $claimFormat
            claimValues              = @($modulePlan.ClaimValues)
            kernelEnabledModules     = @($modulePlan.KernelEnabledModules)
            notRepresentableInKernel = @($modulePlan.NotRepresentableInKernel)
            missingKernelRequired    = @($modulePlan.MissingKernelRequired)
        }
        validation        = @($findings)
        plan              = @($plan)
        planSummary       = $planSummary
        pendingCount      = $pendingCount
        verified          = $verified
        kernelTenantSql   = $kernelSql
        kernelSqlPath     = $KernelSqlPath
    }

    if ($Offline) { $exitCode = $EXIT_CONVERGED }
    elseif ($Apply) {
        if ($verified) { $exitCode = $EXIT_CONVERGED } else { $exitCode = $EXIT_PENDING }
    }
    else {
        if ($pendingCount -eq 0) { $exitCode = $EXIT_CONVERGED } else { $exitCode = $EXIT_PENDING }
    }
}
catch {
    Write-Step $_.Exception.Message 'Error'
    # Diagnostics on the verbose stream (NOT stdout, which must stay one JSON document).
    # A stack trace names script lines and function names, never credentials.
    Write-Verbose $_.ScriptStackTrace -Verbose
    $summary = [pscustomobject]@{
        script       = 'Invoke-KeycloakTenantOnboarding.ps1'
        task         = 'STAB-TENANT-ONBOARDING-RUNBOOK'
        mode         = 'Error'
        error        = $_.Exception.Message
        profilePath  = $ProfilePath
    }
    $exitCode = $EXIT_ERROR
}

$json = $summary | ConvertTo-Json -Depth 8
Write-Output $json
if ($SummaryPath) {
    try {
        $summaryDirectory = Split-Path -Parent $SummaryPath
        if ($summaryDirectory -and -not (Test-Path -LiteralPath $summaryDirectory)) { New-Item -ItemType Directory -Path $summaryDirectory -Force | Out-Null }
        Set-Content -LiteralPath $SummaryPath -Value $json -Encoding UTF8
    }
    catch {
        Write-Step "Could not write summary to '$SummaryPath': $($_.Exception.Message)" 'Warn'
    }
}

exit $exitCode
