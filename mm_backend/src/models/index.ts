/**
 * Barrel file for all models
 * Re-exports database models and shared types
 */

// Database models
export * from './User';
export * from './Chat';
// export * from './ChatModel'; // Legacy - ChatModel is exported from Chat.ts
export * from './Message';
export * from './LLMRequest';
export * from './LLMResponse';

// Shared types from mm_backend/models (MortgageData, etc.)
export type {
  MortgageData,
  MinimalMortgageData,
  MortgageAnalysisResult
} from '../../models';

export {
  isMinimalMortgageData
} from '../../models';
