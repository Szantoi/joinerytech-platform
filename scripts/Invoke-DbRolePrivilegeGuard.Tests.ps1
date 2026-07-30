#requires -Version 5.1
<#
    A szerep-jogosultság kapu Pester-tesztje.

    A scriptnek van SAJÁT öntesztje is (`-SelfTest`), ami a policy `_selftest`
    korpuszán fut. Ez a fájl NEM azt ismétli meg: azokat az eseteket méri,
    amiket a korpusz szerkezetéből nem lehet — több egyidejű lelet, ismeretlen
    szerep, eltűnt szerep, üres bemenet. Ezek mindegyike olyan hibamód, ami
    csendben zöldnek látszana.
#>

BeforeAll {
    . "$PSScriptRoot/Invoke-DbRolePrivilegeGuard.ps1"

    $script:Policy = [pscustomobject]@{
        roles = @(
            [pscustomobject]@{ name = 'app_role';      allowBypassRls = $false; allowSuperuser = $false; mustExist = $true;  why = 'alkalmazas-szerep' }
            [pscustomobject]@{ name = 'owner_role';    allowBypassRls = $true;  allowSuperuser = $false; mustExist = $false; why = 'NOLOGIN routine-owner' }
            [pscustomobject]@{ name = 'cluster_owner'; allowBypassRls = $true;  allowSuperuser = $true;  mustExist = $true;  why = 'cluster-tulajdonos' }
        )
        requireNoLogin = @('owner_role')
    }

    function New-Role {
        param($Name, [bool]$Super = $false, [bool]$Bypass = $false, [bool]$CanLogin = $true)
        return @{ name = $Name; rolsuper = $Super; rolbypassrls = $Bypass; rolcanlogin = $CanLogin }
    }
}

Describe 'Get-DbRolePrivilegeVerdict' {

    It 'tisztat ad, ha minden szerep a vart jogosultsaggal fut' {
        $roles = @(
            (New-Role 'app_role'),
            (New-Role 'owner_role' -Bypass $true -CanLogin $false),
            (New-Role 'cluster_owner' -Super $true -Bypass $true)
        )
        $v = Get-DbRolePrivilegeVerdict -Roles $roles -Policy $script:Policy
        $v.ok | Should -BeTrue
        $v.findings | Should -HaveCount 0
    }

    It 'megfogja a nem engedelyezett BYPASSRLS-t -- ez a 2026-07-25-i lelet alakja' {
        $v = Get-DbRolePrivilegeVerdict -Roles @((New-Role 'app_role' -Bypass $true)) -Policy $script:Policy
        $v.ok | Should -BeFalse
        @($v.findings | Where-Object { $_.kind -eq 'bypassrls-not-allowed' }) | Should -HaveCount 1
    }

    It 'a SUPERUSER-t KULON megfogja, meg akkor is, ha a bypass-flag hamis' {
        # Ez a legkonnyebben kimarado eset: a superuser az RLS-t a bypass-flag
        # allasatol FUGGETLENUL megkeruli. Aki csak a rolbypassrls-t meri,
        # egy superuserre kapcsolt alkalmazas-szerepet zoldnek lat.
        $v = Get-DbRolePrivilegeVerdict -Roles @((New-Role 'app_role' -Super $true -Bypass $false)) -Policy $script:Policy
        @($v.findings | Where-Object { $_.kind -eq 'superuser-not-allowed' }) | Should -HaveCount 1
    }

    It 'megfogja, ha a routine-owner LOGIN-t kap -- ettol szabad bypass-belepove valik' {
        $v = Get-DbRolePrivilegeVerdict -Roles @((New-Role 'owner_role' -Bypass $true -CanLogin $true)) -Policy $script:Policy
        @($v.findings | Where-Object { $_.kind -eq 'routine-owner-can-login' }) | Should -HaveCount 1
    }

    It 'a routine-owner BYPASSRLS-e NOLOGIN mellett NEM lelet' {
        $v = Get-DbRolePrivilegeVerdict -Roles @((New-Role 'owner_role' -Bypass $true -CanLogin $false)) -Policy $script:Policy
        @($v.findings | Where-Object { $_.role -eq 'owner_role' }) | Should -HaveCount 0
    }

    It 'ismeretlen szerepet jelez, nem hallgat el' {
        # Egy uj modul szerepe es egy kezzel letrehozott szerep innen nezve
        # ugyanugy nez ki -- ezert kell emberi dontes, nem automatikus elfogadas.
        $v = Get-DbRolePrivilegeVerdict -Roles @((New-Role 'valami_uj_szerep')) -Policy $script:Policy
        @($v.findings | Where-Object { $_.kind -eq 'unknown-role' }) | Should -HaveCount 1
    }

    It 'jelzi a mustExist szerep eltuneset -- egy atnevezes mellett a kapu csendben semmit nem oriz' {
        $v = Get-DbRolePrivilegeVerdict -Roles @((New-Role 'cluster_owner' -Super $true -Bypass $true)) -Policy $script:Policy
        @($v.findings | Where-Object { $_.kind -eq 'missing-role' -and $_.role -eq 'app_role' }) | Should -HaveCount 1
    }

    It 'EGY szerepen ket kulonbozo leletet is jelez, nem csak az elsot' {
        # Ha a fuggveny az elso talalat utan kilepne, egy superuser+bypass
        # szerepnel a felet nem latnank.
        $v = Get-DbRolePrivilegeVerdict -Roles @((New-Role 'app_role' -Super $true -Bypass $true)) -Policy $script:Policy
        $kinds = @($v.findings | Where-Object { $_.role -eq 'app_role' } | ForEach-Object { $_.kind })
        $kinds | Should -Contain 'bypassrls-not-allowed'
        $kinds | Should -Contain 'superuser-not-allowed'
    }

    It 'URES bemenetre NEM ad tisztat -- egy ures szamlalon zold kapu a legrosszabb' {
        # Nulla szerep nem azt jelenti, hogy minden rendben: azt jelenti, hogy a
        # meres nem futott le. A mustExist szabalyok ezt leletbe forditjak.
        $v = Get-DbRolePrivilegeVerdict -Roles @() -Policy $script:Policy
        $v.ok | Should -BeFalse
        @($v.findings | Where-Object { $_.kind -eq 'missing-role' }) | Should -HaveCount 2
    }
}

Describe 'A valodi policy-fajl' {

    It 'letezik, es UTF8-kent olvasva olvashato magyar indoklasokat ad' {
        $path = Join-Path $PSScriptRoot '../config/db-role-privileges.json'
        Test-Path $path | Should -BeTrue
        $policy = Get-Content -Raw -Encoding UTF8 -Path $path | ConvertFrom-Json
        # A mojibake-regresszio ellen. Az ekezetes karaktert KODPONTBOL epitjuk,
        # NEM forrasbeli literalbol: a Windows PowerShell 5.1 a .ps1-et BOM nelkul
        # ANSI-kent olvassa, tehat egy 'tárgya' literal MAGA is elromlana a
        # tesztfajlban -- es akkor a teszt a sajat kodolasi hibajat merne, nem a
        # policy-olvasast. (Ez a hiba pontosan igy fordult elo eloszor.)
        $aAcute = [char]0x00E1   # 'a' hosszu ekezettel
        $why = ($policy.roles | Where-Object { $_.name -eq 'spaceos_inventory_worker' }).why
        $why | Should -BeLike "*t${aAcute}rgya*"
        # Es kimondottan: NE legyen benne a Unicode-helyettesito karakter, ami a
        # rossz kodolas biztos jele.
        $why | Should -Not -BeLike ([string]::Concat('*', [char]0xFFFD, '*'))
    }

    It 'minden BYPASSRLS-kivetelhez tartozik INDOKLAS' {
        $path = Join-Path $PSScriptRoot '../config/db-role-privileges.json'
        $policy = Get-Content -Raw -Encoding UTF8 -Path $path | ConvertFrom-Json
        foreach ($r in ($policy.roles | Where-Object { $_.allowBypassRls })) {
            # Indoklas nelkuli kivetel volt AZ EREDETI LELET: a repoban sehol nem
            # volt dokumentalva, miert kapta a ket worker a BYPASSRLS-t.
            $r.why | Should -Not -BeNullOrEmpty -Because "a '$($r.name)' BYPASSRLS-kivetele indoklas nelkul all"
            $r.why.Length | Should -BeGreaterThan 20 -Because "a '$($r.name)' indoklasa tul rovid ahhoz, hogy dontest lehessen ra alapozni"
        }
    }

    It 'a ket 2026-07-25-i lelet-szerep NEM kaphat BYPASSRLS-t a policy szerint' {
        $path = Join-Path $PSScriptRoot '../config/db-role-privileges.json'
        $policy = Get-Content -Raw -Encoding UTF8 -Path $path | ConvertFrom-Json
        foreach ($name in @('spaceos_inventory_worker', 'spaceos_procurement_worker')) {
            $r = $policy.roles | Where-Object { $_.name -eq $name }
            $r | Should -Not -BeNullOrEmpty
            $r.allowBypassRls | Should -BeFalse -Because "$name a lelet targya volt; ha ez true-ra valtozik, a kapu erre a szerepre megszunt"
        }
    }
}
