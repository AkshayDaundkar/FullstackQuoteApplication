public with sharing class QuoteLineController {

    // 1. Get all QuoteLines related to a given Quote Id
    /**
     * Retrieves all QuoteLines associated with a specific Quote Id, It also filters out QuoteLines with a quantity of 0,
     * and includes fields such as Name, Product, Product Code, Order Account, Quantity, Net Price, and Amendment details.
     * This method is cacheable for performance optimization.
     * @param quoteId The Id of the Quote for which to retrieve QuoteLines.
     * @return A list of SBQQ_QuoteLine__c records related to the specified Quote Id.
     */
    @AuraEnabled(cacheable=true)
    public static List<SBQQ_QuoteLine__c> getQuoteLinesByQuoteId(Id quoteId) {
        return [
            SELECT Id,
                   Name,
                   SBQQ_Quote__c,
                   SBQQ_Product__c,
                   SBQQ_Product__r.Name,
                   SBQQ_ProductCode__c,
                   SBQQ_OrderAccount__c,
                   SBQQ_OrderAccount__r.Name,
                   SBQQ_Quantity__c,
                   SBQQ_NetPrice__c,
                   SBQQ_AmendType__c,
                   SBQQ_AmendedFrom__c,
                   SBQQ_AmendedFrom__r.Name
            FROM SBQQ_QuoteLine__c
            WHERE SBQQ_Quote__c = :quoteId AND SBQQ_Quantity__c > 0
        ];
    }

    // 2. Group by Product and return total quantity per product
    /**
     * Retrieves a summary of products associated with a specific Quote Id, grouping by product and summing the quantities.
     * This method returns a list of ProductSummaryWrapper objects containing product details and total quantity.
     * @param quoteId The Id of the Quote for which to retrieve product summaries.
     * @return A list of ProductSummaryWrapper objects summarizing products and their total quantities.
     */
    
    @AuraEnabled(cacheable=true)
    public static List<ProductSummaryWrapper> getProductSummaryByQuoteId(Id quoteId) {
        Map<Id, ProductSummaryWrapper> productMap = new Map<Id, ProductSummaryWrapper>();

        for (SBQQ_QuoteLine__c ql : [
            SELECT SBQQ_Product__c, SBQQ_Product__r.Name, SBQQ_ProductCode__c, SBQQ_Quantity__c
            FROM SBQQ_QuoteLine__c
            WHERE SBQQ_Quote__c = :quoteId
        ]) {
            if (!productMap.containsKey(ql.SBQQ_Product__c)) {
                productMap.put(ql.SBQQ_Product__c, new ProductSummaryWrapper(
                    ql.SBQQ_Product__c,
                    ql.SBQQ_Product__r.Name,
                    ql.SBQQ_ProductCode__c,
                    0
                ));
            }
            productMap.get(ql.SBQQ_Product__c).totalQuantity += ql.SBQQ_Quantity__c;
        }

        return new List<ProductSummaryWrapper>(productMap.values());
    }

    public class ProductSummaryWrapper {
        @AuraEnabled public Id productId;
        @AuraEnabled public String productName;
        @AuraEnabled public String productCode;
        @AuraEnabled public Decimal totalQuantity;

        public ProductSummaryWrapper(Id productId, String productName, String productCode, Decimal totalQuantity) {
            this.productId = productId;
            this.productName = productName;
            this.productCode = productCode;
            this.totalQuantity = totalQuantity;
        }
    }

    // 3. Insert new QuoteLine
    @AuraEnabled
    public static SBQQ_QuoteLine__c insertQuoteLine(SBQQ_QuoteLine__c ql) {
        try {
                insert ql;
                return ql;
            } catch (Exception e) {
                throw new AuraHandledException('Insert failed: ' + e.getMessage());
            }
    }


    // 4. Update QuoteLine
    @AuraEnabled
    public static SBQQ_QuoteLine__c updateQuoteLine(SBQQ_QuoteLine__c ql) {
        try {
            update ql;
            return ql;
        } catch (Exception e) {
            throw new AuraHandledException('Update failed: ' + e.getMessage());
        }
    }

    // 5. Delete QuoteLine
    @AuraEnabled
    public static void deleteQuoteLine(Id quoteLineId) {
        delete [SELECT Id FROM SBQQ_QuoteLine__c WHERE Id = :quoteLineId];
    }

    //6 Cancel QuoteLines
    @AuraEnabled
    public static void cancelQuoteLines(List<Id> quoteLineIds) {
        List<SBQQ_QuoteLine__c> linesToUpdate = new List<SBQQ_QuoteLine__c>();
        List<SBQQ_QuoteLine__c> linesToDelete = new List<SBQQ_QuoteLine__c>();

        Map<Id, SBQQ_QuoteLine__c> qlMap = new Map<Id, SBQQ_QuoteLine__c>(
            [SELECT Id, SBQQ_AmendedFrom__c FROM SBQQ_QuoteLine__c WHERE Id IN :quoteLineIds]
        );

        Set<Id> amendedFromIds = new Set<Id>();

        for (SBQQ_QuoteLine__c line : qlMap.values()) {
            if (line.SBQQ_AmendedFrom__c != null) {
                // Amended line → delete it, update original
                linesToDelete.add(line);
                amendedFromIds.add(line.SBQQ_AmendedFrom__c);
            } else {
                // Original line → mark as cancelled
                line.SBQQ_Quantity__c = 0;
                line.SBQQ_AmendType__c = 'Cancel Product';
                linesToUpdate.add(line);
            }
        }

        if (!amendedFromIds.isEmpty()) {
            List<SBQQ_QuoteLine__c> originals = [
                SELECT Id FROM SBQQ_QuoteLine__c WHERE Id IN :amendedFromIds
            ];
            for (SBQQ_QuoteLine__c o : originals) {
                o.SBQQ_AmendType__c = 'Cancel Product';
            }
            linesToUpdate.addAll(originals);
        }

        if (!linesToDelete.isEmpty()) delete linesToDelete;
        if (!linesToUpdate.isEmpty()) update linesToUpdate;
    }

    //7 Undo Amendments
    @AuraEnabled
    public static void undoAmendments(List<Id> amendedQuoteLineIds) {
        List<SBQQ_QuoteLine__c> amendedLines = [SELECT Id, SBQQ_AmendedFrom__c FROM SBQQ_QuoteLine__c WHERE Id IN :amendedQuoteLineIds];
        List<SBQQ_QuoteLine__c> originalsToRestore = new List<SBQQ_QuoteLine__c>();
        Set<Id> originalIds = new Set<Id>();

        for (SBQQ_QuoteLine__c line : amendedLines) {
            if (line.SBQQ_AmendedFrom__c != null) {
                originalIds.add(line.SBQQ_AmendedFrom__c);
            }
        }

        if (!originalIds.isEmpty()) {
            originalsToRestore = [SELECT Id, SBQQ_Quantity__c, SBQQ_NetPrice__c FROM SBQQ_QuoteLine__c WHERE Id IN :originalIds];
            for (SBQQ_QuoteLine__c orig : originalsToRestore) {
                orig.SBQQ_Quantity__c = 1; 
                orig.SBQQ_AmendType__c = null;
            }
        }

        delete amendedLines;
        update originalsToRestore;
    }


}
