import { loadLocalEnv } from "@/scripts/load-local-env";
import { ensureAppwriteCollections } from "@/server/infrastructure/appwrite/metadata-sync";
import { getAppwriteConfig } from "@/server/infrastructure/appwrite/config";

async function main() {
  loadLocalEnv();

  const config = getAppwriteConfig();

  if (!config) {
    throw new Error(
      "Missing Appwrite configuration. Add CLONABLE_APPWRITE_* values to .env.local or the current environment.",
    );
  }

  const ensured = await ensureAppwriteCollections();

  if (!ensured) {
    throw new Error("Appwrite bootstrap did not run because configuration was unavailable.");
  }

  console.info(
    `Appwrite database bootstrap complete for project ${config.projectId} and database ${config.databaseId}.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
