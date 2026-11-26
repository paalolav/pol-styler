# Security hardening — November 26, 2026

## Brief

- **Task:** Harden stylesheet configuration and update the supported SPFx toolchain, recording security scan coverage and remaining findings.
- **Authorization:** User requested a security scan, source hardening, latest Microsoft SPFx guidance, and this task list.
- **Guardrails:** No commits, pushes, merges, deployment, messages, credential access, or source uploads. Use the metadata-only scan wrapper. Preserve solution IDs and the documented tenant-relative CSS path.
- **Scope:** Application customizer, regression tests, dependency/build configuration, README and audit evidence. No tenant changes.
- **Done when:** `npm test` verifies accepted same-origin HTTPS stylesheets and rejected unsafe/malformed inputs; `npm run build` produces the production package; `scan-repo --json .` and `npm audit --json` have recorded exit statuses and triaged results. Missing checks remain explicitly open.
- **Sources:** Current code and deployment XML; Microsoft SPFx 1.24.1 release notes and compatibility reference; local audit tool catalogue and scan runbook.
- **Baseline:** Clean checkout at `80d028e61a7510e3d1d8e74ab4bbb445d9f1c7c6`; SPFx 1.22.2; `.nvmrc` 16.20; no pre-existing task list or tests.
- **Execution:** Medium scope, local implementation without delegation. Write and run regression checks before changing source; keep their assertions fixed through implementation.
- **Assumption:** External stylesheet hosts are not required by the documented configuration. Restrict initial CSS URLs to the current HTTPS origin; CSS content and redirects still require trusted administration.

## Tasks

- [x] Inspect code, deployment configuration, and Microsoft November 2026 documentation.
- [x] Record baseline security sweep and npm dependency audit.
- [x] Add regression tests and harden stylesheet loading.
- [x] Upgrade SPFx and align toolchain with official generator configuration.
- [x] Run regression tests, production build, and final security checks.
- [x] Document results, residual risks, and tenant smoke-test steps.

## References

- https://learn.microsoft.com/en-us/sharepoint/dev/spfx/release-1.24.1
- https://learn.microsoft.com/en-us/sharepoint/dev/spfx/compatibility

## Changes and evidence

The loader now validates configuration before calling `SPComponentLoader.loadCss`.
It accepts only HTTPS URLs on the current origin, rejects credentials and ambiguous
control/backslash inputs, and handles malformed/non-string values without throwing.
Relative paths still resolve from the tenant root. Logs never include rejected URLs.
This is defense in depth for administrator-controlled configuration, not a confirmed
unauthenticated injection vulnerability. External-CDN configurations must migrate.

All SPFx dependencies are aligned to 1.24.1. The npm generator tarball's
`lib/common/dependencies.json` and Heft templates were compared directly: Heft 1.3.2,
ESLint 9.37.0 flat configuration, TypeScript 5.8, and the generator's `qs`,
`serialize-javascript`, and `uuid` overrides are used. Removed unused direct
dependencies and the obsolete Rush compiler; declared the directly imported
`@microsoft/sp-loader`. Fixed extension localization copying. Updated `.nvmrc`,
generator metadata, and README build instructions. Solution/component IDs and
deployment versions are unchanged; release versioning remains a deployment task.

Dependabot version updates now wait seven days. This gives new releases time to
settle and satisfies the scanner's cooldown policy; security updates are exempt.
GitHub already defaults to three days, so the initial missing-cooldown warning
was a policy recommendation, not proof of an exploitable vulnerability.
[GitHub documentation](https://docs.github.com/en/code-security/tutorials/secure-your-dependencies/optimizing-pr-creation-version-updates).

### Local checks

Environment: macOS arm64, Node 26.13.1, npm 11.20.0. Commands using npm supplied
`--cache /tmp/pol-styler-npm-cache` because the default home cache was not writable.
Final worktree identifiers (SHA-256):

- `package-lock.json`: `908e8320af04e7ae8bb343958204c9e5b3dc077da3fef79ebb40d0fac81e0b43`
- `PolStylerApplicationCustomizer.ts`: `992a91c6c4f6ece06e6943f9002720219f8c9baa812f031d2222daf51e54228b`
- `tests/security.test.cjs`: `b7546e4ab2e8bb8648d6ff2841614908a64d3e57dfb1c9eb3ae41c29d3d5b06f`

| Check | Baseline | Final |
| --- | --- | --- |
| `node --test tests/security.test.cjs` / `npm test` | 6 passed, 17 failed | 23 passed |
| `npm ci --no-audit --no-fund` | Not run | Exit 0; clean lockfile installation |
| `npm run build` | Not run | Production build and package succeeded; repeated after clean install |
| `npm ls --depth=0` | Not run | Exit 0, aligned SPFx 1.24.1 dependencies |
| `npm audit --json` | Exit 1; 91 affected package entries, 111 distinct advisories | Exit 1; 23 moderate entries, 2 distinct advisories; zero high/critical |
| `npm audit --omit=dev --json` | Not run | Exit 0; zero vulnerabilities |
| `scan-repo --json .` | Exit 1; 14 findings: 8 high, 4 medium, 2 low | Exit 1; one high Dart version finding (applicability assessed below); zero SAST/secret findings |

Tests exercise the actual customizer's `onInit` with mocked SPFx services, checking
calls to the stylesheet loader. They do not simulate SharePoint or browser network
behavior. The first build caught an intentional control-character regex; a local
`no-control-regex` exception documents why the security check requires it.
`npm ci` warns that optional `fsevents` install scripts were not approved; watch
mode was not tested. Production compilation and packaging do not require it.
The generated `sharepoint/solution/pol-styler.sppkg` ZIP was inspected and contains
both the customizer bundle and its English localization asset. `git diff --check`
passed. Checks ran against the uncommitted worktree above, not a deployed revision.

Scanner versions: Opengrep 1.33.1, Gitleaks 8.30.1, TruffleHog 3.100.1,
Syft 1.57.2, Grype 0.122.1. Checkov 3.3.29 and Hadolint 2.15.1 are installed;
their empty arrays do not establish applicable IaC/container coverage because
this project has no such manifests. C# is explicitly not scanned (not applicable).
The wrapper returned metadata-only schema v2, with no SAST parser warnings,
no Gitleaks findings and zero verified TruffleHog findings in history/worktree.
No raw secret reports were read. No Sonar upload, cloud-model fallback, tenant
access, deployment, or live CI verification was performed.

### Residual dependency triage

1. **Moderate — glob:** `glob@10.5.0`, pulled by the Heft/Jest build toolchain,
   remains affected by [GHSA-3g3m-2fjr-6pw4 / CVE-2026-118773](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4).
   The advisory concerns cancellation of filesystem traversal; fixed in 14.0.2.
2. **Moderate — minimatch:** versions 9.0.9, 10.2.3 and 10.2.6 in build dependencies
   remain affected by [GHSA-g3hv-75wg-m249 / CVE-2026-118764](https://github.com/advisories/GHSA-g3hv-75wg-m249).
   The advisory concerns resource exhaustion from crafted patterns; fixed in 11.0.1.
   These two advisories account for all 23 npm entries through dependent packages.
   No application import or remote-input path to these build utilities was found.
   Fixes cross major-version constraints; npm's suggested SPFx downgrade was not
   applied. Build trusted checkouts in isolated environments and track upstream
   SPFx/Rush/Jest updates rather than treating a forced override as supported.
3. **Grype high — bundled Dart:** `sass-embedded@1.85.1` includes a Dart 3.7.0 runtime
   flagged as [CVE-2026-27704](https://github.com/dart-lang/sdk/security/advisories/GHSA-q739-79rh-vmvp).
   The vendor advisory affects `dart pub` / `flutter pub` archive extraction.
   This repository uses npm and the embedded Sass compiler, not Pub. Assessed as
   not applicable to the current build path; retained visibly rather than suppressed.
   Reassess if Dart package-management workflows are introduced.

### Remaining actions before release

- [ ] Review the two build-tool advisories and adopt compatible upstream fixes when available.
- [ ] In a test tenant, verify `/sites/cdn/Styling/PolStyler.css` loads on initial render and navigation; verify an external URL causes no stylesheet request and no initialization failure.
- [ ] Review custom-action/library edit permissions, CSS imports/resources, redirects, and any existing external-CDN configuration; the loader validates only the initial URL.
- [ ] Set release/package versions and obtain deployment approval before uploading the generated `.sppkg`.

**Verdict: REVIEW** — local hardening and build checks pass; residual build-tool
advisories and tenant validation remain. No claim of a vulnerability-free project.
