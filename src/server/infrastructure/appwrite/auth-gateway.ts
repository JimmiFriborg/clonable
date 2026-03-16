import type { AuthGateway } from "@/server/domain/auth-gateway";
import { getAppwritePublicConfig } from "@/server/infrastructure/appwrite/config";

export const appwriteAuthGateway: AuthGateway = {
  isConfigured() {
    return Boolean(getAppwritePublicConfig());
  },

  getClientConfig() {
    return getAppwritePublicConfig();
  },
};
