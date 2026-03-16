import { Databases, ID, Permission, Role } from "node-appwrite";

import type { EventRecord, ProjectRecord } from "@/server/domain/project";
import { getAppwriteAdminClients } from "@/server/infrastructure/appwrite/client";
import {
  appwriteCollectionDefinitions,
  appwriteCollectionIds,
} from "@/server/infrastructure/appwrite/collections";
import { getAppwriteConfig } from "@/server/infrastructure/appwrite/config";

function serializeJson(value: unknown) {
  return JSON.stringify(value);
}

function buildPermissions() {
  return [Permission.read(Role.any()), Permission.write(Role.any())];
}

async function createAttribute(
  databases: Databases,
  databaseId: string,
  collectionId: string,
  attribute: (typeof appwriteCollectionDefinitions)[number]["attributes"][number],
) {
  if (attribute.kind === "string") {
    await databases.createStringAttribute(
      databaseId,
      collectionId,
      attribute.key,
      attribute.size ?? 255,
      attribute.required ?? false,
      attribute.default ? String(attribute.default) : undefined,
      false,
    );
    return;
  }

  if (attribute.kind === "integer") {
    await databases.createIntegerAttribute(
      databaseId,
      collectionId,
      attribute.key,
      false,
      undefined,
      undefined,
      attribute.default !== undefined ? Number(attribute.default) : undefined,
      attribute.required ?? false,
    );
    return;
  }

  await databases.createBooleanAttribute(
    databaseId,
    collectionId,
    attribute.key,
    attribute.required ?? false,
    attribute.default !== undefined ? Boolean(attribute.default) : undefined,
  );
}

export async function ensureAppwriteCollections() {
  const config = getAppwriteConfig();
  const clients = getAppwriteAdminClients();

  if (!config || !clients) {
    return false;
  }

  const { databases } = clients;
  const { databaseId } = config;

  let existingCollections: string[] = [];
  try {
    const collections = await databases.listCollections(databaseId);
    existingCollections = collections.collections.map((collection) => collection.$id);
  } catch {
    await databases.create(databaseId, "Clonable", true);
  }

  for (const definition of appwriteCollectionDefinitions) {
    if (!existingCollections.includes(definition.id)) {
      await databases.createCollection(
        databaseId,
        definition.id,
        definition.name,
        buildPermissions(),
        false,
        true,
      );

      for (const attribute of definition.attributes) {
        await createAttribute(databases, databaseId, definition.id, attribute);
      }
    }
  }

  return true;
}

async function upsertDocument(
  collectionId: string,
  documentId: string,
  data: Record<string, unknown>,
) {
  const config = getAppwriteConfig();
  const clients = getAppwriteAdminClients();

  if (!config || !clients) {
    return;
  }

  const { databases } = clients;

  try {
    await databases.updateDocument(config.databaseId, collectionId, documentId, data);
  } catch {
    await databases.createDocument(
      config.databaseId,
      collectionId,
      documentId || ID.unique(),
      data,
      buildPermissions(),
    );
  }
}

function buildEventDocument(projectId: string, event: EventRecord) {
  return {
    projectId,
    type: event.type,
    createdAt: event.createdAt,
    payload: serializeJson(event),
  };
}

export async function syncProjectMetadataToAppwrite(project: ProjectRecord) {
  const ensured = await ensureAppwriteCollections();

  if (!ensured) {
    return;
  }

  await upsertDocument(appwriteCollectionIds.projects, project.id, {
    slug: project.slug,
    name: project.name,
    status: project.status,
    updatedAt: new Date().toISOString(),
    payload: serializeJson({
      id: project.id,
      slug: project.slug,
      name: project.name,
      summary: project.summary,
      status: project.status,
      currentFocus: project.currentFocus,
      vision: project.vision,
      plannerState: project.plannerState,
      plannerMessage: project.plannerMessage,
      targetUser: project.targetUser,
      ideaPrompt: project.ideaPrompt,
      stackPreferences: project.stackPreferences,
      constraints: project.constraints,
      definitionOfDone: project.definitionOfDone,
    }),
  });

  await upsertDocument(appwriteCollectionIds.projectMvp, project.id, {
    projectId: project.id,
    updatedAt: new Date().toISOString(),
    payload: serializeJson(project.mvp),
  });

  for (const phase of project.phases) {
    await upsertDocument(appwriteCollectionIds.phases, phase.id, {
      projectId: project.id,
      title: phase.title,
      sortOrder: phase.sortOrder,
      updatedAt: new Date().toISOString(),
      payload: serializeJson(phase),
    });
  }

  for (const feature of project.features) {
    await upsertDocument(appwriteCollectionIds.features, feature.id, {
      projectId: project.id,
      phaseId: feature.phaseId,
      title: feature.title,
      sortOrder: feature.sortOrder,
      updatedAt: new Date().toISOString(),
      payload: serializeJson(feature),
    });
  }

  for (const task of project.tasks) {
    await upsertDocument(appwriteCollectionIds.tasks, task.id, {
      projectId: project.id,
      phaseId: task.phaseId,
      featureId: task.featureId,
      state: task.state,
      priority: task.priority,
      ownerAgentId: task.ownerAgentId ?? "",
      sortOrder: project.tasks.findIndex((candidate) => candidate.id === task.id),
      updatedAt: task.lastUpdated,
      payload: serializeJson(task),
    });
  }

  for (const agent of project.agents) {
    await upsertDocument(appwriteCollectionIds.agents, agent.id, {
      projectId: project.id,
      policyRole: agent.policyRole,
      enabled: agent.enabled,
      updatedAt: new Date().toISOString(),
      payload: serializeJson(agent),
    });
  }

  for (const run of project.agentRuns) {
    await upsertDocument(appwriteCollectionIds.agentRuns, run.id, {
      projectId: project.id,
      agentId: run.agentId,
      taskId: run.taskId ?? "",
      status: run.status,
      trigger: run.trigger,
      createdAt: run.createdAt,
      payload: serializeJson(run),
    });
  }

  for (const event of project.events) {
    await upsertDocument(appwriteCollectionIds.events, event.id, buildEventDocument(project.id, event));
  }
}
