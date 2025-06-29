# QuoteAmendmentApp – Salesforce SDE Technical Assessment

This project is a Salesforce web application built using **Apex** and **Lightning Web Components (LWC)**, following the **MVC architecture**. It manages **Quotes** and **QuoteLines** (Salesforce objects: `SBQQ_Quote__c` and `SBQQ_QuoteLine__c`), allowing users to view, group, amend, cancel, and undo amendments on quote line items in a structured and user-friendly way.

---

## Table of Contents

- [Project Structure](#project-structure)
- [Features Implemented](#features-implemented)
- [File Responsibilities](#file-responsibilities)
- [How It Works](#how-it-works)
- [Future Enhancements](#future-enhancements)
- [Development Reference](#development-reference)

---

## Project Structure

```
force-app/
  main/
    default/
      classes/
        QuoteController/
          QuoteController.cls
          QuoteController.cls-meta.xml
        QuoteLineController/
          QuoteLineController.cls
          QuoteLineController.cls-meta.xml
      lwc/
        quoteAmendment/
          quoteAmendment.html
          quoteAmendment.js
          quoteAmendment.js-meta.xml
          __tests__/
            quoteAmendment.test.js
```

---

## Features Implemented

### Backend (Apex Classes)

#### [`QuoteController`](force-app/main/default/classes/QuoteController/QuoteController.cls)
- **getQuoteById**: Retrieves Quote information (Quote Number, Fulfillment Frequency, Start Date, End Date) by Quote Id.

#### [`QuoteLineController`](force-app/main/default/classes/QuoteLineController/QuoteLineController.cls)
- **getQuoteLinesByQuoteId**: Retrieves all QuoteLines for a given Quote Id, including related Product and Account info. Filters out lines with zero quantity.
- **getProductSummaryByQuoteId**: Groups QuoteLines by Product and returns total quantity per product for a given Quote Id.
- **insertQuoteLine**: Inserts a new QuoteLine (used for amendments).
- **updateQuoteLine**: Updates an existing QuoteLine (e.g., to set quantity to 0 when amending/cancelling).
- **deleteQuoteLine**: Deletes a QuoteLine.
- **cancelQuoteLines**: Cancels selected QuoteLines (sets quantity to 0 and amend type to "Cancel Product"; handles both original and amended lines).
- **undoAmendments**: Undoes amendments by deleting amended QuoteLines and restoring original values.

### Frontend (Lightning Web Component)

#### [`quoteAmendment`](force-app/main/default/lwc/quoteAmendment/quoteAmendment.js)
- **Header Section**: Displays Quote Number, Fulfillment Frequency, Start Date, and End Date.
- **Tabset Section**:
  - **QuoteLines Tab**:
    - Download all QuoteLine data as CSV.
    - Editable and selectable datatable for QuoteLines (fields: QuoteLine Number, Product Code, Order Account Name, Quantity, Net Price, Amend Type, Amended From).
    - Save changes to Quantity/Net Price (creates amended QuoteLine, updates original).
    - Cancel selected QuoteLines (handles both original and amended lines).
    - Undo amendments (restores original QuoteLine, deletes amended).
    - Clickable QuoteLine Number and Amended From fields (navigate to record).
  - **Products Tab**:
    - View-only datatable summarizing products (Product Name, Product Code, Product Total Quantity).
    - Tab label shows product count.

---

## File Responsibilities

- [`QuoteController.cls`](force-app/main/default/classes/QuoteController/QuoteController.cls):  
  Handles retrieval of Quote header information.

- [`QuoteLineController.cls`](force-app/main/default/classes/QuoteLineController/QuoteLineController.cls):  
  Handles all QuoteLine-related logic: querying, grouping, inserting, updating, deleting, cancelling, and undoing amendments.

- [`quoteAmendment.js`](force-app/main/default/lwc/quoteAmendment/quoteAmendment.js):  
  LWC JavaScript controller for UI logic, data fetching, user actions, and event handling.

- [`quoteAmendment.html`](force-app/main/default/lwc/quoteAmendment/quoteAmendment.html):  
  LWC template for rendering the UI (header, tabset, datatables, buttons).

- [`quoteAmendment.js-meta.xml`](force-app/main/default/lwc/quoteAmendment/quoteAmendment.js-meta.xml):  
  LWC metadata configuration (exposes component on Quote record page).

- [`quoteAmendment.test.js`](force-app/main/default/lwc/quoteAmendment/__tests__/quoteAmendment.test.js):  
  Placeholder for Jest unit tests for the LWC.

---

## How It Works

1. **Quote Header**:  
   The component fetches and displays the main Quote details using [`QuoteController.getQuoteById`](force-app/main/default/classes/QuoteController/QuoteController.cls).

2. **QuoteLines Tab**:  
   - Displays all QuoteLines (except those with zero quantity) in an editable datatable.
   - Users can edit Quantity and Net Price. On save:
     - The original QuoteLine is set to quantity 0.
     - A new amended QuoteLine is created, referencing the original, with updated values and amend type.
     - Further edits update the amended line, not the original.
   - Users can select lines and:
     - **Cancel**: Sets quantity to 0 and amend type to "Cancel Product". If the line is an amendment, deletes it and updates the original.
     - **Undo Amendment**: Deletes the amended line and restores the original's values.
   - Download all QuoteLine data as CSV.
   - QuoteLine Number and Amended From fields are clickable links to the record page.

3. **Products Tab**:  
   - Shows a summary table of all products in the QuoteLines, grouped by product, with total quantity.
   - Tab label shows the number of products.

---

## Future Enhancements

- **Modularization**:  
  Extract the QuoteLines datatable into a separate LWC for better code reuse and maintainability.

- **Validation & Error Handling**:  
  Add user-friendly error messages and input validation for all user actions.

- **UI/UX Improvements**:  
  - Add loading spinners and success/error notifications.
  - Improve mobile responsiveness and accessibility.

- **Bulk Operations**:  
  Optimize backend methods for large data volumes and bulk actions.

- **Unit Tests**:  
  Implement comprehensive Jest tests for the LWC and Apex test classes for controllers.

- **Field Customization**:  
  Allow admin configuration of which fields are displayed/edited.

- **Audit Trail**:  
  Track amendment/cancellation history for compliance.

---

## Development Reference

- **Apex**:  
  - SOQL for querying data  
  - DML for record manipulation  
  - Exception handling for robust backend logic

- **LWC**:  
  - `@wire` for reactive data fetching  
  - Lightning Datatable for editable/selectable tables  
  - Lightning Tabset for UI organization  
  - Event handling for user actions

- **Deployment**:  
  - Deploy Apex classes and LWC to Salesforce org  
  - Add LWC to Quote record page

---

## Assessment Coverage

This implementation covers all required features from the assessment, including:
- Apex controllers for Quote and QuoteLine with all required methods
- LWC for viewing and amending Quote and QuoteLines
- Editable datatable, CSV export, cancel/undo actions, clickable links, and product summary
- Bonus: Undo amendment, clickable fields, product count in tab label

---

