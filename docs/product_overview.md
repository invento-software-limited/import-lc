<h2>Product Overview</h2>

**Import LC** is a specialized Letter of Credit (LC) management application designed specifically for **Frappe** and **ERPNext (version-16)**, developed by **Invento Software Limited**.

The application streamlines the tracking of import contracts, associated bank requirements, and Import Letters of Credit, ensuring full compliance and eliminating manual tracking overhead. It integrates directly with standard ERPNext purchasing processes.

---

## SWIFT MT700 Alignment

The custom doctypes are designed to map directly to standard SWIFT MT700 (Letter of Credit) message fields:
* **F40A (Form of Documentary Credit)**: Irrevocable, Revocable, Transferable, etc.
* **F31C (Date of Issue)**: Date the LC was issued by the importer's bank.
* **F31D (Date of Expiry)**: Expiry timeline of the LC.
* **F50 (Applicant)**: The buyer/importer opening the credit line.
* **F59 (Beneficiary)**: The seller/exporter receiving the credit.
* **F45A (Description of Goods/Services)**: Item specifications and terms.
* **F46A (Documents Required)**: Required documents for negotiation (e.g., Bills of Lading, Certificate of Origin, Packing Lists).
* **F47A (Additional Conditions)**: Custom terms or restrictions set by the issuing bank.
* **F78 (Instructions to Bank)**: Special instructions to the paying/negotiating bank.

---

## Core DocTypes & Schema

### 1. Proforma Invoice (PI)
The primary document starting the import cycle, serving as the commercial contract received from the overseas supplier.
* **DocType Name**: `Proforma Invoice`
* **Naming Series**: `PRO-INV-.####`
* **Key Fields**:
  - `pi_number` (Unique PI reference ID from supplier)
  - `purchase_order` (Link to ERPNext `Purchase Order`)
  - `bank`, `swift_code`, `account_number_iban`, `bank_address` (Supplier's receiving bank credentials)
  - `buyer`, `buyer_name`, `buyer_address` (Importer/company information)
  - `incoterm`, `payment_terms`, `delivery_terms` (Commercial agreements)
  - `port_of_loading`, `port_of_discharge`, `country_of_final_destination` (Logistics)

### 2. Import LC (Letter of Credit)
Records the official LC details opened at the importer's bank on behalf of the overseas supplier.
* **DocType Name**: `Import LC`
* **Naming Series**: `IMP-LC-.####`
* **Key Fields**:
  - `lc_no` (Letter of Credit number)
  - `proforma_invoice` (Link to `Proforma Invoice`)
  - `purchase_order` (Link to ERPNext `Purchase Order`)
  - `issuing_bank` & `beneficiary_bank` (Banks involved)
  - `latest_date_of_shipment`, `transshipment`, `partial_shipments` (Logistics parameters)
  - `percentage_credit_amount_tolerance` (Value tolerance)
  - `lc_margin` (LC margin percentage set by issuing bank)

---

## System Workflows & Automations

### 1. Validation Rules
- **One-to-One Validation**: The system enforces that only one active or submitted `Import LC` can exist per `Proforma Invoice` to prevent duplicate tracking or billing anomalies.

### 2. Automated Calculations
- **Currency & Conversion Rates**: The document totals are automatically converted to base (company) currency using the document-level `conversion_rate`.

### 3. Dynamic LC Status Tracking
The system dynamically updates the `status` of an `Import LC` record based on document life cycle and linked transactions:
* `Draft`: Document is still in draft state.
* `Active`: Document is submitted and open.
* `Expired`: Today's date has passed the defined `date_and_place_of_expiry`.
* `Partially Utilized`: Some linked purchase invoices have been processed but do not meet the grand total.
* `Fully Utilized`: The sum of linked submitted `Purchase Invoice` totals meets or exceeds the LC value.
* `Cancelled`: The document has been cancelled.
