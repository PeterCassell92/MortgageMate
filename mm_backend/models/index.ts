/**
 * Shared models and types for MortgageMate application
 * Used by both frontend and backend to ensure type consistency
 */

// Mortgage data models
export type {
  MortgageData,
  MinimalMortgageData,
  MortgageAnalysisResult
} from './MortgageData';

export {
  isMinimalMortgageData
} from './MortgageData';

// TODO: Add more shared types as needed
// - User types
// - Chat types  
// - Document types
// - API response types