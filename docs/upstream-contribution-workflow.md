# Upstream Synchronization and Contribution Workflow

The fork tracks the public upstream repository `parkscloud/Hearsay` (`master`) while keeping fork-only OpenSpec/worktrail metadata and downstream Interview Copilot behavior out of upstream contributions.

## 1. Preview and apply an upstream sync

From a clean clone of this fork, configure the canonical remote once and preview divergence:

```bash
python scripts/sync_upstream.py --configure-remote
```

The helper adds `upstream` only when it is missing, verifies that an existing remote already points to `https://github.com/parkscloud/Hearsay.git`, fetches upstream, and prints the fork-only/upstream-only commit counts. Preview mode does not modify branch history.

After reviewing the divergence, switch to `dev`, make sure the worktree is clean, and apply the merge:

```bash
python scripts/sync_upstream.py --apply
```

The apply path uses `git merge --no-ff --no-edit upstream/master`. It never pushes, force-pushes, resets, or rebases. If Git reports conflicts, resolve them explicitly, run the normal quality gates, and commit the merge resolution. Do not use history rewriting to hide conflicts on shared fork branches.

## 2. Prepare a narrow upstream candidate

Do not open an upstream PR directly from `dev`. `dev` contains fork-only history and repository policy/specification files that upstream does not need.

Instead:

```bash
git fetch upstream master
git switch -c upstream/<short-change-name> upstream/master
```

Cherry-pick only the generic implementation/test/documentation commits that belong in the upstream patch:

```bash
git cherry-pick <generic-commit-sha> [...]
```

If the fork commit mixes generic and fork-only material, first make a clean generic commit on a local preparation branch rather than cherry-picking unrelated files into the upstream candidate.

## 3. Run the automated candidate guard

With the candidate branch checked out:

```bash
python scripts/check_upstream_candidate.py --base upstream/master --head HEAD
```

For structured output add `--json`. The guard rejects known fork-only paths (`openspec/`, `.worktrail/`, fork rulesets), downstream/private path markers, transcript artifacts, direct imports of downstream retrieval/database/LLM packages, and credential-like added lines.

A passing guard is necessary but not sufficient. It cannot understand every semantic privacy or product-boundary mistake.

## 4. Mandatory human review

Before opening an upstream PR, review the complete candidate diff and confirm:

- the change is useful to ordinary Hearsay without Interview Copilot;
- no personal, employer, customer, interview, resume, or real transcript content is present;
- no credentials, machine-specific private paths, or local configuration are present;
- tests use synthetic data only;
- no FastEmbed, pgvector, psycopg, LLM SDK, or downstream consumer dependency was introduced;
- the patch is narrow enough to review independently;
- normal Hearsay recording behavior remains covered by existing regression tests.

Then run:

```bash
ruff check src tests scripts
ruff format --check src tests scripts
pytest -q
```

## 5. If upstream declines the patch

An upstream rejection does not require deleting or rewriting the fork change. Keep the generic change behind the fork's compatibility/public-host boundary, continue syncing through normal upstream fetch/merge operations, and reassess later if upstream architecture changes.
