#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { createVectorizeService } from '../src/services/vectorizeService';
import { MortgageProduct } from '../src/types/vectorize';

const SAMPLE_DATA_DIR = path.join(__dirname, '../../sample mortgage rate data');

async function uploadMortgageData() {
  console.log('🏠 MortgageMate - Uploading Sample Mortgage Data to Vectorize');
  console.log('='.repeat(60));

  // Check if Vectorize service is configured
  const vectorizeService = createVectorizeService();
  if (!vectorizeService) {
    console.error('❌ Vectorize service not configured');
    console.log('Please ensure all required environment variables are set:');
    console.log('  - VECTORIZE_URL');
    console.log('  - VECTORIZE_ORGANIZATION_ID');
    console.log('  - VECTORIZE_API_KEY');
    console.log('  - VECTORIZE_PIPELINE_ID');
    process.exit(1);
  }

  // Check if sample data directory exists
  if (!fs.existsSync(SAMPLE_DATA_DIR)) {
    console.error(`❌ Sample data directory not found: ${SAMPLE_DATA_DIR}`);
    console.log('Please ensure the sample mortgage rate data has been generated');
    process.exit(1);
  }

  try {
    // Read all JSON files from the sample data directory
    console.log(`📂 Reading JSON files from: ${SAMPLE_DATA_DIR}`);
    const files = fs.readdirSync(SAMPLE_DATA_DIR).filter(file => file.endsWith('.json'));

    if (files.length === 0) {
      console.error('❌ No JSON files found in sample data directory');
      process.exit(1);
    }

    console.log(`📊 Found ${files.length} JSON files to upload`);

    // Load all mortgage products
    const products: MortgageProduct[] = [];
    for (const file of files) {
      const filePath = path.join(SAMPLE_DATA_DIR, file);
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const product = JSON.parse(content) as MortgageProduct;
        products.push(product);
        console.log(`✅ Loaded: ${product.provider_name} - ${product.product_name}`);
      } catch (error) {
        console.error(`❌ Failed to load ${file}:`, error instanceof Error ? error.message : 'Unknown error');
      }
    }

    if (products.length === 0) {
      console.error('❌ No valid mortgage products loaded');
      process.exit(1);
    }

    console.log(`\n🔄 Uploading ${products.length} products to Vectorize...`);

    // Upload to Vectorize
    const result = await vectorizeService.uploadDocuments(products);

    if (result.success) {
      console.log(`✅ ${result.message}`);
      console.log('\n🎉 Upload completed successfully!');
      console.log('\n💡 You can now use the mortgage market search functionality in your application.');
    } else {
      console.error(`❌ Upload failed: ${result.message}`);
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Upload process failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// Add a clear option to delete existing data
async function clearVectorizeData() {
  console.log('🗑️  Clearing Vectorize data...');
  console.log('\n⚠️  Document deletion via the official Vectorize client is not yet implemented.');
  console.log('Please use the Vectorize dashboard to manage your documents.');
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--clear')) {
  clearVectorizeData()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Clear operation failed:', error);
      process.exit(1);
    });
} else if (args.includes('--help')) {
  console.log(`
🏠 MortgageMate - Vectorize Upload Script

Usage:
  yarn upload-mortgage-data          Upload sample mortgage data
  yarn upload-mortgage-data --clear  Clear existing data first
  yarn upload-mortgage-data --help   Show this help

Description:
  This script uploads the sample mortgage data JSON files to Vectorize
  for use with the RAG-enhanced mortgage analysis system.

Prerequisites:
  - VECTORIZE_API_KEY must be set in .env
  - VECTORIZE_ORGANIZATION_ID and VECTORIZE_PIPELINE_ID for searches
  - Sample mortgage data must exist in /sample mortgage rate data/

Examples:
  yarn upload-mortgage-data
  yarn upload-mortgage-data --clear
  `);
} else {
  uploadMortgageData()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Upload operation failed:', error);
      process.exit(1);
    });
}