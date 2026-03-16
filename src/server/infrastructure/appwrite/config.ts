export interface AppwriteConfig {
  endpoint: string;
  projectId: string;
  apiKey: string;
  databaseId: string;
}

export function getAppwriteConfig(): AppwriteConfig | undefined {
  const endpoint = process.env.CLONABLE_APPWRITE_ENDPOINT?.trim();
  const projectId = process.env.CLONABLE_APPWRITE_PROJECT_ID?.trim();
  const apiKey = process.env.CLONABLE_APPWRITE_API_KEY?.trim();
  const databaseId = process.env.CLONABLE_APPWRITE_DATABASE_ID?.trim();

  if (!endpoint || !projectId || !apiKey || !databaseId) {
    return undefined;
  }

  return {
    endpoint,
    projectId,
    apiKey,
    databaseId,
  };
}

export function appwriteEnabled() {
  return Boolean(getAppwriteConfig());
}

export function getAppwritePublicConfig() {
  const endpoint =
    process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT?.trim() ??
    process.env.CLONABLE_APPWRITE_ENDPOINT?.trim();
  const projectId =
    process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID?.trim() ??
    process.env.CLONABLE_APPWRITE_PROJECT_ID?.trim();

  if (!endpoint || !projectId) {
    return undefined;
  }

  return {
    endpoint,
    projectId,
  };
}
