<h2>User Guide</h2>

This guide describes how to use the **Import LC** module in your ERPNext site to track import contracts and manage bank Letters of Credit (LC).

---

## 1. Import Workflow Lifecycle

```
SequenceDiagram
    participant PO as Purchase Order (ERPNext)
    participant PI as Proforma Invoice (Custom)
    participant LC as Import LC (Custom)
    participant PI2 as Purchase Invoice (ERPNext)

    PO->>PI: Map using "Proforma Invoice" button
    PI->>LC: Create and link via Reference Section
    LC->>PI2: Map using "Create > Purchase Invoice"
```

---

## 2. Step-by-Step Instructions

### Step 1: Create a Purchase Order
1. Navigate to **Buying > Purchase Order > New**.
2. Fill in your items, supplier details, and shipping terms.
3. Save and **Submit** the Purchase Order.

### Step 2: Generate a Proforma Invoice (PI)
Once a Purchase Order is submitted:
1. Open the submitted **Purchase Order** form.
2. In the top-right toolbar, click **Create** and select **Proforma Invoice**.
3. The system maps supplier, currency, items, and logistics data automatically.
4. Fill in the **Supplier Bank Information** (select the supplier's bank). The system pulls:
   - Account Number / IBAN
   - SWIFT Code
   - Bank Address
5. Save and **Submit** the Proforma Invoice.

### Step 3: Record the Import LC
When your company's bank issues the LC on behalf of the supplier:
1. Go to **Import LC > Import LC > New**.
2. Under **Reference Section**, select the linked **Proforma Invoice**. The system fetches the linked `Purchase Order`, items, and currencies.
3. Enter the official **LC No** and select the **Form of Documentary Credit** (e.g., Irrevocable).
4. Define the logistics:
   - Date of Issue
   - Date of Expiry
   - Latest Date of Shipment
   - Port of Loading and Final Destination
5. Set the **LC Margin (%)** as required by the issuing bank.
6. Paste bank-required documents into **Documents Required** (e.g. Bill of Lading, Packing List).
7. Save and **Submit** the Import LC.

### Step 4: Issue the Purchase Invoice
To record payments against the LC:
1. Open the submitted **Import LC** document.
2. Click **Create** and select **Purchase Invoice**.
3. The system maps the LC details and items automatically.
4. Submit the Purchase Invoice.
5. The linked **Import LC** status will automatically update to **Partially Utilized** or **Fully Utilized** depending on the billed amount.

### Step 5: Monitor LC Status
Track the real-time status of your Import LCs from the **Import LC Workspace**:
- **Draft**: LC document not yet submitted.
- **Active**: LC submitted and within validity period.
- **Expired**: LC validity date has passed.
- **Partially Utilized**: Some linked invoices processed but total not yet met.
- **Fully Utilized**: All LC value has been drawn down.
- **Cancelled**: LC has been cancelled.
