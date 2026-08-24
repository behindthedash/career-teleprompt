param(
    [Parameter(Mandatory = $true)]
    [string]$InstallerPath,

    [string]$DisplayName = "Career Teleprompt",

    [int]$StartupSeconds = 8
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$InstallerPath = (Resolve-Path $InstallerPath).Path

function Get-AppUninstallEntry {
    param([string]$Name)

    $registryRoots = @(
        "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*",
        "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*",
        "HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*"
    )

    foreach ($root in $registryRoots) {
        $match = Get-ItemProperty $root -ErrorAction SilentlyContinue |
            Where-Object { $_.DisplayName -eq $Name -or $_.DisplayName -like "$Name *" } |
            Select-Object -First 1
        if ($match) {
            return $match
        }
    }

    return $null
}

function Wait-Until {
    param(
        [Parameter(Mandatory = $true)]
        [scriptblock]$Condition,
        [int]$TimeoutSeconds = 30,
        [string]$FailureMessage = "Condition was not met before timeout"
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        if (& $Condition) {
            return
        }
        Start-Sleep -Milliseconds 500
    } while ((Get-Date) -lt $deadline)

    throw $FailureMessage
}

function Get-ExecutableFromDisplayIcon {
    param([object]$Entry)

    if (-not $Entry.DisplayIcon) {
        return $null
    }

    $icon = [string]$Entry.DisplayIcon
    if ($icon -match '^\s*"([^"]+\.exe)"') {
        return $Matches[1]
    }
    if ($icon -match '^\s*([^,]+\.exe)') {
        return $Matches[1].Trim().Trim('"')
    }

    return $null
}

function Get-UninstallerPath {
    param(
        [object]$Entry,
        [string]$InstallDirectory
    )

    if ($InstallDirectory) {
        $candidate = Join-Path $InstallDirectory "uninstall.exe"
        if (Test-Path $candidate) {
            return $candidate
        }
    }

    if ($Entry.UninstallString) {
        $command = [string]$Entry.UninstallString
        if ($command -match '^\s*"([^"]+\.exe)"') {
            return $Matches[1]
        }
        if ($command -match '^\s*([^\s]+\.exe)') {
            return $Matches[1].Trim('"')
        }
    }

    return $null
}

Write-Host "Installing $DisplayName from $InstallerPath"
$installProcess = Start-Process -FilePath $InstallerPath -ArgumentList "/S" -Wait -PassThru
if ($installProcess.ExitCode -ne 0) {
    throw "Silent installer failed with exit code $($installProcess.ExitCode)"
}

$entry = $null
Wait-Until -TimeoutSeconds 30 -FailureMessage "$DisplayName uninstall registration was not created" -Condition {
    $script:entry = Get-AppUninstallEntry -Name $DisplayName
    return $null -ne $script:entry
}

$installDirectory = ""
if ($entry.InstallLocation -and (Test-Path ([string]$entry.InstallLocation))) {
    $installDirectory = (Resolve-Path ([string]$entry.InstallLocation)).Path
}

$appExecutable = Get-ExecutableFromDisplayIcon -Entry $entry
if (-not $appExecutable -or -not (Test-Path $appExecutable)) {
    if (-not $installDirectory -and $entry.UninstallString) {
        $uninstaller = Get-UninstallerPath -Entry $entry -InstallDirectory ""
        if ($uninstaller -and (Test-Path $uninstaller)) {
            $installDirectory = Split-Path $uninstaller -Parent
        }
    }

    if ($installDirectory) {
        $appExecutable = Get-ChildItem -Path $installDirectory -Filter "*.exe" -File -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -notmatch '^(uninstall|unins|.*setup).*\.exe$' } |
            Select-Object -First 1 -ExpandProperty FullName
    }
}

if (-not $appExecutable -or -not (Test-Path $appExecutable)) {
    throw "Could not locate the installed application executable"
}

if (-not $installDirectory) {
    $installDirectory = Split-Path $appExecutable -Parent
}

Write-Host "Installed application: $appExecutable"
Write-Host "Install directory: $installDirectory"

$appProcess = Start-Process -FilePath $appExecutable -PassThru
try {
    Start-Sleep -Seconds $StartupSeconds
    $appProcess.Refresh()
    if ($appProcess.HasExited) {
        throw "$DisplayName exited during the $StartupSeconds-second startup smoke with exit code $($appProcess.ExitCode)"
    }
    Write-Host "$DisplayName remained running for $StartupSeconds seconds"
}
finally {
    if (-not $appProcess.HasExited) {
        Stop-Process -Id $appProcess.Id -Force -ErrorAction SilentlyContinue
        $appProcess.WaitForExit(5000) | Out-Null
    }
}

$uninstallerPath = Get-UninstallerPath -Entry $entry -InstallDirectory $installDirectory
if (-not $uninstallerPath -or -not (Test-Path $uninstallerPath)) {
    throw "Could not locate the installed application uninstaller"
}

Write-Host "Uninstalling with $uninstallerPath"
$uninstallProcess = Start-Process -FilePath $uninstallerPath -ArgumentList "/S" -Wait -PassThru
if ($uninstallProcess.ExitCode -ne 0) {
    throw "Silent uninstaller failed with exit code $($uninstallProcess.ExitCode)"
}

Wait-Until -TimeoutSeconds 30 -FailureMessage "$DisplayName uninstall registration still exists after uninstall" -Condition {
    return $null -eq (Get-AppUninstallEntry -Name $DisplayName)
}

Wait-Until -TimeoutSeconds 30 -FailureMessage "Installed executable still exists after uninstall: $appExecutable" -Condition {
    return -not (Test-Path $appExecutable)
}

Write-Host "Windows installer lifecycle smoke passed: install -> launch -> uninstall"
