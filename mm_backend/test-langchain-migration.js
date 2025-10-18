/**
 * Quick test script for LangChain migration
 * Run with: node test-langchain-migration.js
 */

// Load environment variables
require('dotenv').config();

// Set test environment variables
process.env.LLM_IMPLEMENTATION = 'langchain';
process.env.MOCK_LLM = 'true';

async function testLangChainMigration() {
  console.log('🧪 Testing LangChain Migration...\n');

  try {
    // Import the service (must be after env vars are set)
    const { createLangChainService } = require('./dist/mm_backend/src/services/langChainService');
    const { SEARCH_QUERY_GENERATION_TEMPLATE, createSearchQueryVariables } = require('./dist/mm_backend/src/services/prompts/langChainTemplates');

    console.log('✅ Services imported successfully\n');

    // Create test mortgage data
    const testMortgageData = {
      propertyValue: 350000,
      currentBalance: 280000,
      ltv: 80,
      monthlyPayment: 1200,
      currentRate: 4.5,
      employmentStatus: 'Employed',
      primaryObjective: 'Lower monthly payments',
      riskTolerance: 'Moderate',
      creditScore: 'Good',
      timeline: 'Within 3 months',
      propertyType: 'House',
      propertyUse: 'Owner occupier'
    };

    console.log('📊 Test Data:', testMortgageData, '\n');

    // Create variables for template
    const variables = createSearchQueryVariables(testMortgageData);
    console.log('🔧 Variables created successfully\n');

    // Test LangChain service
    const langChainService = createLangChainService();
    console.log('🤖 LangChain service created\n');

    console.log('🔍 Invoking LangChain with mock mode...\n');

    const response = await langChainService.invoke({
      template: SEARCH_QUERY_GENERATION_TEMPLATE,
      variables,
      options: {
        maxTokens: 100,
        temperature: 0.3
      }
    });

    console.log('✅ Response received!\n');
    console.log('📝 Content:', response.content);
    console.log('📊 Usage:', response.usage);
    console.log('🏷️  Provider:', response.provider);
    console.log('🤖 Model:', response.model);
    console.log('\n✅ LangChain migration test PASSED! 🎉');

  } catch (error) {
    console.error('\n❌ Test FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testLangChainMigration();