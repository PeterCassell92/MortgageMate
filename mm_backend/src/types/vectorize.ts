export interface VectorizeConfig {
  url: string;
  organizationId: string;
  apiKey: string;
  pipelineId: string;
}

export interface VectorizeSearchOptions {
  query: string;
  top_k?: number;
  rerank?: {
    enabled: boolean;
    top_n: number;
    model?: string;
  };
  filters?: Record<string, any>;
}

export interface VectorizeDocument {
  id: string;
  content: any;
  metadata?: Record<string, any>;
  score?: number;
}

export interface VectorSearchResult {
  success: boolean;
  documents: VectorizeDocument[];
  searchQuery: string;
  totalFound: number;
  processingTime?: number;
}

export interface MortgageProduct {
  provider_name: string;
  product_name: string;
  rate: number;
  rate_type: 'fixed' | 'variable' | 'tracker';
  ltv_min: number;
  ltv_max: number;
  product_fee: number;
  exit_fees: string;
  terms: string;
  description: string;
  initial_period_months: number | null;
  reversion_rate: number | null;
  max_loan: number;
  min_loan: number;
  tracker_margin?: number;
  cashback?: number;
  scheme?: string;
  special_criteria?: string;
  property_type?: string;
  offset?: boolean;
  ethical?: boolean;
  region_specific?: string;
  professional_mortgage?: boolean;
  digital_only?: boolean;
  exclusive?: boolean;
  flexible_features?: string[];
  _score?: number; // Relevance score from Vectorize
}

export interface MarketData {
  products: MortgageProduct[];
  searchQuery: string;
  averageRates: {
    twoYearFixed?: number;
    fiveYearFixed?: number;
    tracker?: number;
    variable?: number;
  };
  bestRates: {
    twoYearFixed?: MortgageProduct;
    fiveYearFixed?: MortgageProduct;
    tracker?: MortgageProduct;
    variable?: MortgageProduct;
  };
  timestamp: Date;
}