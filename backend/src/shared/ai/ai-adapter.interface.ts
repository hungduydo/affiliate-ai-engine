export interface ProductInput {
  name: string;
  description?: string;
  price?: number;
  commission?: number;
  affiliateLink: string;
}

export interface ProductDNA {
  coreProblem: string;
  keyFeatures: Array<{ feature: string; emotionalBenefit: string }>;
  targetPersona: { demographics: string; psychographics: string };
  objectionHandling: Array<{ objection: string; counter: string }>;
  visualAnchors: string[];
}

export interface GeneratedContent {
  title: string;
  body: string;
}

export interface AIAdapter {
  extractProductDNA(product: ProductInput): Promise<ProductDNA>;
  generate(prompt: string): Promise<GeneratedContent>;
  generateWithDNA(prompt: string, dna: ProductDNA): Promise<GeneratedContent>;
}

export const AI_ADAPTER = Symbol('AI_ADAPTER');
