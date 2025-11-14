/**
 * Type validation file to ensure Zod schema matches MortgageData interface
 * This file is for compile-time type checking only
 */

import type { MortgageData } from '../models/';
import type { MortgageDataExtraction } from './mortgageDataSchema';

// Test 1: Verify MortgageDataExtraction is assignable to Partial<MortgageData>
type Test1 = MortgageDataExtraction extends Partial<MortgageData> ? true : false;
const test1: Test1 = true; // Should compile without error

// Test 2: Verify we can assign extracted data to MortgageData
const testExtractedData: MortgageDataExtraction = {
  propertyLocation: "Cambridge",
  propertyValue: 500000,
  currentRate: 5.35,
  monthlyPayment: 1500
};

const testMortgageData: Partial<MortgageData> = testExtractedData;

// Test 3: Verify all REQUIRED_FIELDS from MortgageAdvisorService exist in schema
const REQUIRED_FIELDS: (keyof MortgageData)[] = [
  'propertyLocation',
  'propertyType',
  'propertyValue',
  'currentBalance',
  'monthlyPayment',
  'annualIncome',
  'currentRate',
];

// This will fail to compile if any required field is missing from MortgageDataExtraction
REQUIRED_FIELDS.forEach(field => {
  const value: MortgageDataExtraction[typeof field] = undefined;
});

// Test 4: Verify all IMPORTANT_FIELDS exist
const IMPORTANT_FIELDS: (keyof MortgageData)[] = [
  'currentLender',
  'mortgageType',
  'termRemaining',
  'employmentStatus',
  'primaryObjective'
];

IMPORTANT_FIELDS.forEach(field => {
  const value: MortgageDataExtraction[typeof field] = undefined;
});

// Test 5: Field comparison - all MortgageData fields should be in MortgageDataExtraction
type AllMortgageDataFields = keyof MortgageData;
type AllExtractionFields = keyof MortgageDataExtraction;

// This type should be 'never' if all fields match
type MissingFromExtraction = Exclude<AllMortgageDataFields, AllExtractionFields>;
const ensureNoMissingFields: MissingFromExtraction extends never ? true : false = true;

// Test 6: Type compatibility with merge operation (as used in chat.ts)
function testMerge(
  currentData: Partial<MortgageData>,
  extractedData: MortgageDataExtraction
): Partial<MortgageData> {
  return { ...currentData, ...extractedData };
}

console.log('✅ All type validations passed!');
console.log('Zod schema is fully compatible with MortgageData interface');

export {};
