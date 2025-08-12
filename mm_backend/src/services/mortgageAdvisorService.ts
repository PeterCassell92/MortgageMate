import { PromptTemplate, MortgageData, ConversationContext, PromptTemplateType } from '../prompts/prompt_scripts/PromptTemplate';

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
    'annualIncome'
  ];

  private static readonly IMPORTANT_FIELDS: (keyof MortgageData)[] = [
    'currentLender',
    'mortgageType',
    'currentRate',
    'termRemaining',
    'employmentStatus',
    'primaryObjective'
  ];

  static calculateCompleteness(mortgageData: Partial<MortgageData>): number {
    let score = 0;
    let totalPossible = 0;

    // Required fields are worth more points
    for (const field of this.REQUIRED_FIELDS) {
      totalPossible += 10;
      if (mortgageData[field]) {
        score += 10;
      }
    }

    // Important fields are worth fewer points
    for (const field of this.IMPORTANT_FIELDS) {
      totalPossible += 5;
      if (mortgageData[field]) {
        score += 5;
      }
    }

    return Math.round((score / totalPossible) * 100);
  }

  static determineAdvisorMode(
    mortgageData: Partial<MortgageData>,
    hasRequestedAnalysis: boolean = false
  ): AdvisorMode {
    const completeness = this.calculateCompleteness(mortgageData);
    
    // If user specifically requested analysis or we have enough data (75%+)
    if (hasRequestedAnalysis || completeness >= 75) {
      return 'analysis';
    }
    
    // If we have some data but user is asking follow-up questions after analysis
    if (completeness >= 50) {
      // This would be determined by checking if there's been a previous analysis
      return 'data_gathering'; // Default to gathering more data
    }

    return 'data_gathering';
  }

  static identifyMissingCriticalData(mortgageData: Partial<MortgageData>): string[] {
    const missing: string[] = [];
    
    if (!mortgageData.propertyLocation) missing.push('Property location');
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
    
    const mode = this.determineAdvisorMode(session.mortgageData, hasRequestedAnalysis);
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

  private static getConversationStage(session: AdvisorSession): string {
    const completeness = this.calculateCompleteness(session.mortgageData);
    
    if (completeness < 25) return 'Initial consultation - gathering basic information';
    if (completeness < 50) return 'Building understanding of current mortgage situation';
    if (completeness < 75) return 'Collecting final details for comprehensive analysis';
    if (session.lastAnalysis) return 'Post-analysis discussion and clarification';
    
    return 'Ready for detailed mortgage analysis';
  }

  private static getCurrentPriority(session: AdvisorSession): string {
    const missing = this.identifyMissingCriticalData(session.mortgageData);
    
    if (missing.length > 3) {
      return 'Establishing basic property and mortgage details';
    } else if (missing.length > 0) {
      return `Collecting final critical information: ${missing.join(', ')}`;
    } else if (!session.mortgageData.primaryObjective) {
      return 'Understanding client goals and objectives';
    } else if (session.completenessScore < 75) {
      return 'Gathering additional context for comprehensive analysis';
    } else {
      return 'Ready to proceed with detailed mortgage analysis';
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