import { z } from 'zod';

/**
 * Zod schema for extracting structured mortgage data from LLM responses
 * This matches the MortgageData interface but focuses on extractable fields
 *
 * Used with LangChain's .withStructuredOutput() for guaranteed valid data extraction
 */
export const MortgageDataExtractionSchema = z.object({
  // Property Information
  propertyLocation: z.string().optional().describe("City or area where the property is located"),
  propertyType: z.string().optional().describe("Type of property: house, flat, apartment, etc."),
  propertyValue: z.number().optional().describe("Current estimated market value of the property in pounds"),
  propertyUse: z.string().optional().describe("How property is used: main residence, buy-to-let, second home"),

  // Current Mortgage
  currentLender: z.string().optional().describe("Name of current mortgage lender"),
  mortgageType: z.string().optional().describe("Type of mortgage: fixed, variable, tracker, discount"),
  currentBalance: z.number().optional().describe("Outstanding mortgage balance in pounds"),
  monthlyPayment: z.number().optional().describe("Current monthly mortgage payment in pounds"),
  currentRate: z.number().optional().describe("Current interest rate as a percentage (e.g., 5.35 for 5.35%)"),
  termRemaining: z.number().optional().describe("Remaining mortgage term in years"),
  productEndDate: z.string().optional().describe("When current mortgage deal/product ends"),
  exitFees: z.string().optional().describe("Exit fees or early repayment charges description"),
  earlyRepaymentCharges: z.string().optional().describe("Details of early repayment charge structure"),

  // Financial Situation
  annualIncome: z.number().optional().describe("Total annual household income in pounds. ONLY include if explicitly provided - omit entirely if unknown."),
  employmentStatus: z.string().optional().describe("Employment status: employed, self-employed, retired, etc. ONLY include if explicitly provided - omit entirely if unknown."),
  creditScore: z.string().optional().describe("Credit score range or rating. ONLY include if explicitly provided - omit entirely if unknown."),
  existingDebts: z.number().optional().describe("Total other debts excluding mortgage in pounds. ONLY include if explicitly provided - omit entirely if unknown, do NOT use placeholder strings like '<UNKNOWN>'."),
  disposableIncome: z.number().optional().describe("Monthly disposable income in pounds. ONLY include if explicitly provided - omit entirely if unknown, do NOT use placeholder strings like '<UNKNOWN>'."),
  availableDeposit: z.number().optional().describe("Additional deposit available for remortgaging in pounds. ONLY include if explicitly provided - omit entirely if unknown, do NOT use placeholder strings like '<UNKNOWN>'."),

  // Goals & Preferences
  primaryObjective: z.string().optional().describe("Main goal: lower payments, reduce term, cash out equity, etc. ONLY include if explicitly provided - omit entirely if unknown."),
  riskTolerance: z.string().optional().describe("Risk appetite: low, medium, high. ONLY include if explicitly provided - omit entirely if unknown."),
  preferredTerm: z.number().optional().describe("Preferred mortgage term length in years. ONLY include if explicitly provided - omit entirely if unknown, do NOT use placeholder strings like '<UNKNOWN>'."),
  paymentPreference: z.string().optional().describe("Payment preference: minimize monthly, minimize total cost, flexibility. ONLY include if explicitly provided - omit entirely if unknown."),
  timeline: z.string().optional().describe("Timeline for changes: urgent, flexible, specific date"),

  // Additional Context
  additionalContext: z.string().optional().describe("Any other relevant context or information"),
  documentsSummary: z.string().optional().describe("Summary of uploaded documents"),
});

/**
 * Type inference from the Zod schema
 */
export type MortgageDataExtraction = z.infer<typeof MortgageDataExtractionSchema>;

/**
 * Wrapper schema for the complete response including both conversation and extracted data
 */
export const ConversationalResponseWithDataSchema = z.object({
  response: z.string().describe("Natural, conversational response to the user"),
  // Accept either object or string (for Anthropic's tool calling quirk), we'll parse strings in post-processing
  extractedData: z.union([
    MortgageDataExtractionSchema,
    z.string()
  ]).describe("A JSON OBJECT containing structured data extracted from this conversation. CRITICAL RULES: 1) Return as an actual object with the fields defined in the schema. 2) ONLY include fields where the user explicitly provided information. 3) Completely OMIT any fields that are unknown - do NOT include them at all. 4) For number fields, use actual numbers or omit them entirely."),
  proceedWithAnalysis: z.boolean().describe("Set to TRUE if the user is requesting, confirming, or agreeing to proceed with a comprehensive mortgage analysis (e.g., 'yes', 'proceed', 'analyze', 'do it', 'go ahead', 'please analyze'). Set to FALSE otherwise. This should be TRUE when the user gives affirmative consent to start the analysis."),
  reasoning: z.string().optional().describe("Brief internal reasoning about what data was extracted (not shown to user)")
});

export type ConversationalResponseWithData = z.infer<typeof ConversationalResponseWithDataSchema>;
