import { demoProjectFixture } from "@/server/infrastructure/demo-project-repository";
import { seedProject } from "@/server/services/project-service";

async function main() {
  await seedProject(demoProjectFixture);
  console.log(`Seeded demo project: ${demoProjectFixture.name}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
