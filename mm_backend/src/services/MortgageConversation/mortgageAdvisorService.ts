import { PromptTemplate, MortgageData, ConversationContext, PromptTemplateType } from './prompts/prompt_scripts/PromptTemplate';

export type AdvisorMode = 'data_gathering' | 'analysis' | 'followup';

export interface AdvisorSession {
  mode: AdvisorMode;
  mortgageData: Partial<MortgageData>;
  conversationHistory: string[];
  lastAnalysis?: string;
  completenessScore: number; // 0-100, how much data we have
}

export class MortgageAdvisorService {
  
  // Determine which fields are required for a complete analysis
  private static readonly REQUIRED_FIELDS: (keyof MortgageData)[] = [
    'propertyLocation',
    'propertyType', 
    'propertyValue',
    'currentBalance',
    'monthlyPayment',
    'annualIncome',
    'currentRate',
  ];

  private static readonly IMPORTANT_FIELDS: (keyof MortgageData)[] = [
    'currentLender',
    'mortgageType',
    'termRemaining',
    'employmentStatus',
    'primaryObjective'
  ];

  static hasAllRequiredData(mortgageData: Partial<MortgageData>): boolean {
    // Check that ALL required fields are present and valid
    for (const field of this.REQUIRED_FIELDS) {
      const value = mortgageData[field];
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        return false;
      }
    }
    return true;
  }

  static calculateCompleteness(mortgageData: Partial<MortgageData>): number {
    // Simple calculation for UI display purposes only
    let score = 0;
    const allFields = [...this.REQUIRED_FIELDS, ...this.IMPORTANT_FIELDS];
    
    for (const field of allFields) {
      if (mortgageData[field]) {
        score++;
      }
    }

    return Math.round((score / allFields.length) * 100);
  }

  static determineAdvisorMode(
    mortgageData: Partial<MortgageData>,
    hasRequestedAnalysis: boolean = false,
    hasPreviousAnalysis: boolean = false
  ): AdvisorMode {
    // If we have a previous analysis and user is asking follow-up questions
    if (hasPreviousAnalysis) {
      return 'followup';
    }
    
    // Only move to analysis if we have ALL required data AND user requested it
    if (this.hasAllRequiredData(mortgageData) && hasRequestedAnalysis) {
      return 'analysis';
    }
    
    // Default: stay in data gathering mode until all required data is collected
    return 'data_gathering';
  }

  static identifyMissingCriticalData(mortgageData: Partial<MortgageData>): string[] {
    const missing: string[] = [];
    
    // Check all required fields
    if (!mortgageData.propertyLocation) missing.push('Property location');
    if (!mortgageData.propertyType) missing.push('Property type');
    if (!mortgageData.propertyValue) missing.push('Current property value');
    if (!mortgageData.currentBalance) missing.push('Outstanding mortgage balance');
    if (!mortgageData.monthlyPayment) missing.push('Current monthly payment');
    if (!mortgageData.annualIncome) missing.push('Annual household income');
    
    return missing;
  }

  static async generateContextualPrompt(
    session: AdvisorSession,
    currentUserMessage: string,
    hasRequestedAnalysis: boolean = false
  ): Promise<string> {
    
    const mode = this.determineAdvisorMode(
      session.mortgageData, 
      hasRequestedAnalysis, 
      !!session.lastAnalysis
    );
    let templateType: PromptTemplateType;
    
    const context: ConversationContext = {
      collectedData: session.mortgageData,
      conversationStage: this.getConversationStage(session),
      lastMessage: currentUserMessage,
      conversationHistory: session.conversationHistory,
      currentPriority: this.getCurrentPriority(session),
      previousAnalysis: session.lastAnalysis,
      currentQuestion: currentUserMessage
    };

    switch (mode) {
      case 'data_gathering':
        templateType = 'data_gathering';
        break;
      case 'analysis':
        templateType = 'mortgage_analysis';
        break;
      case 'followup':
        templateType = 'analysis_followup';
        context.keyRecommendations = this.extractRecommendations(session.lastAnalysis);
        break;
    }

    return await PromptTemplate.generatePrompt(
      templateType,
      session.mortgageData,
      context
    );
  }

  static getConversationStage(session: AdvisorSession): string {
    const missing = this.identifyMissingCriticalData(session.mortgageData);
    
    if (missing.length === this.REQUIRED_FIELDS.length) {
      return 'Initial consultation - gathering basic information';
    } else if (missing.length > 3) {
      return 'Building understanding of current mortgage situation';
    } else if (missing.length > 0) {
      return 'Collecting final required details for analysis';
    } else if (session.lastAnalysis) {
      return 'Post-analysis discussion and clarification';
    } else {
      return 'All required data collected - ready for analysis';
    }
  }

  static getCurrentPriority(session: AdvisorSession): string {
    const missing = this.identifyMissingCriticalData(session.mortgageData);
    
    if (missing.length > 3) {
      return 'Establishing basic property and mortgage details';
    } else if (missing.length > 0) {
      return `Collecting required information: ${missing.join(', ')}`;
    } else if (!session.mortgageData.primaryObjective) {
      return 'Understanding client goals and objectives';
    } else {
      return 'All required data collected - ready for analysis on request';
    }
  }

  private static extractRecommendations(analysis?: string): string[] {
    if (!analysis) return [];
    
    // Simple extraction of bullet points or numbered lists from analysis
    const lines = analysis.split('\n');
    const recommendations: string[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.match(/^[-•*]\s/) || trimmed.match(/^\d+\.\s/)) {
        recommendations.push(trimmed);
      }
    }
    
    return recommendations.slice(0, 5); // Top 5 recommendations
  }

  static isRequestingAnalysis(userMessage: string): boolean {
    const analysisKeywords = [
      'analyze', 'analysis', 'recommend', 'advice', 'what should i do',
      'help me decide', 'best option', 'compare', 'should i switch',
      'remortgage', 'better deal', 'save money', 'calculate'
    ];
    
    const lowerMessage = userMessage.toLowerCase();
    return analysisKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  static createInitialSession(): AdvisorSession {
    return {
      mode: 'data_gathering',
      mortgageData: {},
      conversationHistory: [],
      completenessScore: 0
    };
  }

  static updateSessionWithUserInput(
    session: AdvisorSession,
    userMessage: string,
    extractedData?: Partial<MortgageData>
  ): AdvisorSession {
    
    const updatedData = { ...session.mortgageData, ...extractedData };
    const updatedHistory = [...session.conversationHistory, `User: ${userMessage}`];
    
    return {
      ...session,
      mortgageData: updatedData,
      conversationHistory: updatedHistory,
      completenessScore: this.calculateCompleteness(updatedData)
    };
  }

  static updateSessionWithAIResponse(
    session: AdvisorSession,
    aiResponse: string,
    isAnalysis: boolean = false
  ): AdvisorSession {
    
    const updatedHistory = [...session.conversationHistory, `AI: ${aiResponse}`];
    
    return {
      ...session,
      conversationHistory: updatedHistory,
      lastAnalysis: isAnalysis ? aiResponse : session.lastAnalysis,
      mode: isAnalysis ? 'followup' : session.mode
    };
  }
}