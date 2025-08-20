/**
 * Shared MortgageData interface used across frontend and backend
 * This ensures type consistency for mortgage information processing
 */
export interface MortgageData {
  // Property Information
  propertyLocation?: string;
  propertyType?: string;
  propertyValue?: number;
  propertyUse?: string;

  // Current Mortgage
  currentLender?: string;
  mortgageType?: string;
  currentBalance?: number;
  monthlyPayment?: number;
  currentRate?: number;
  termRemaining?: number;
  productEndDate?: string;
  exitFees?: string;
  earlyRepaymentCharges?: string;

  // Financial Situation
  annualIncome?: number;
  employmentStatus?: string;
  creditScore?: string;
  existingDebts?: number;
  disposableIncome?: number;
  availableDeposit?: number;

  // Goals & Preferences
  primaryObjective?: string;
  riskTolerance?: string;
  preferredTerm?: number;
  paymentPreference?: string;
  timeline?: string;

  // Additional Context
  additionalContext?: string;
  documentsSummary?: string;
}

// Note: Use Partial<MortgageData> directly instead of creating a separate type
// This is more idiomatic TypeScript and clearer to understand

/**
 * Required fields for basic mortgage analysis
 */
export interface MinimalMortgageData extends Pick<MortgageData, 
  'currentBalance' | 'monthlyPayment' | 'currentRate' | 'termRemaining'
> {
  currentBalance: number;
  monthlyPayment: number;
  currentRate: number;
  termRemaining: number;
}

/**
 * Type guard to check if mortgage data has minimum required fields
 */
export function isMinimalMortgageData(data: Partial<MortgageData>): data is MinimalMortgageData {
  return !!(
    data.currentBalance &&
    data.monthlyPayment &&
    data.currentRate &&
    data.termRemaining
  );
}

/**
 * Mortgage analysis result interface
 */
export interface MortgageAnalysisResult {
  recommendation: string;
  potentialSavings?: number;
  bestTimeToSwitch?: string;
  riskFactors?: string[];
  nextSteps?: string[];
  confidence: number;
}