# Releasing Hearsay

The fork publishes Windows releases through GitHub Actions so the installer is built from the exact merged commit and attached to the GitHub Release automatically.

## 1. Bump the version

Update the version number in all three files and keep them in sync:

- `src/hearsay/__init__.py` — `__version__`
- `src/hearsay/constants.py` — `APP_VERSION`
- `installer.iss` — `AppVersion`

Do **not** change `AppId` in `installer.iss`. It is the permanent Windows product identity used for upgrades and Add/Remove Programs.

## 2. Add release notes

Create:

```text
release-notes/vX.Y.Z.md
```

The release workflow uses this file verbatim as the GitHub Release notes.

## 3. Merge through `dev`

Open a PR to `dev` and require the normal Windows CI gate:

- Ruff lint
- Ruff format check
- pytest on Python 3.11 and 3.14
- frozen-app diagnostics smoke
- Inno Setup installer build

The CI package job also preserves `HearsaySetup.exe` as a downloadable Actions artifact.

## 4. Publish the release

After the release PR is merged, create a branch from the merged `dev` commit named exactly:

```text
release/vX.Y.Z
```

The `.github/workflows/release.yml` `create` workflow then:

1. Validates the branch version against all three application/installer version sources.
2. Requires `release-notes/vX.Y.Z.md`.
3. Builds the PyInstaller application on Windows.
4. Runs the frozen diagnostics smoke test.
5. Builds `installer_output\HearsaySetup.exe` with Inno Setup.
6. Creates GitHub Release `vX.Y.Z` from that exact commit.
7. Attaches `HearsaySetup.exe` to the release.
8. Preserves the installer as a 30-day Actions artifact as a fallback.

No local GitHub CLI or local release build is required for the normal release path.

## 5. Verify

Confirm:

1. The release appears at `https://github.com/behindthedash/hearsay/releases`.
2. `HearsaySetup.exe` is listed as a downloadable release asset.
3. The release tag matches the three version sources.
4. Installing the new build upgrades the existing Hearsay installation rather than creating a second product entry.

## Local/manual fallback

If GitHub Actions is unavailable, the legacy local process still works:

```bash
pyinstaller --noconfirm Hearsay.spec
"C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer.iss

gh release create vX.Y.Z installer_output/HearsaySetup.exe \
  --target dev --title "Hearsay vX.Y.Z" --notes-file release-notes/vX.Y.Z.md
```

Run `git fetch --tags` afterward if local tags are needed.
