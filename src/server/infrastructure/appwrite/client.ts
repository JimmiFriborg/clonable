import { Client, Databases, Users } from "node-appwrite";

import { getAppwriteConfig } from "@/server/infrastructure/appwrite/config";

export interface AppwriteAdminClients {
  databases: Databases;
  users: Users;
}

let appwriteAdminClients: AppwriteAdminClients | undefined;

export function getAppwriteAdminClients(): AppwriteAdminClients | undefined {
  const config = getAppwriteConfig();

  if (!config) {
    return undefined;
  }

  if (!appwriteAdminClients) {
    const client = new Client()
      .setEndpoint(config.endpoint)
      .setProject(config.projectId)
      .setKey(config.apiKey);

    appwriteAdminClients = {
      databases: new Databases(client),
      users: new Users(client),
    };
  }

  return appwriteAdminClients;
}
