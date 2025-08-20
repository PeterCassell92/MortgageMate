import fs from 'fs';
import path from 'path';
// Import shared MortgageData interface from models
import type { MortgageData } from '@mortgagemate/models';

export interface ConversationContext {
  collectedData?: Partial<MortgageData>;
  conversationStage?: string;
  lastMessage?: string;
  currentPriority?: string;
  conversationHistory?: string[];
  previousAnalysis?: string;
  keyRecommendations?: string[];
  clientGoals?: string;
  currentQuestion?: string;
  newInformation?: string;
  currentFocus?: string;
  decisionPoints?: string[];
  nextActions?: string[];
}

export type PromptTemplateType = 'mortgage_analysis' | 'data_gathering' | 'analysis_followup';

export class PromptTemplate {
  private static readonly TEMPLATES_DIR = path.join(__dirname, '..', 'prompt_templates');
  private static readonly OUTPUT_DIR = path.join(__dirname, '..', 'prompt_output');

  static async generatePrompt(
    templateType: PromptTemplateType,
    mortgageData?: MortgageData,
    conversationContext?: ConversationContext
  ): Promise<string> {
    // Ensure output directory exists
    if (!fs.existsSync(this.OUTPUT_DIR)) {
      fs.mkdirSync(this.OUTPUT_DIR, { recursive: true });
    }

    // Load template
    const templatePath = path.join(this.TEMPLATES_DIR, `${templateType}.txt`);
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template not found: ${templateType}`);
    }

    let template = fs.readFileSync(templatePath, 'utf-8');

    // Replace mortgage data placeholders
    if (mortgageData) {
      template = this.replaceMortgageDataPlaceholders(template, mortgageData);
    }

    // Replace conversation context placeholders
    if (conversationContext) {
      template = this.replaceConversationPlaceholders(template, conversationContext);
    }

    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFilename = `${templateType}_${timestamp}.txt`;
    const outputPath = path.join(this.OUTPUT_DIR, outputFilename);

    // Save personalized prompt
    fs.writeFileSync(outputPath, template, 'utf-8');

    return template;
  }

  private static replaceMortgageDataPlaceholders(template: string, data: MortgageData): string {
    const replacements: { [key: string]: string } = {
      '{{PROPERTY_LOCATION}}': data.propertyLocation || 'Not specified',
      '{{PROPERTY_TYPE}}': data.propertyType || 'Not specified',
      '{{PROPERTY_VALUE}}': data.propertyValue ? `£${data.propertyValue.toLocaleString()}` : 'Not specified',
      '{{PROPERTY_USE}}': data.propertyUse || 'Not specified',
      '{{CURRENT_LENDER}}': data.currentLender || 'Not specified',
      '{{MORTGAGE_TYPE}}': data.mortgageType || 'Not specified',
      '{{CURRENT_BALANCE}}': data.currentBalance ? `£${data.currentBalance.toLocaleString()}` : 'Not specified',
      '{{MONTHLY_PAYMENT}}': data.monthlyPayment ? `£${data.monthlyPayment.toLocaleString()}` : 'Not specified',
      '{{CURRENT_RATE}}': data.currentRate ? `${data.currentRate}%` : 'Not specified',
      '{{TERM_REMAINING}}': data.termRemaining ? `${data.termRemaining} years` : 'Not specified',
      '{{PRODUCT_END_DATE}}': data.productEndDate || 'Not specified',
      '{{EXIT_FEES}}': data.exitFees || 'Not specified',
      '{{EARLY_REPAYMENT_CHARGES}}': data.earlyRepaymentCharges || 'Not specified',
      '{{ANNUAL_INCOME}}': data.annualIncome ? `£${data.annualIncome.toLocaleString()}` : 'Not specified',
      '{{EMPLOYMENT_STATUS}}': data.employmentStatus || 'Not specified',
      '{{CREDIT_SCORE}}': data.creditScore || 'Not specified',
      '{{EXISTING_DEBTS}}': data.existingDebts ? `£${data.existingDebts.toLocaleString()}` : 'Not specified',
      '{{DISPOSABLE_INCOME}}': data.disposableIncome ? `£${data.disposableIncome.toLocaleString()}` : 'Not specified',
      '{{AVAILABLE_DEPOSIT}}': data.availableDeposit ? `£${data.availableDeposit.toLocaleString()}` : 'Not specified',
      '{{PRIMARY_OBJECTIVE}}': data.primaryObjective || 'Not specified',
      '{{RISK_TOLERANCE}}': data.riskTolerance || 'Not specified',
      '{{PREFERRED_TERM}}': data.preferredTerm ? `${data.preferredTerm} years` : 'Not specified',
      '{{PAYMENT_PREFERENCE}}': data.paymentPreference || 'Not specified',
      '{{TIMELINE}}': data.timeline || 'Not specified',
      '{{ADDITIONAL_CONTEXT}}': data.additionalContext || 'None provided',
      '{{DOCUMENTS_SUMMARY}}': data.documentsSummary || 'No documents provided'
    };

    let result = template;
    for (const [placeholder, value] of Object.entries(replacements)) {
      result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
    }

    return result;
  }

  private static replaceConversationPlaceholders(template: string, context: ConversationContext): string {
    const replacements: { [key: string]: string } = {
      '{{COLLECTED_DATA}}': this.formatCollectedData(context.collectedData),
      '{{CONVERSATION_STAGE}}': context.conversationStage || 'Initial consultation',
      '{{LAST_MESSAGE}}': context.lastMessage || 'No previous message',
      '{{CURRENT_PRIORITY}}': context.currentPriority || 'Gathering basic property and mortgage information',
      '{{CONVERSATION_HISTORY}}': context.conversationHistory?.join('\n') || 'No previous conversation',
      '{{PREVIOUS_ANALYSIS}}': context.previousAnalysis || 'No previous analysis available',
      '{{KEY_RECOMMENDATIONS}}': context.keyRecommendations?.join('; ') || 'No recommendations made yet',
      '{{CLIENT_GOALS}}': context.clientGoals || 'Not yet established',
      '{{CURRENT_QUESTION}}': context.currentQuestion || 'No specific question',
      '{{NEW_INFORMATION}}': context.newInformation || 'No new information provided',
      '{{CURRENT_FOCUS}}': context.currentFocus || 'General mortgage review',
      '{{DECISION_POINTS}}': context.decisionPoints?.join('; ') || 'No major decisions pending',
      '{{NEXT_ACTIONS}}': context.nextActions?.join('; ') || 'Continue information gathering'
    };

    let result = template;
    for (const [placeholder, value] of Object.entries(replacements)) {
      result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
    }

    return result;
  }

  private static formatCollectedData(data?: Partial<MortgageData>): string {
    if (!data) return 'No data collected yet';

    const collected: string[] = [];
    
    if (data.propertyLocation) collected.push(`Property: ${data.propertyLocation}`);
    if (data.propertyValue) collected.push(`Value: £${data.propertyValue.toLocaleString()}`);
    if (data.currentLender) collected.push(`Lender: ${data.currentLender}`);
    if (data.monthlyPayment) collected.push(`Payment: £${data.monthlyPayment}`);
    if (data.annualIncome) collected.push(`Income: £${data.annualIncome.toLocaleString()}`);

    return collected.length > 0 ? collected.join('; ') : 'Basic information being gathered';
  }

  static async getGeneratedPrompts(): Promise<string[]> {
    if (!fs.existsSync(this.OUTPUT_DIR)) {
      return [];
    }

    const files = fs.readdirSync(this.OUTPUT_DIR);
    return files.filter(file => file.endsWith('.txt')).sort().reverse(); // Most recent first
  }

  static async readGeneratedPrompt(filename: string): Promise<string> {
    const filePath = path.join(this.OUTPUT_DIR, filename);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Generated prompt not found: ${filename}`);
    }

    return fs.readFileSync(filePath, 'utf-8');
  }
}