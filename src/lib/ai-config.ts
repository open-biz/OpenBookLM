export interface ModelConfig {
  id: string;
  name: string;
  provider: 'cerebras' | 'llama' | 'openai';
  maxTokens: number;
  contextWindow: number;
  description?: string;
  capabilities?: string[];
}

export const AVAILABLE_MODELS: ModelConfig[] = [
  {
    id: 'llama3.1-8b',
    name: 'Llama 3.1 8B',
    provider: 'llama',
    maxTokens: 8192,
    contextWindow: 8192,
    description: 'A powerful 8B parameter model for general-purpose use',
    capabilities: [
      'Technical documentation',
      'Code analysis',
      'Business writing',
      'Creative writing',
    ],
  }
];

export const DEFAULT_MODEL = AVAILABLE_MODELS[0];

export const getModelById = (modelId: string): ModelConfig | undefined => {
  return AVAILABLE_MODELS.find(model => model.id === modelId);
};

export const getModelsByProvider = (provider: ModelConfig['provider']): ModelConfig[] => {
  return AVAILABLE_MODELS.filter(model => model.provider === provider);
};

// Model-specific settings
export const MODEL_SETTINGS = {
  temperature: 0.7,
} as const;
