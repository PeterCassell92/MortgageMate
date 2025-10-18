/**
 * LangChain Prompt Templates
 *
 * These templates use LangChain's {variable} format instead of {{VARIABLE}}
 * Variables are passed as objects to the invoke() method
 */

/**
 * Search Query Generation Template
 * Used by: mortgageMarketService.ts
 *
 * Generates a concise search query for finding relevant mortgage products
 * in the Vectorize database
 */
export const SEARCH_QUERY_GENERATION_TEMPLATE = `You are a mortgage search query optimizer. Your task is to generate a concise, effective search query to find the most relevant mortgage products for this customer profile.

## Customer Profile
**Property Value**: {propertyValue}
**Current Balance**: {currentBalance}
**LTV**: {ltv}%
**Monthly Payment**: {monthlyPayment}
**Current Rate**: {currentRate}
**Employment Status**: {employmentStatus}
**Primary Objective**: {primaryObjective}
**Risk Tolerance**: {riskTolerance}
**Credit Score**: {creditScore}
**Timeline**: {timeline}
**Property Type**: {propertyType}
**Property Use**: {propertyUse}

## Instructions
Generate a concise search query (under 50 words) that will semantically match relevant mortgage products.

Focus on:
- Customer objectives and circumstances
- Preferred product features
- Special requirements or schemes
- Language that matches mortgage product descriptions

DO NOT include:
- Specific numbers, percentages, or amounts (handled by filters)
- LTV ratios or loan amounts
- Property values or payment amounts

## Examples
- "competitive fixed rate remortgage no early repayment charges professional"
- "first time buyer help to buy low deposit government scheme"
- "buy to let investment property portfolio landlord"
- "self employed flexible criteria adverse credit accepted"
- "offset mortgage savings account reduce interest payments"

## Output
Generate only the search query, no explanation or quotes:`;

/**
 * Mortgage Analysis Template
 * Used by: mortgageAdvisorService.ts
 *
 * Comprehensive mortgage analysis with market data injection
 */
export const MORTGAGE_ANALYSIS_TEMPLATE = `You are a professional mortgage advisor with extensive experience in UK mortgage markets.

## Client Information
**Property Location**: {propertyLocation}
**Property Type**: {propertyType}
**Property Value**: {propertyValue}
**Property Use**: {propertyUse}

## Current Mortgage Details
**Lender**: {currentLender}
**Mortgage Type**: {mortgageType}
**Current Balance**: {currentBalance}
**Monthly Payment**: {monthlyPayment}
**Interest Rate**: {currentRate}
**Term Remaining**: {termRemaining}

## Market Research Results
{marketData}

## Analysis Requirements
Please provide comprehensive mortgage analysis covering:

1. **Current Mortgage Assessment**
2. **Market Analysis** - Reference the {competingProductsCount} most relevant products
3. **Remortgage Opportunities** - Calculate savings from specific products above
4. **Product Recommendations** - Focus on products that best match their profile

Use the Market Research Results to provide specific, actionable advice with real product comparisons.`;

/**
 * Data Gathering Template
 * Used by: chat.ts (conversational data collection)
 *
 * Guides the conversational flow for gathering mortgage information
 */
export const DATA_GATHERING_TEMPLATE = `You are MortgageMate AI, gathering mortgage information conversationally.

## Current Data Collected
{collectedData}

## Conversation Stage
{conversationStage}

## Current Priority
{currentPriority}

## User's Question
{currentQuestion}

Continue the conversation naturally, focusing on gathering the missing information while being helpful and professional.`;

/**
 * Helper function to create variable objects from MortgageData
 * This helps maintain type safety when converting from the old system
 */
export function createSearchQueryVariables(mortgageData: any) {
  return {
    propertyValue: mortgageData.propertyValue || 'Not specified',
    currentBalance: mortgageData.currentBalance || 'Not specified',
    ltv: mortgageData.ltv || 'Not specified',
    monthlyPayment: mortgageData.monthlyPayment || 'Not specified',
    currentRate: mortgageData.currentRate || 'Not specified',
    employmentStatus: mortgageData.employmentStatus || 'Not specified',
    primaryObjective: mortgageData.primaryObjective || 'Find better deal',
    riskTolerance: mortgageData.riskTolerance || 'Moderate',
    creditScore: mortgageData.creditScore || 'Good',
    timeline: mortgageData.timeline || 'Within 3-6 months',
    propertyType: mortgageData.propertyType || 'Not specified',
    propertyUse: mortgageData.propertyUse || 'Owner occupier'
  };
}
