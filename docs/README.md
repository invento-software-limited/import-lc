   <div align="center" markdown="1">

<img src="import_lc/public/images/import_lc_logo.svg" alt="Import LC logo" width="80"/>
<h1>Import LC</h1>

**Import LC (Letter of Credit) Management, Made Simple and Effective**

[![CI Tests](https://github.com/invento-software-limited/import-lc/actions/workflows/ci.yml/badge.svg)](https://github.com/invento-software-limited/import-lc/actions/workflows/ci.yml)
[![Linters](https://github.com/invento-software-limited/import-lc/actions/workflows/linters.yml/badge.svg)](https://github.com/invento-software-limited/import-lc/actions/workflows/linters.yml)

</div>

<div align="center">
	<img src="assets/import_lc_workspace.png" alt="Hero Image" width="100%" />
</div>
<br />
<div align="center">
	<a href="https://invento-software-limited.github.io/import-lc/">Documentation</a>
</div>

## Import LC
An Import Letter of Credit (LC) tracking and management application for Frappe and ERPNext (version-16), developed by **Invento Software Limited**. It simplifies tracking import contracts, banking requirements, and Letters of Credit to ensure financial compliance and streamline documentation.

### Motivation
Managing import billing, commercial documentation, and tracking bank letters of credit was complex and manual. We wanted a seamless extension for ERPNext to connect Purchase Orders directly to Import Proforma Invoices, trace active/expired/utilized bank LCs, and automatically map these to Purchase Invoices. This app makes managing import LCs automated and transparent.

### Key Features

- **Automated Purchase Order Sync**: Instantly link approved ERPNext Purchase Orders to initiate the import lifecycle, ensuring seamless downstream tracking.
- **Precision Proforma Generation**: Generate detailed Import Proforma Invoices directly from Purchase Orders with zero-touch mapping of items, currencies, and commercial terms.
- **End-to-End Commercial Mapping**: Seamlessly propagate Import LC and Proforma Invoice attributes to standard Purchase Invoices and related ERPNext documents.
- **SWIFT MT700 Field Alignment**: Standardize credit validation by mapping crucial MT700 fields, including issuing/beneficiary banks, tolerance limits, expiry timelines, and documentation instructions.
- **Real-Time Utilization Tracking**: Dynamically monitor and evaluate LC drawdown states (Draft, Active, Partially Utilized, Fully Utilized, Expired, Cancelled) against linked commercial documents.
- **Executive Workspace & Analytics**: Visualize critical metrics, utilization ratios, and LC distribution patterns through native, interactive Desk dashboards.

<details open>
<summary>View Screenshots</summary>
<br>


#### Import Proforma Invoice

![Import Proforma Invoice](assets/import_proforma_invoice.png)

#### Import LC

![Import LC](assets/import_lc.png)

</details>
<br>

### Under the Hood

- [**Frappe Framework**](https://github.com/frappe/frappe): A full-stack web application framework written in Python and Javascript.
- [**ERPNext**](https://github.com/frappe/erpnext): The core open-source ERP system version-16.

## Production Setup

For self-hosting and deploying on production environments using Docker, refer to our detailed deployment guide:
- [Docker Deployment Guide](docs/docker-deployment.md)

## Development Setup

To setup the repository locally in your bench:

1. Install bench and setup your `frappe-bench` directory by following the [Installation Steps](https://frappeframework.com/docs/user/en/installation).
2. Start the server by running `bench start`.
3. In a separate terminal window, create a new site by running `bench new-site import-lc.test`.
4. Map your site to localhost with the command:
   ```bash
   bench --site import-lc.test add-to-hosts
   ```
5. Get the ERPNext app:
   ```bash
   bench get-app erpnext --branch version-16
   ```
6. Get the Import LC app:
   ```bash
   bench get-app https://github.com/invento-software-limited/import-lc.git --branch version-16
   ```
7. Install the app on your site:
   ```bash
   bench --site import-lc.test install-app import_lc
   ```
8. Run database migrations:
   ```bash
   bench --site import-lc.test migrate
   ```
9. Build assets:
   ```bash
   bench build --app import_lc
   ```
10. Now open the URL `http://import-lc.test:8000/app/import-lc-workspace` in your browser.


## Compatibility matrix

| Import LC Branch | Compatible Frappe/ERPNext Version |
| ---------------- | --------------------------------- |
| version-16       | version-16                        |
| develop          | develop branch                    |

## Contributing

This application uses `pre-commit` for code formatting, quality checks, and linter validation.

### Setup Pre-commit locally:
1. Install pre-commit on your system.
2. Enable pre-commit in this repository:
   ```bash
   cd apps/import_lc
   pre-commit install
   ```

### Configured Tools:
- **Ruff**: For Python linting and formatting.
- **ESLint**: For Javascript code formatting.
- **Prettier**: For formatting JSON, YAML, and CSS files.
- **Semgrep**: For security analysis checks.

## License

MIT License. See the [license.txt](license.txt) file for details.
