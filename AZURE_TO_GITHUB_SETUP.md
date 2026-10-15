# Azure DevOps → GitHub upload pipeline (SELECT CUTZ)

Pipeline file: `azure-pipelines-github-publish.yml`
It builds the app, then pushes the code to a GitHub repo (and optionally attaches the APK to a GitHub Release).

Your repo currently points to `https://github.com/ST10445334/SelectCutzApp`, so that is the default target.

## Step 1 - Put the file in the repo
Copy `azure-pipelines-github-publish.yml` into the **root** of the project (next to `package.json` and the existing `azure-pipelines.yml`), then commit and push it to the repo Azure DevOps will read from (Azure Repos, or GitHub).

> Keep the existing `azure-pipelines.yml`. This is a second, separate pipeline.

## Step 2 - Create a GitHub token (PAT)
1. GitHub → profile picture → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. Repository access: **Only select repositories** → `SelectCutzApp`.
3. Permissions: **Contents: Read and write** (add **Metadata: Read** if asked).
4. Copy the token. You only see it once.

(A classic token with the `repo` scope also works.)

## Step 3 - Create the pipeline in Azure DevOps
1. dev.azure.com → your project → **Pipelines → New pipeline**.
2. Pick where the code lives (Azure Repos Git or GitHub) → pick the repo.
3. **Existing Azure Pipelines YAML file** → path `/azure-pipelines-github-publish.yml` → **Continue**.
4. Click **Variables** (top right) → **New variable**:
   * Name: `GITHUB_PAT`
   * Value: the token from Step 2
   * Tick **Keep this value secret** → OK → **Save**.
5. Optional variable `API_BASE_URL` = `https://YOUR-DOMAIN/api` (so the APK talks to your hosted API).
6. **Save** (don't need to run yet). Rename the pipeline to something clear, e.g. `SelectCutz → GitHub`.

## Step 4 - Run it
**Run pipeline** and fill in the options:

| Option | Meaning |
|---|---|
| GitHub repo | `owner/name` to upload to |
| Branch | branch on GitHub to push to (default `main`) |
| Force push | leave **off** unless GitHub has history Azure doesn't and you want to overwrite it |
| Also build the debug APK | builds `app-debug.apk` as a pipeline artifact |
| Attach APK to a GitHub Release | also uploads the APK to GitHub (needs Step 5) |

Stages: **Build** (lint, tests, web build, APK) → **Push code to GitHub** → **GitHub Release** (optional).

## Step 5 - Only if you want the APK uploaded to GitHub Releases
1. Project Settings → **Service connections → New service connection → GitHub**.
2. Authenticate (OAuth or PAT), name it `github-selectcutz` (or change the `githubConnection` parameter to match).
3. First run: Azure asks you to **Permit** the pipeline to use it.
4. Run with **Attach the APK to a GitHub Release** ticked. The APK appears under the repo's **Releases**.

## Troubleshooting
* **"GITHUB_PAT is not set"** - Step 3.4 missed, or the variable isn't marked for this pipeline.
* **403 / "Permission denied"** - token lacks *Contents: write*, or isn't scoped to this repo.
* **"rejected - non-fast-forward"** - GitHub has commits Azure doesn't. Pull/merge them first, or (if you're sure) re-run with *Force push*.
* **Pushing GitHub → GitHub** - if the pipeline's source repo *is* the same GitHub repo, the push does nothing useful. It's meant for Azure Repos → GitHub, or one GitHub repo → another.
* **Build stage fails on `npm run lint` / tests** - the push is skipped on purpose. Fix the failure, or to push regardless, tell me and I'll make the build non-blocking.
* **Never** paste the token into the YAML file or commit it. It lives only in the secret variable.
