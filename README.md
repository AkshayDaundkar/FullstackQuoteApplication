# QuoteApp – Salesforce SDE Technical Assessment

This project implements a Salesforce web application using **Apex** and **Lightning Web Components (LWC)**, following the **MVC architecture**. It is designed to manage **Quotes** and **QuoteLines**, allowing viewing, grouping, amending, and canceling line items in a structured way.

---

## Completed So Far

### 1. Project Setup
- Created Salesforce DX project: `QuoteApp`
- Connected to authorized developer org using Salesforce CLI
- Created required Apex Classes under `/classes`

---

## 2. Apex Classes

### QuoteController.cls
- Retrieves Quote information by Id
- Used to display the Quote header details in the frontend LWC

```apex
@AuraEnabled(cacheable=true)
public static SBQQ_Quote__c getQuoteById(Id quoteId)