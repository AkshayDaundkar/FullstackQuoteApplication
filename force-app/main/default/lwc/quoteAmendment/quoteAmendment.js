import { LightningElement, api, wire, track } from 'lwc';
import getQuoteById from '@salesforce/apex/QuoteController.getQuoteById';
import getQuoteLinesByQuoteId from '@salesforce/apex/QuoteLineController.getQuoteLinesByQuoteId';
import getProductSummaryByQuoteId from '@salesforce/apex/QuoteLineController.getProductSummaryByQuoteId';
import insertQuoteLine from '@salesforce/apex/QuoteLineController.insertQuoteLine';
import updateQuoteLine from '@salesforce/apex/QuoteLineController.updateQuoteLine';
import cancelQuoteLines from '@salesforce/apex/QuoteLineController.cancelQuoteLines';
import undoAmendments from '@salesforce/apex/QuoteLineController.undoAmendments';
import { refreshApex } from '@salesforce/apex';

export default class QuoteAmendment extends LightningElement {
    @api recordId;
    @track quote;
    @track quoteLines = [];
    @track productSummary = [];
    @track selectedQuoteLineIds = [];
    @track hasProductSummary = false;
    @track hideCheckboxColumn = false;
    wiredQuoteLinesResult;

    @wire(getQuoteById, { quoteId: '$recordId' })
    wiredQuote({ error, data }) {
        if (data) this.quote = data;
        else if (error) console.error('Quote error:', error);
    }

    @wire(getQuoteLinesByQuoteId, { quoteId: '$recordId' })
    wiredQuoteLines(result) {
        this.wiredQuoteLinesResult = result;
        if (result.data) {
            this.quoteLines = result.data.map(line => ({
                ...line,
                QuoteLineUrl: `/lightning/r/SBQQ_QuoteLine__c/${line.Id}/view`,
                AmendedFromUrl: line.SBQQ_AmendedFrom__r?.Id
                    ? `/lightning/r/SBQQ_QuoteLine__c/${line.SBQQ_AmendedFrom__r.Id}/view`
                    : ''
            }));
        } else if (result.error) {
            console.error('QuoteLine error:', result.error);
        }
    }

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

    get noProductSummary() {
        return !this.hasProductSummary;
    }

    get productTabLabel() {
        return `Products (${this.productSummary.length})`;
    }

    quoteLineColumns = [
        {
            label: 'QuoteLine Number',
            fieldName: 'QuoteLineUrl',
            type: 'url',
            typeAttributes: { label: { fieldName: 'Name' }, target: '_blank' }
        },
        { label: 'Product Code', fieldName: 'SBQQ_ProductCode__c' },
        { label: 'Order Account Name', fieldName: 'SBQQ_OrderAccount__r.Name' },
        { label: 'Quantity', fieldName: 'SBQQ_Quantity__c', type: 'number', editable: true },
        { label: 'Net Price', fieldName: 'SBQQ_NetPrice__c', type: 'currency', editable: true },
        { label: 'Amend Type', fieldName: 'SBQQ_AmendType__c' },
        {
            label: 'Amended From',
            fieldName: 'AmendedFromUrl',
            type: 'url',
            typeAttributes: { label: { fieldName: 'SBQQ_AmendedFrom__r.Name' }, target: '_blank' }
        }
    ];

    productColumns = [
        { label: 'Product Name', fieldName: 'productName' },
        { label: 'Product Code', fieldName: 'productCode' },
        { label: 'Product Total Quantity', fieldName: 'totalQuantity', type: 'number' }
    ];

    handleRowSelection(event) {
        this.selectedQuoteLineIds = event.detail.selectedRows.map(row => row.Id);
    }

    handleCancelSelected() {
        if (!this.selectedQuoteLineIds.length) return;
        cancelQuoteLines({ quoteLineIds: this.selectedQuoteLineIds })
            .then(() => refreshApex(this.wiredQuoteLinesResult))
            .catch(error => console.error('Cancel Error:', JSON.stringify(error)));
    }

    handleUndoAmendment() {
        if (!this.selectedQuoteLineIds.length) return;
        undoAmendments({ amendedQuoteLineIds: this.selectedQuoteLineIds })
            .then(() => refreshApex(this.wiredQuoteLinesResult))
            .catch(error => console.error('Undo Error:', JSON.stringify(error)));
    }

    handleDownloadCSV() {
        if (!this.quoteLines.length) return;

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
            line.SBQQ_ProductCode__c || '',
            line.SBQQ_OrderAccount__r?.Name || '',
            line.SBQQ_Quantity__c || '',
            line.SBQQ_NetPrice__c || '',
            line.SBQQ_AmendType__c || '',
            line.SBQQ_AmendedFrom__r?.Name || ''
        ]);

        const csvContent = [headers, ...csvRows]
            .map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const encodedUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', 'QuoteLines.csv');
        link.click();
    }

    // handleSaveChanges(event) {
    //     const draftValues = event.detail.draftValues;
    //     const updates = [], amendedLines = [];

    //     draftValues.forEach(draft => {
    //         const original = this.quoteLines.find(line => line.Id === draft.Id);
    //         if (!original) return;

    //         const quantityChanged = draft.SBQQ_Quantity__c !== undefined && draft.SBQQ_Quantity__c !== original.SBQQ_Quantity__c;
    //         const priceChanged = draft.SBQQ_NetPrice__c !== undefined && draft.SBQQ_NetPrice__c !== original.SBQQ_NetPrice__c;

    //         if (!quantityChanged && !priceChanged) return;

    //         const amendType = [];
    //         if (quantityChanged) amendType.push("Change Quantity");
    //         if (priceChanged) amendType.push("Change Price");

    //         amendedLines.push({
    //             SBQQ_Quote__c: original.SBQQ_Quote__c,
    //             SBQQ_Product__c: original.SBQQ_Product__c,
    //             SBQQ_ProductCode__c: original.SBQQ_ProductCode__c,
    //             SBQQ_OrderAccount__c: original.SBQQ_OrderAccount__c,
    //             SBQQ_Quantity__c: draft.SBQQ_Quantity__c,
    //             SBQQ_NetPrice__c: draft.SBQQ_NetPrice__c,
    //             SBQQ_AmendedFrom__c: original.Id,
    //             SBQQ_AmendType__c: amendType.join('; ')
    //         });

    //         updates.push({ Id: original.Id, SBQQ_Quantity__c: 0 });
    //     });

    //     Promise.all([
    //         ...updates.map(u => updateQuoteLine({ ql: u })),
    //         ...amendedLines.map(i => insertQuoteLine({ ql: i }))
    //     ])
    //         .then(() => refreshApex(this.wiredQuoteLinesResult))
    //         .catch(error => console.error('Save Error:', JSON.stringify(error)));
    // }
    handleSaveChanges(event) {
        const draftValues = event.detail.draftValues;
        const updates = [], amendedLines = [];

        draftValues.forEach(draft => {
            const original = this.quoteLines.find(line => line.Id === draft.Id);
            if (!original) return;

            // Handle fallback to original if draft value is undefined
            const newQuantity = draft.SBQQ_Quantity__c !== undefined ? draft.SBQQ_Quantity__c : original.SBQQ_Quantity__c;
            const newPrice = draft.SBQQ_NetPrice__c !== undefined ? draft.SBQQ_NetPrice__c : original.SBQQ_NetPrice__c;

            const quantityChanged = newQuantity !== original.SBQQ_Quantity__c;
            const priceChanged = newPrice !== original.SBQQ_NetPrice__c;

            if (!quantityChanged && !priceChanged) return;

            const amendType = [];
            if (quantityChanged) amendType.push("Change Quantity");
            if (priceChanged) amendType.push("Change Price");

            amendedLines.push({
                SBQQ_Quote__c: original.SBQQ_Quote__c,
                SBQQ_Product__c: original.SBQQ_Product__c,
                SBQQ_ProductCode__c: original.SBQQ_ProductCode__c,
                SBQQ_OrderAccount__c: original.SBQQ_OrderAccount__c,
                SBQQ_Quantity__c: newQuantity,
                SBQQ_NetPrice__c: newPrice,
                SBQQ_AmendedFrom__c: original.Id,
                SBQQ_AmendType__c: amendType.join('; ')
            });

            updates.push({ Id: original.Id, SBQQ_Quantity__c: 0 });
        });

        Promise.all([
            ...updates.map(u => updateQuoteLine({ ql: u })),
            ...amendedLines.map(i => insertQuoteLine({ ql: i }))
        ])
            .then(() => refreshApex(this.wiredQuoteLinesResult))
            .catch(error => console.error('Save Error:', JSON.stringify(error)));
    }

}
