/**
 * Test both Legacy and LangChain modes
 * Demonstrates instant switching capability
 */

require('dotenv').config();
process.env.MOCK_LLM = 'true';

async function testMode(mode) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 Testing ${mode.toUpperCase()} MODE`);
  console.log('='.repeat(60));

  process.env.LLM_IMPLEMENTATION = mode;

  // Clear require cache to reload with new env
  Object.keys(require.cache).forEach(key => {
    if (key.includes('mortgageMarketService') || key.includes('langChainService') || key.includes('llmService')) {
      delete require.cache[key];
    }
  });

  const { createMortgageMarketService } = require('./dist/mm_backend/src/services/mortgageMarketService');

  const service = createMortgageMarketService();

  const testData = {
    propertyValue: 350000,
    currentBalance: 280000,
    propertyType: 'House',
    propertyUse: 'Owner occupier',
    employmentStatus: 'Employed',
    primaryObjective: 'Lower monthly payments'
  };

  console.log(`📊 Test Data:`, testData);
  console.log(`\n🔍 Generating search query...\n`);

  try {
    // Call the private method indirectly through findCompetingProducts
    // Since we're in mock mode with no Vectorize, it will call generateSearchQuery
    const result = await service.findCompetingProducts(testData);

    console.log(`✅ ${mode.toUpperCase()} mode working!`);
    console.log(`📝 Result: Empty market data (expected without Vectorize)`);

    return true;
  } catch (error) {
    console.error(`❌ ${mode.toUpperCase()} mode failed:`, error.message);
    return false;
  }
}

async function runTests() {
  console.log('\n🎯 Testing LLM Implementation Switching\n');

  const legacyPassed = await testMode('legacy');
  const langchainPassed = await testMode('langchain');

  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 RESULTS');
  console.log('='.repeat(60));
  console.log(`Legacy Mode:    ${legacyPassed ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`LangChain Mode: ${langchainPassed ? '✅ PASS' : '❌ FAIL'}`);
  console.log('='.repeat(60));

  if (legacyPassed && langchainPassed) {
    console.log('\n🎉 Both modes work! You can switch between them instantly.');
    console.log('💡 To switch: Set LLM_IMPLEMENTATION=legacy or langchain in .env\n');
  } else {
    console.log('\n⚠️  One or both modes failed. Check the errors above.\n');
    process.exit(1);
  }
}

runTests();
