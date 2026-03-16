export const aiProviderOrder = ["openai", "anthropic", "gemini"] as const;
export type AiProvider = (typeof aiProviderOrder)[number];
export const agentRuntimeBackendOrder = ["openclaw", "provider"] as const;
export type AgentRuntimeBackend = (typeof agentRuntimeBackendOrder)[number];
export const chatBackendOrder = ["provider", "openclaw"] as const;
export type ChatBackend = (typeof chatBackendOrder)[number];

export interface AgentProviderFallback {
  provider: AiProvider;
  model: string;
}

export interface AgentProviderSelection {
  provider: AiProvider;
  model: string;
  fallbackProviders: AgentProviderFallback[];
}

export interface ProviderConfigResponse {
  providers: Array<{
    provider: AiProvider;
    configured: boolean;
    defaultModel: string;
  }>;
}

export interface ProviderSelection {
  provider: AiProvider;
  model: string;
  configured: boolean;
}
