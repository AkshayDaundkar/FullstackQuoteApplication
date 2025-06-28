import { LightningElement, api, wire, track } from 'lwc';
import getQuoteById from '@salesforce/apex/QuoteController.getQuoteById';
import getQuoteLinesByQuoteId from '@salesforce/apex/QuoteLineController.getQuoteLinesByQuoteId';
import getProductSummaryByQuoteId from '@salesforce/apex/QuoteLineController.getProductSummaryByQuoteId';
import insertQuoteLine from '@salesforce/apex/QuoteLineController.insertQuoteLine';
import updateQuoteLine from '@salesforce/apex/QuoteLineController.updateQuoteLine';
import { refreshApex } from '@salesforce/apex';


export default class QuoteAmendment extends LightningElement {
    @api recordId;

    @track quote;
    @track quoteLines = [];
    @track productSummary = [];
    @track draftValues = [];
    @track selectedQuoteLineIds = [];
    @track hasProductSummary = false;
    @track hideCheckboxColumn = false;


    // Load Quote
    @wire(getQuoteById, { quoteId: '$recordId' })
    wiredQuote({ error, data }) {
        if (data) this.quote = data;
        else if (error) console.error('Quote error:', error);
    }

    // Load QuoteLines
    @wire(getQuoteLinesByQuoteId, { quoteId: '$recordId' })
    wiredQuoteLines(result) {
        this.wiredQuoteLinesResult = result;
        if (result.data) {
            this.quoteLines = result.data;
        } else if (result.error) {
            console.error('QuoteLine error:', result.error);
        }
    }


    // Load Product Summary
    @wire(getProductSummaryByQuoteId, { quoteId: '$recordId' })
    wiredProductSummary({ error, data }) {
        if (data) {
            this.productSummary = data;
            this.hasProductSummary = data.length > 0;
        } else if (error) {
            console.error('Product summary error:', error);
            this.hasProductSummary = false;
        }
    }


    // Define columns
    quoteLineColumns = [
        { label: 'QuoteLine Number', fieldName: 'Name' },
        { label: 'Product Code', fieldName: 'ProductCode__c' },
        { label: 'Order Account Name', fieldName: 'SBQQ_OrderAccount__r.Name' },
        { label: 'Quantity', fieldName: 'SBQQ_Quantity__c', type: 'number', editable: true },
        { label: 'Net Price', fieldName: 'SBQQ_NetPrice__c', type: 'currency', editable: true },
        { label: 'Amend Type', fieldName: 'SBQQ_AmendType__c' },
        { label: 'Amended From', fieldName: 'SBQQ_AmendedFrom__r.Name' },
    ];

    productColumns = [
        { label: 'Product Name', fieldName: 'productName' },
        { label: 'Product Code', fieldName: 'productCode' },
        { label: 'Product Total Quantity', fieldName: 'totalQuantity', type: 'number' },
    ];

    // Row Selection
    handleRowSelection(event) {
        this.selectedQuoteLineIds = event.detail.selectedRows.map(row => row.Id);
    }
    
    get noProductSummary() {
        return !this.hasProductSummary;
    }


    

    handleCancelSelected() {
        console.log('TODO: Handle cancel logic');
    }

    handleDownloadCSV() {
        if (!this.quoteLines.length) {
            console.warn('No quote lines to download.');
            return;
        }

        const headers = [
            'QuoteLine Number',
            'Product Code',
            'Order Account Name',
            'Quantity',
            'Net Price',
            'Amend Type',
            'Amended From'
        ];

        const csvRows = this.quoteLines.map(line => [
            line.Name,
            line.ProductCode__c || '',
            line.SBQQ_OrderAccount__r?.Name || '',
            line.SBQQ_Quantity__c || '',
            line.SBQQ_NetPrice__c || '',
            line.SBQQ_AmendType__c || '',
            line.SBQQ_AmendedFrom__r?.Name || ''
        ]);

        const csvContent = [headers, ...csvRows]
            .map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
            .join('\r\n');

        // Use data URI for compatibility
        const encodedUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', 'QuoteLines.csv');
        link.click();
    }




   handleSaveChanges(event) {
        const draftValues = event.detail.draftValues;

        if (!draftValues.length) {
            console.warn('No changes to save.');
            return;
        }

        const updates = [];
        const amendedLines = [];

        draftValues.forEach(draft => {
            const original = this.quoteLines.find(line => line.Id === draft.Id);
            if (!original) return;

            const quantityChanged = draft.SBQQ_Quantity__c !== undefined && draft.SBQQ_Quantity__c !== original.SBQQ_Quantity__c;
            const priceChanged = draft.SBQQ_NetPrice__c !== undefined && draft.SBQQ_NetPrice__c !== original.SBQQ_NetPrice__c;

            if (!quantityChanged && !priceChanged) return;

            const amendType = [];
            if (quantityChanged) amendType.push("Change Quantity");
            if (priceChanged) amendType.push("Change Price");

            amendedLines.push({
                SBQQ_Quote__c: original.SBQQ_Quote__c,
                SBQQ_Product__c: original.SBQQ_Product__c,
                ProductCode__c: original.ProductCode__c,
                SBQQ_OrderAccount__c: original.SBQQ_OrderAccount__c,
                SBQQ_Quantity__c: draft.SBQQ_Quantity__c ?? original.SBQQ_Quantity__c,
                SBQQ_NetPrice__c: draft.SBQQ_NetPrice__c ?? original.SBQQ_NetPrice__c,
                SBQQ_AmendedFrom__c: original.Id,
                SBQQ_AmendType__c: amendType.join('; ')
            });

            updates.push({
                Id: original.Id,
                SBQQ_Quantity__c: 0
            });
        });

        Promise.all([
            ...updates.map(line => updateQuoteLine({ ql: line })),
            ...amendedLines.map(line => insertQuoteLine({ ql: line }))
        ])
        .then(() => {
            this.draftValues = [];
            return refreshApex(this.wiredQuoteLinesResult);
        })
        .catch(error => {
            console.error('Save Error:', JSON.stringify(error));
        });
    }

    triggerSave() {
    // just a placeholder if needed
        console.log('Save triggered');
    }

}
