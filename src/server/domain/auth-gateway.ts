export interface AuthGatewayClientConfig {
  endpoint: string;
  projectId: string;
}

export interface AuthGateway {
  isConfigured(): boolean;
  getClientConfig(): AuthGatewayClientConfig | undefined;
}
