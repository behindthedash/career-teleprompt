param(
    [Parameter(Mandatory = $true)]
    [string]$Branch,

    [switch]$EmitGitHubEnv
)

$ErrorActionPreference = "Stop"

if (-not $Branch.StartsWith("release/")) {
    throw "Release branch must start with release/; got $Branch"
}

$tag = $Branch.Substring("release/".Length)
if ($tag -notmatch '^v\d+\.\d+\.\d+$') {
    throw "Release branch must be named release/vX.Y.Z; got $Branch"
}
$version = $tag.Substring(1)

$init = Get-Content -Raw "src/hearsay/__init__.py"
$constants = Get-Content -Raw "src/hearsay/constants.py"

if ($init -notmatch '__version__\s*=\s*"([^"]+)"') {
    throw "Could not read __version__ from src/hearsay/__init__.py"
}
$initVersion = $Matches[1]

if ($constants -notmatch 'APP_VERSION\s*=\s*"([^"]+)"') {
    throw "Could not read APP_VERSION from src/hearsay/constants.py"
}
$appVersion = $Matches[1]

$installerLine = Get-Content "installer.iss" |
    Where-Object { $_ -match '^\s*AppVersion\s*=' } |
    Select-Object -First 1
if ([string]::IsNullOrWhiteSpace($installerLine)) {
    throw "Could not read AppVersion from installer.iss"
}
$installerParts = $installerLine -split '=', 2
if ($installerParts.Count -ne 2 -or [string]::IsNullOrWhiteSpace($installerParts[1])) {
    throw "Could not parse AppVersion from installer.iss"
}
$installerVersion = $installerParts[1].Trim()

foreach ($actual in @($initVersion, $appVersion, $installerVersion)) {
    if ($actual -ne $version) {
        throw "Version mismatch: release branch requests $version but found $actual"
    }
}

$notes = "release-notes/$tag.md"
if (-not (Test-Path $notes)) {
    throw "Missing release notes: $notes"
}

if ($EmitGitHubEnv) {
    if ([string]::IsNullOrWhiteSpace($env:GITHUB_ENV)) {
        throw "GITHUB_ENV is not available"
    }
    "RELEASE_TAG=$tag" | Out-File -FilePath $env:GITHUB_ENV -Append
    "RELEASE_VERSION=$version" | Out-File -FilePath $env:GITHUB_ENV -Append
    "RELEASE_NOTES=$notes" | Out-File -FilePath $env:GITHUB_ENV -Append
}

Write-Output "Release metadata valid for $tag"
