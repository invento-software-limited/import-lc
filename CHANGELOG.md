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

### Fixed
- Data fetching logic in Landed Cost Voucher from Import LC to exclude the main Purchase Invoice and only include the Purchase Invoice linked via `import_insurance` (if exist).

---

## [1.0.0] - 2026-05-18

### Added
- **Features / Workspaces:**
  - New modular workspace configuration and charts dashboard.
  - Core DocTypes and schema configurations for `Purchase Invoice` and `Landed Cost Voucher` to track and apportion import-specific expenses.
  - Linked financial processes, including data fetching from standard `Import LC` to `Landed Cost Voucher`.
  - Integration with `Import Insurance` for automating premium and other landing charges computation.

### Fixed
- **Integrations & Operations:**
  - Standardized automated flow of mapping data during `Purchase Invoice` creation specifically from `Import Insurance`.
  - Configured conditional workflow for disabling key headers upon document submission inside `Import Insurance`.
  - Cleaned database representations and updated dashboard indicators on `Import Insurance` dashboards.

### Changed
- **Chores & Housekeeping:**
  - Excluded freight charges from total base amount calculations to prevent dual calculation.
  - Dynamic desk layout and workspace icons updated for Import LC module.
  - Pre-commit configurations initialized with standard python linter (`ruff`) and javascript formatters (`eslint`, `prettier`).
