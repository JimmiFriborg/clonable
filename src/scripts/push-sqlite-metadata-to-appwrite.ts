import { listProjects, getProject } from "@/server/services/project-service";
import { syncProjectMetadataToAppwrite } from "@/server/infrastructure/appwrite/metadata-sync";

async function main() {
  const projects = await listProjects();

  if (projects.length === 0) {
    console.info("No projects found in SQLite.");
    return;
  }

  for (const project of projects) {
    const record = await getProject(project.id);

    if (!record) {
      continue;
    }

    await syncProjectMetadataToAppwrite(record);
    console.info(`Synced ${record.name} (${record.id}) to Appwrite.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
