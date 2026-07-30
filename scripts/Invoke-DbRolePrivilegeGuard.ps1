#requires -Version 5.1
<#
.SYNOPSIS
    Adatbázis-szerep jogosultság-kapu: egy néma `ALTER ROLE … BYPASSRLS` ne
    nyithassa vissza a bérlő-izolációt.

.DESCRIPTION
    A STAB-RLS-WORKER-BYPASS zárótétele. A 2026-07-25-i lelet az volt, hogy két
    élő worker-szerep (`spaceos_inventory_worker`, `spaceos_procurement_worker`)
    `BYPASSRLS`-sel futott, és **a repóban sehol nem volt dokumentálva, hogy ez
    szándékos-e**. Gábor 2026-07-27-i döntése után mindkettő `NOBYPASSRLS`, a
    keresztbérlős részműveletek pedig szűk `SECURITY DEFINER` függvényekbe
    kerültek.

    A javítás viszont **egy `ALTER ROLE` paranccsal visszacsinálható, némán** —
    és a jelenlegi bizonyíték (modul-tesztek Testcontainersen) az ÉLES szerepekről
    semmit nem mond. Ez a script az a visszatérő ellenőrzés, ami ezt megfogja.

    Szerkezet — szándékosan két rétegben:
      * `Get-DbRolePrivilegeVerdict`  — TISZTA függvény, nincs I/O. Ezért
        tesztelhető adatbázis nélkül, és ezért lehet öntesztje.
      * `Get-DbRolePrivilegeSnapshot` — az I/O: `psql` a `pg_roles` katalógusra.
      * `Invoke-DbRolePrivilegeGuard` — a kettő összekötése + kilépési kód.

    Miért nem elég a modul-teszt: az egy eldobható konténerben a MIGRÁCIÓ
    eredményét méri. Az éles adatbázisban a szerep állapota ettől függetlenül
    elmozdulhat (kézi `ALTER ROLE`, restore régi dumpból, provisioning-script).
    A kapu ezért a FUTÓ adatbázis katalógusát olvassa.

.PARAMETER PolicyPath
    A várt jogosultságokat leíró JSON. Alapértelmezés: config/db-role-privileges.json

.PARAMETER VpsAlias
    SSH-alias, ha a mérés a VPS-en fut. Alapértelmezés: joinerytech-vps

.PARAMETER Database
    A csatlakozáshoz használt adatbázis. A szerepek CLUSTER-GLOBÁLISAK, tehát
    az eredményt nem befolyásolja. Alapértelmezés: postgres

.PARAMETER Port
    A PostgreSQL-cluster portja. Alapértelmezés: 5433 (mérve 2026-07-30: a VPS-en
    egyetlen cluster fut, PostgreSQL 17, az 5433-on).

.PARAMETER Local
    A `psql`-t helyben futtatja, nem SSH-n át (CI / Testcontainers).

.PARAMETER SelfTest
    Nem nyúl adatbázishoz: a policy `_selftest` korpuszán bizonyítja, hogy a
    kapu HARAP (mustFail) és NEM VAKLÁRMA (mustPass). Enélkül egy mindig-zöld
    kapu megkülönböztethetetlen attól, amelyik el sem indul.

.EXAMPLE
    pwsh -File scripts/Invoke-DbRolePrivilegeGuard.ps1 -SelfTest

.EXAMPLE
    pwsh -File scripts/Invoke-DbRolePrivilegeGuard.ps1 -VpsAlias joinerytech-vps
#>
param(
    [string] $PolicyPath = (Join-Path $PSScriptRoot '../config/db-role-privileges.json'),
    [string] $VpsAlias = 'joinerytech-vps',
    [string] $Database = 'postgres',
    [int]    $Port = 5433,
    [switch] $Local,
    [switch] $SelfTest
)

Set-StrictMode -Version Latest

# A policy indoklasai magyarul vannak. A Windows-konzol alapbol a rendszer ANSI
# kodlapjan ir, es az ekezetek mojibake-ke valnak -- egy kapu, aminek az
# indoklasa olvashatatlan, nem tudja elmondani, MIERT bukott. Ez a sor a
# KIMENETET allitja UTF-8-ra (a policy BEOLVASASA kulon -Encoding UTF8-cal megy).
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }

# ---------------------------------------------------------------------------
# TISZTA KIÉRTÉKELÉS — nincs I/O, ezért adatbázis nélkül tesztelhető.
# ---------------------------------------------------------------------------

<#
.SYNOPSIS
    Egy pg_roles-pillanatképet vet össze a várt jogosultságokkal.
.OUTPUTS
    Objektum: @{ ok = [bool]; findings = @( @{ kind; role; detail } ) }
#>
function Get-DbRolePrivilegeVerdict {
    param(
        [Parameter(Mandatory)] [AllowEmptyCollection()] [object[]] $Roles,
        [Parameter(Mandatory)] [object] $Policy
    )

    $findings = @()
    $expected = @{}
    foreach ($r in $Policy.roles) { $expected[$r.name] = $r }

    $noLogin = @()
    if ($Policy.PSObject.Properties.Name -contains 'requireNoLogin' -and $Policy.requireNoLogin) {
        $noLogin = @($Policy.requireNoLogin)
    }

    $seen = @{}

    foreach ($role in $Roles) {
        $name = [string]$role.name
        $seen[$name] = $true
        $rule = $expected[$name]

        if (-not $rule) {
            # Ismeretlen szerep. NEM hallgatjuk el: egy új modul szerepe és egy
            # kézzel létrehozott szerep innen nézve ugyanúgy néz ki, és épp ezért
            # kell egy emberi döntés a policy-ba. A `canlogin=false` katalógus-
            # szerepek (pg_*) nem érnek el idáig, azokat a lekérdezés kiszűri.
            $findings += @{
                kind   = 'unknown-role'
                role   = $name
                detail = "A szerep nincs a policy-ban. Ha jogos, vedd fel a config/db-role-privileges.json-be INDOKLASSAL; ha nem, ez lelet."
            }
            continue
        }

        if ($role.rolbypassrls -and -not $rule.allowBypassRls) {
            $findings += @{
                kind   = 'bypassrls-not-allowed'
                role   = $name
                detail = "BYPASSRLS mellett a FORCE ROW LEVEL SECURITY NEM ervenyesul -- a szerep minden berlo minden sorat latja. A policy szerint ennek a szerepnek NOBYPASSRLS-nek kell lennie. Indok: $($rule.why)"
            }
        }

        if ($role.rolsuper -and -not $rule.allowSuperuser) {
            # Külön a BYPASSRLS-től: a superuser MINDIG megkerüli az RLS-t,
            # `rolbypassrls=f` mellett is. Aki csak a bypass-flaget méri, ezt
            # nem látja.
            $findings += @{
                kind   = 'superuser-not-allowed'
                role   = $name
                detail = "SUPERUSER: az RLS-t a bypass-flag ALLASATOL FUGGETLENUL megkeruli. Indok: $($rule.why)"
            }
        }

        if (($noLogin -contains $name) -and $role.rolcanlogin) {
            # Ez a routine-owner minta szíve: a BYPASSRLS csak azért
            # elfogadható, mert a szerep nem tud bejelentkezni, tehát a
            # jogosultság kizárólag a nevesített SECURITY DEFINER függvények
            # futása alatt hat. LOGIN-nal ez a korlát eltűnik, és a szerep
            # egy szabad BYPASSRLS-belépővé válik.
            $findings += @{
                kind   = 'routine-owner-can-login'
                role   = $name
                detail = "A routine-owner szerep LOGIN-t kapott. A BYPASSRLS csak NOLOGIN mellett volt elfogadhato -- igy szabad bypass-belepove valt."
            }
        }
    }

    foreach ($rule in $Policy.roles) {
        if ($rule.mustExist -and -not $seen[$rule.name]) {
            # Egy eltűnt szerep lehet átnevezés is — és egy átnevezett szerep
            # mellett a régi nevű kapu-sor csendben semmit nem őriz.
            $findings += @{
                kind   = 'missing-role'
                role   = $rule.name
                detail = "A policy szerint letezni kell, de a pg_roles-ban nincs. Atnevezes? Egy atnevezett szerep mellett a kapu erre a nevre csendben semmit nem oriz."
            }
        }
    }

    return @{ ok = ($findings.Count -eq 0); findings = $findings }
}

# ---------------------------------------------------------------------------
# I/O
# ---------------------------------------------------------------------------

function Get-DbRolePrivilegeSnapshot {
    param(
        [Parameter(Mandatory)] [string] $Database,
        [string] $VpsAlias,
        [int] $Port = 5433,
        [switch] $Local
    )

    # A `pg_*` katalógus-szerepek nem alanyai ennek a kapunak.
    #
    # A szerepek PostgreSQL-ben CLUSTER-GLOBÁLISAK, nem adatbázis-szintűek —
    # tehát a `-Database` csak a csatlakozáshoz kell, az eredményt nem
    # befolyásolja. Ezt kiírom, mert különben jogos a kérdés, hogy miért a
    # `postgres` adatbázist kérdezzük, amikor az adat a `spaceos_*`-ban van.
    # (Az első próbám `-Database spaceos` volt — olyan adatbázis nem is létezik
    # ezen a clusteren; a mérés mégis működött volna bármelyik létezővel.)
    #
    # A SQL a psql STDIN-jére megy, NEM `-c`-vel: az első változatom `-c`-t
    # használt, és a PowerShell → ssh → bash → psql láncon az idézőjelek
    # elvesztek, a psql pedig a lekérdezést argumentumokra szedte
    # (`extra command-line argument "rolsuper," ignored`). A repóban már bevált
    # minta a stdin-en átadott szkript (ld. Invoke-VpsHealthSmoke.ps1).
    $remote = @"
sudo -u postgres psql -p $Port -d $Database -At -F'|' <<'SQL'
SELECT rolname, rolsuper, rolbypassrls, rolcanlogin
FROM pg_roles
WHERE rolname NOT LIKE 'pg\_%'
ORDER BY rolname;
SQL
"@

    $tempScript = Join-Path ([System.IO.Path]::GetTempPath()) ("role-guard-{0}.sh" -f [guid]::NewGuid())
    # LF sorvegek: a remote bash CRLF-en elhasal.
    [System.IO.File]::WriteAllText($tempScript, ($remote -replace "`r`n", "`n"), (New-Object System.Text.UTF8Encoding($false)))

    try {
        if ($Local) {
            $raw = & bash "$tempScript" 2>&1
        } else {
            if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
                throw 'ssh nem talalhato a PATH-on -- hasznald a -Local vagy a -SelfTest kapcsolot.'
            }
            $raw = & cmd /c "ssh $VpsAlias ""bash -s"" < ""$tempScript""" 2>&1
        }
    } finally {
        Remove-Item -LiteralPath $tempScript -ErrorAction SilentlyContinue
    }

    if ($LASTEXITCODE -ne 0) {
        throw "A pg_roles lekerdezes nem futott le (exit $LASTEXITCODE): $raw"
    }

    $roles = @()
    foreach ($line in @($raw)) {
        $parts = ([string]$line).Trim() -split '\|'
        if ($parts.Count -lt 4) { continue }
        $roles += @{
            name         = $parts[0]
            rolsuper     = ($parts[1] -eq 't')
            rolbypassrls = ($parts[2] -eq 't')
            rolcanlogin  = ($parts[3] -eq 't')
        }
    }
    return $roles
}

# ---------------------------------------------------------------------------
# ÖNTESZT — a kapu bizonyítsa, hogy harap, ÉS hogy nem vaklárma.
# ---------------------------------------------------------------------------

function Invoke-DbRolePrivilegeSelfTest {
    param([Parameter(Mandatory)] [object] $Policy)

    if (-not $Policy._selftest) { throw 'A policy-ban nincs `_selftest` korpusz -- a kapu nem bizonyithato.' }

    $failures = 0

    foreach ($case in @($Policy._selftest.mustFail)) {
        $v = Get-DbRolePrivilegeVerdict -Roles @($case) -Policy $Policy
        if ($v.ok) {
            Write-Host ("  [FAIL] a kapu ATENGEDTE, pedig bukniA kellett volna: {0}" -f $case.name)
            $failures++
        } else {
            # A talalat-fajtakat KIIRJUK, nem csak azt, hogy bukott: kulonben nem
            # latszik, hogy a kapu a HELYES okbol fogott-e meg. Egy `missing-role`
            # miatt bukó eset ugyanolyan "PASS" lenne, pedig nem azt merjuk.
            $kinds = (@($v.findings | Where-Object { $_.role -eq $case.name } | ForEach-Object { $_.kind }) -join ',')
            if (-not $kinds) {
                Write-Host ("  [FAIL] bukott, de NEM a vizsgalt szerep miatt: {0}" -f $case.name)
                $failures++
            } else {
                Write-Host ("  [PASS] harap: {0} -> {1}" -f $case.name, $kinds)
            }
        }
    }

    foreach ($case in @($Policy._selftest.mustPass)) {
        # A mustPass eseteknel a `missing-role` talalatokat figyelmen kivul
        # hagyjuk: egyetlen szerepet adunk at, tehat a tobbi `mustExist` szerep
        # definicio szerint hianyzik. A kerdes az, hogy MAGARA a szerepre van-e
        # talalat.
        $v = Get-DbRolePrivilegeVerdict -Roles @($case) -Policy $Policy
        $own = @($v.findings | Where-Object { $_.role -eq $case.name })
        if ($own.Count -gt 0) {
            Write-Host ("  [FAIL] VAKLARMA: {0} -> {1}" -f $case.name, (($own | ForEach-Object { $_.kind }) -join ','))
            $failures++
        } else {
            Write-Host ("  [PASS] nem vaklarma: {0}" -f $case.name)
        }
    }

    return $failures
}

# ---------------------------------------------------------------------------
# Belépő
# ---------------------------------------------------------------------------

function Invoke-DbRolePrivilegeGuard {
    param(
        [Parameter(Mandatory)] [string] $PolicyPath,
        [string] $VpsAlias,
        [string] $Database,
        [int] $Port = 5433,
        [switch] $Local,
        [switch] $SelfTest
    )

    if (-not (Test-Path $PolicyPath)) { throw "A policy-fajl nem talalhato: $PolicyPath" }
    # -Encoding UTF8 KELL: a Windows PowerShell 5.1 alapbol ANSI-kent olvas, es a
    # policy magyar indoklasai igy mojibake-kent kerultek a kimenetbe. Egy kapu,
    # aminek az indoklasa olvashatatlan, nem tudja elmondani, MIERT bukott.
    $policy = Get-Content -Raw -Encoding UTF8 -Path $PolicyPath | ConvertFrom-Json

    if ($SelfTest) {
        Write-Host 'Szerep-jogosultsag kapu -- ONTESZT (adatbazis nelkul)'
        $failures = Invoke-DbRolePrivilegeSelfTest -Policy $policy
        if ($failures -gt 0) {
            Write-Host ""
            Write-Host ("ONTESZT BUKOTT: {0} eset. A kapu NEM hasznalhato, amig ez piros." -f $failures)
            return 1
        }
        Write-Host ''
        Write-Host 'ONTESZT: minden PASS -- a kapu harap es nem vaklarma.'
        return 0
    }

    $roles = Get-DbRolePrivilegeSnapshot -Database $Database -VpsAlias $VpsAlias -Port $Port -Local:$Local
    if (@($roles).Count -eq 0) {
        # Nulla szerep nem "zold": vagy a lekerdezes nem futott le, vagy nem a
        # jo adatbazishoz mentunk. Egy ures szamlalon zold kapu a legrosszabb.
        Write-Host 'HIBA: nulla szerep jott vissza a pg_roles-bol. Ez nem zold eredmeny -- a meres nem futott le.'
        return 2
    }

    Write-Host ("Szerep-jogosultsag kapu -- {0} szerep megmerve ({1})" -f @($roles).Count, $Database)
    $verdict = Get-DbRolePrivilegeVerdict -Roles $roles -Policy $policy

    if ($verdict.ok) {
        Write-Host 'TISZTA: minden szerep a vart jogosultsagokkal fut.'
        return 0
    }

    Write-Host ''
    Write-Host ("{0} LELET:" -f $verdict.findings.Count)
    foreach ($f in $verdict.findings) {
        Write-Host ("  [{0}] {1}" -f $f.kind, $f.role)
        Write-Host ("      {0}" -f $f.detail)
    }
    Write-Host ''
    Write-Host 'A javitas NEM az, hogy a policy-t igazitjuk a valosaghoz -- eloszor el kell donteni, hogy a valosag jo-e.'
    return 1
}

# Dot-source eseten (Pester) nem futunk le.
if ($MyInvocation.InvocationName -ne '.') {
    exit (Invoke-DbRolePrivilegeGuard -PolicyPath $PolicyPath -VpsAlias $VpsAlias -Database $Database -Port $Port -Local:$Local -SelfTest:$SelfTest)
}
