public with sharing class QuoteController {

    // Get Quote by Id (exposed to Lightning Web Component)
    /**
     * Retrieves a Quote by its Id, including its Name, Fulfillment Frequency, Start Date, and End Date.
     * @param quoteId The Id of the Quote to retrieve.
     * @return The SBQQ_Quote__c record with the specified Id.
     */
    @AuraEnabled(cacheable=true)
    public static SBQQ_Quote__c getQuoteById(Id quoteId) {
        try {
            return [
                SELECT Name,
                       SBQQ_FulfillmentFrequency__c,
                       SBQQ_StartDate__c,
                       SBQQ_EndDate__c
                FROM SBQQ_Quote__c
                WHERE Id = :quoteId
                LIMIT 1
            ];
        } catch (Exception e) {
            throw new AuraHandledException('Error retrieving Quote: ' + e.getMessage());
        }
    }
}
