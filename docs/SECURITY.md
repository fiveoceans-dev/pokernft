# Dependency Security Policy

We balance safety with installability by pinning known risk-prone transitive packages to vetted versions and hardening Yarn settings.

## Yarn Settings (enforced)
- `checksumBehavior: throw` — rejects tarballs with missing/invalid checksums.
- `enableScripts: false` — disables all lifecycle scripts (e.g., postinstall) by default.

If a package requires scripts, enable case-by-case using `YARN_ENABLE_SCRIPTS=1` in CI or via a scoped configuration.

## Resolutions (pinned safe versions)
We pin commonly exploited terminal/ANSI utilities to versions present in the current lockfile:

- `ansi-regex@^5.0.1` → `5.0.1`; `ansi-regex@^6.0.1` → `6.2.2`
- `ansi-styles@^4.0.0` → `4.3.0`; `ansi-styles@^6.1.0` → `6.2.3`
- `strip-ansi@^6.0.0` → `6.0.1`; `strip-ansi@^7.0.1` → `7.1.2`
- `wrap-ansi@^8.1.0` → `8.1.0`
- `supports-color@^7.0.0` → `7.2.0`; `supports-color@^8.0.0` → `8.1.1`
- `color-convert@^2.0.1` → `2.0.1`; `color-name@~1.1.4` → `1.1.4`; `color-string@^1.9.0` → `1.9.1`
- `is-arrayish@^0.3.1` → `0.3.2`
- `debug@4`, `debug@^4.x` → `4.4.1`

These are non-breaking for the current workspace because they match entries already in `yarn.lock`.

## Optional: Yarn Constraints (advanced)
To strictly forbid additions of risky packages at the workspace level, import Yarn's constraints plugin and define rules in `constraints.pro`.

- Import once locally: `yarn plugin import constraints`
- Then run checks in CI: `yarn constraints`

Example rules to add (pseudocode):
- Forbid direct workspace dependency on `@yarnpkg/lockfile`.
- Enforce specific ranges for `ansi-regex`, `strip-ansi`, etc., if they are ever added as direct deps.

Note: Constraints operate on workspace dependencies, not transitives. Transitive enforcement is handled via `resolutions` above.

## Audit
- Run `yarn npm audit` during CI to surface known CVEs.
- Optionally integrate Snyk/OSV scanners for a second signal.

## Rationale
- Avoid aliasing packages to unrelated artifacts (which breaks installs) while still preventing vulnerable/malicious ranges from sneaking in.
- Pinned resolutions + checksums + disabled scripts provide defense-in-depth without compromising developer ergonomics.

