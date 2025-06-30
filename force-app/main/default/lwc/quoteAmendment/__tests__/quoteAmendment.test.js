import { createElement } from 'lwc';
import QuoteAmendment from 'c/quoteAmendment';
import getQuoteById from '@salesforce/apex/QuoteController.getQuoteById';
import getQuoteLinesByQuoteId from '@salesforce/apex/QuoteLineController.getQuoteLinesByQuoteId';
import getProductSummaryByQuoteId from '@salesforce/apex/QuoteLineController.getProductSummaryByQuoteId';
import cancelQuoteLines from '@salesforce/apex/QuoteLineController.cancelQuoteLines';
import undoAmendments from '@salesforce/apex/QuoteLineController.undoAmendments';
import updateQuoteLine from '@salesforce/apex/QuoteLineController.updateQuoteLine';
import insertQuoteLine from '@salesforce/apex/QuoteLineController.insertQuoteLine';
import { ShowToastEventName } from 'lightning/platformShowToastEvent';
import { registerLdsTestWireAdapter } from '@salesforce/wire-service-jest-util';

// Mock Apex methods
jest.mock(
    '@salesforce/apex/QuoteController.getQuoteById',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/QuoteLineController.getQuoteLinesByQuoteId',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/QuoteLineController.getProductSummaryByQuoteId',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/QuoteLineController.cancelQuoteLines',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/QuoteLineController.undoAmendments',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/QuoteLineController.updateQuoteLine',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/QuoteLineController.insertQuoteLine',
    () => ({ default: jest.fn() }),
    { virtual: true }
);

// Sample data
const mockQuote = { Name: 'Q-1234', SBQQ_FulfillmentFrequency__c: 'Monthly' };
const mockQuoteLines = [
    {
        Id: 'a1',
        Name: 'QL-1',
        SBQQ_ProductCode__c: 'P-001',
        SBQQ_OrderAccount__c: 'ACC-1',
        SBQQ_Quantity__c: 2,
        SBQQ_NetPrice__c: 100,
        SBQQ_AmendType__c: null,
        SBQQ_AmendedFrom__r: null
    }
];
const mockProductSummary = [
    { productId: 'p1', productName: 'Widget', productCode: 'W123', totalQuantity: 2 }
];

describe('c-quote-amendment', () => {
    beforeEach(() => {
        getQuoteById.mockResolvedValue(mockQuote);
        getQuoteLinesByQuoteId.mockResolvedValue(mockQuoteLines);
        getProductSummaryByQuoteId.mockResolvedValue(mockProductSummary);
    });

    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.clearAllMocks();
    });

    it('renders quote data and tabs', async () => {
        const element = createElement('c-quote-amendment', { is: QuoteAmendment });
        element.recordId = 'abc123';
        document.body.appendChild(element);

        await Promise.resolve(); // resolve wire
        const tabs = element.shadowRoot.querySelectorAll('lightning-tab');
        expect(tabs.length).toBe(2); // QuoteLines + Products
    });

    it('shows toast when no QuoteLines are selected on cancel', async () => {
        const element = createElement('c-quote-amendment', { is: QuoteAmendment });
        document.body.appendChild(element);
        await Promise.resolve();

        const handler = jest.fn();
        element.addEventListener(ShowToastEventName, handler);
        element.handleCancelSelected();
        expect(handler).toHaveBeenCalledWith(expect.objectContaining({
            detail: expect.objectContaining({ variant: 'warning' })
        }));
    });

    it('handles save changes correctly', async () => {
        const element = createElement('c-quote-amendment', { is: QuoteAmendment });
        document.body.appendChild(element);
        await Promise.resolve();

        updateQuoteLine.mockResolvedValue({});
        insertQuoteLine.mockResolvedValue({});

        const event = {
            detail: {
                draftValues: [
                    { Id: 'a1', SBQQ_Quantity__c: 3, SBQQ_NetPrice__c: 150 }
                ]
            }
        };

        const toastSpy = jest.fn();
        element.addEventListener(ShowToastEventName, toastSpy);

        await element.handleSaveChanges(event);
        expect(updateQuoteLine).toHaveBeenCalled();
        expect(insertQuoteLine).toHaveBeenCalled();
        expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({
            detail: expect.objectContaining({ variant: 'success' })
        }));
    });

    it('downloads CSV when quoteLines exist', async () => {
        const element = createElement('c-quote-amendment', { is: QuoteAmendment });
        document.body.appendChild(element);
        await Promise.resolve();

        const linkSpy = jest.spyOn(document, 'createElement');
        element.handleDownloadCSV();
        expect(linkSpy).toHaveBeenCalledWith('a');
    });
});
