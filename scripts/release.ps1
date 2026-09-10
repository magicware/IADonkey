<#
.SYNOPSIS
    Automatizovaný release skript pro IADonkey.
    Zvýší verzi, zaktualizuje changelog/manifest, zkompiluje aplikaci a připraví release pro GitHub.

.EXAMPLE
    .\scripts\release.ps1 -Version 0.1.2
    .\scripts\release.ps1
#>

param(
    [string]$Version
)

$ErrorActionPreference = "Stop"

# 1. Zjištění aktuální verze z package.json
$pkgJsonPath = Join-Path $PSScriptRoot "..\package.json"
$pkg = Get-Content $pkgJsonPath -Raw | ConvertFrom-Json
$currentVer = $pkg.version

Write-Host "`n=== IADonkey Release Tool ===" -ForegroundColor Cyan
Write-Host "Aktuální verze: $currentVer" -ForegroundColor Yellow

if (-not $Version) {
    # Navrhnout další patch verzi (např. 0.1.1 -> 0.1.2)
    $parts = $currentVer.Split('.')
    if ($parts.Length -eq 3) {
        $nextPatch = "$($parts[0]).$($parts[1]).$([int]$parts[2] + 1)"
    } else {
        $nextPatch = "$currentVer.1"
    }

    $inputVer = Read-Host "Zadejte novou verzi pro release [$nextPatch]"
    if ([string]::IsNullOrWhiteSpace($inputVer)) {
        $Version = $nextPatch
    } else {
        $Version = $inputVer.Trim()
    }
}

Write-Host "`nPřipravuji release verze: $Version..." -ForegroundColor Green

# 2. Aktualizace package.json
$pkg.version = $Version
$pkg | ConvertTo-Json -Depth 10 | Set-Content $pkgJsonPath -Encoding utf8
Write-Host "✓ Aktualizován package.json na verzi $Version" -ForegroundColor Gray

# 3. Aktualizace src/changelog.ts
$changelogTsPath = Join-Path $PSScriptRoot "..\src\changelog.ts"
if (Test-Path $changelogTsPath) {
    $content = Get-Content $changelogTsPath -Raw -Encoding utf8
    $content = $content -replace "export const CURRENT_APP_VERSION = '.*?';", "export const CURRENT_APP_VERSION = '$Version';"
    Set-Content $changelogTsPath -Value $content -Encoding utf8
    Write-Host "✓ Aktualizován src/changelog.ts (CURRENT_APP_VERSION = '$Version')" -ForegroundColor Gray
}

# 4. Aktualizace kořenového version.json
$versionJsonPath = Join-Path $PSScriptRoot "..\version.json"
$manifest = @{
    version = $Version
    releaseNotes = "• Vydána nová verze $Version aplikace IADonkey.`n• Přehled všech změn naleznete v aplikaci v záložce Nastavení -> Kompletní changelog."
    downloadUrl = "https://github.com/magicware/IADonkey/releases/download/v$Version/IADonkey-$Version.exe"
}
$manifest | ConvertTo-Json -Depth 5 | Set-Content $versionJsonPath -Encoding utf8
Write-Host "✓ Aktualizován version.json pro kontrolu aktualizací na GitHubu" -ForegroundColor Gray

# 5. Sestavení aplikace (Compile + Electron-Builder)
Write-Host "`nSestavuji aplikaci (npm run compile && electron-builder)..." -ForegroundColor Cyan
Push-Location (Join-Path $PSScriptRoot "..")
try {
    npm run compile
    npx electron-builder --win portable
} finally {
    Pop-Location
}

$builtExe = Get-ChildItem -Path (Join-Path $PSScriptRoot "..\release") -Filter "*$Version*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $builtExe) {
    $builtExe = Get-ChildItem -Path (Join-Path $PSScriptRoot "..\release") -Filter "*.exe" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
}

if ($builtExe) {
    $builtExeName = $builtExe.Name
    $builtExePath = $builtExe.FullName
    Write-Host "`n✓ Spustitelný soubor úspěšně vytvořen:" -ForegroundColor Green
    Write-Host "  $builtExePath" -ForegroundColor White
} else {
    $builtExeName = "IADonkey-$Version.exe"
    $builtExePath = Join-Path $PSScriptRoot "..\release\$builtExeName"
    Write-Host "`nUpozornění: Soubor $builtExeName nebyl nalezen v release složce." -ForegroundColor Yellow
}

# 6. Git commit a tag
Write-Host "`n=== Git verzování ===" -ForegroundColor Cyan
$doGit = Read-Host "Chcete provést git commit a vytvořit tag v$Version? (A/n)"
if ($doGit -eq "" -or $doGit -eq "a" -or $doGit -eq "A" -or $doGit -eq "y" -or $doGit -eq "Y") {
    Push-Location (Join-Path $PSScriptRoot "..")
    try {
        git add package.json src/changelog.ts version.json CHANGELOG.md
        git commit -m "chore: Release v$Version"
        git tag -a "v$Version" -m "Release v$Version"
        Write-Host "✓ Git commit a tag v$Version vytvořeny." -ForegroundColor Green

        $doPush = Read-Host "Chcete odeslat změny do vzdáleného GitHub repozitáře (git push && git push --tags)? (A/n)"
        if ($doPush -eq "" -or $doPush -eq "a" -or $doPush -eq "A" -or $doPush -eq "y" -or $doPush -eq "Y") {
            git push origin main
            git push origin "v$Version"
            Write-Host "✓ Změny a tag odeslány na GitHub." -ForegroundColor Green
        }
    } catch {
        Write-Host "Chyba při práci s gitem: $_" -ForegroundColor Red
    } finally {
        Pop-Location
    }
}

# 7. GitHub Release přes gh cli (pokud je nainstalován a přihlášen)
$ghLoggedIn = $false
try {
    $null = gh auth status 2>&1
    if ($LASTEXITCODE -eq 0) {
        $ghLoggedIn = $true
    }
} catch {}

if ($ghLoggedIn -and (Test-Path $builtExePath)) {
    Write-Host "`n=== Publikace na GitHub Releases ===" -ForegroundColor Cyan
    $doGhRelease = Read-Host "Detekován přihlášený GitHub CLI. Chcete automaticky vytvořit Release v$Version a nahrát tam $builtExeName? (A/n)"
    if ($doGhRelease -eq "" -or $doGhRelease -eq "a" -or $doGhRelease -eq "A" -or $doGhRelease -eq "y" -or $doGhRelease -eq "Y") {
        Push-Location (Join-Path $PSScriptRoot "..")
        try {
            gh release create "v$Version" "$builtExePath" --title "v$Version" --notes "Release v$Version"
            Write-Host "✓ GitHub Release v$Version byl úspěšně publikován i se souborem $builtExeName!" -ForegroundColor Green
        } catch {
            Write-Host "Chyba při nahrávání na GitHub Release: $_" -ForegroundColor Red
        } finally {
            Pop-Location
        }
    }
} else {
    Write-Host "`n=== Další kroky ===" -ForegroundColor Green
    Write-Host "1. Pokud máte GitHub CLI, můžete se přihlásit příkazem 'gh auth login' a příště proběhne nahrání automaticky." -ForegroundColor Gray
    Write-Host "2. Nebo na webu GitHubu v sekci Releases vytvořte release pro tag 'v$Version'." -ForegroundColor White
    Write-Host "3. Přetáhněte do něj vygenerovaný soubor: $builtExePath" -ForegroundColor White
    Write-Host "4. Aplikace uživatelů při dalším spuštění automaticky detekuje novou verzi $Version přes version.json!`n" -ForegroundColor White
}
