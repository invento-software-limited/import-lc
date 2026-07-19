# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Created complete Docsify documentation site under `docs/` with sidebar navigation, product overview, and user guide.
- Revamped root `README.md` to include detailed screenshots, installation, and deployment guidelines.

### Changed
- Updated CI action triggers in `.github/workflows/ci.yml` to run checks on `version-16` and `develop` branches.

---

## [1.0.1] - 2026-06-10

### Added
- **Permissions & Security Configuration:**
  - Created the new `Import LC Manager` Role Profile containing managerial and core transactional roles.
  - Implemented the permission and profile setup script (`import_lc/setup_permissions.py`) to automate roles configuration.
  - Granted full operational permissions (read, write, create, delete, submit, cancel, amend) for `Payment Entry` to both `Import LC User` and `Import LC Manager` roles.
  - Added an `after_migrate` hook to automate the execution of permissions and role profile setups during migrations.

### Fixed
- **UI & Workspace Sidebar:**
  - Resolved client-side workspace sidebar crash (`TypeError: can't access property "Import LC Workspace", o is null`) by removing the broken/deleted workspace navigation item from the sidebar fixture `import_lc.json`.
  - Resolved `bench export-fixtures` crash caused by unsupported `==` operator in `Property Setter` filters by switching it to standard `=` in `hooks.py`.
  - Lowered minimum Python requirements from `py314` / `>=3.14` to `py310` / `>=3.10` in `pyproject.toml` to support current environments.

---

## [1.0.0] - 2026-05-18

### Added
- **Features / Workspaces:**
  - New modular workspace configuration and charts dashboard for the Import LC module.
  - Core DocTypes and schema configurations for `Purchase Invoice` and `Landed Cost Voucher` to track and apportion import-specific expenses.
  - Linked financial processes, including data fetching from standard `Import LC` to `Landed Cost Voucher`.

### Fixed
- **Integrations & Operations:**
  - Standardized automated flow of mapping data during `Purchase Invoice` creation.

### Changed
- **Chores & Housekeeping:**
  - Excluded freight charges from total base amount calculations to prevent dual calculation.
  - Dynamic desk layout and workspace icons updated for Import LC module.
  - Pre-commit configurations initialized with standard python linter (`ruff`) and javascript formatters (`eslint`, `prettier`).
