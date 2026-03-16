export const aiProviderOrder = ["openai", "anthropic", "gemini"] as const;
export type AiProvider = (typeof aiProviderOrder)[number];

export interface AgentProviderSelection {
  provider: AiProvider;
  model: string;
  fallbackProviders: Array<{
    provider: AiProvider;
    model: string;
  }>;
}

export interface ProviderConfigResponse {
  providers: Array<{
    provider: AiProvider;
    configured: boolean;
    defaultModel: string;
  }>;
}
