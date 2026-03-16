import crypto from "node:crypto";

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

export function toAppwriteDocumentId(sourceId: string) {
  const trimmed = sourceId.trim();
  const validPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,35}$/;

  if (validPattern.test(trimmed)) {
    return trimmed;
  }

  return `doc_${crypto.createHash("sha1").update(trimmed).digest("hex").slice(0, 32)}`;
}

async function createAttribute(
  databases: Databases,
  databaseId: string,
  collectionId: string,
  attribute: (typeof appwriteCollectionDefinitions)[number]["attributes"][number],
) {
  const defaultValue =
    attribute.required ?? false ? undefined : attribute.default;

  if (attribute.kind === "string") {
    await databases.createStringAttribute(
      databaseId,
      collectionId,
      attribute.key,
      attribute.size ?? 255,
      attribute.required ?? false,
      defaultValue !== undefined ? String(defaultValue) : undefined,
      false,
    );
    return;
  }

  if (attribute.kind === "integer") {
    await databases.createIntegerAttribute(
      databaseId,
      collectionId,
      attribute.key,
      attribute.required ?? false,
      undefined,
      undefined,
      defaultValue !== undefined ? Number(defaultValue) : undefined,
      false,
    );
    return;
  }

  await databases.createBooleanAttribute(
    databaseId,
    collectionId,
    attribute.key,
    attribute.required ?? false,
    defaultValue !== undefined ? Boolean(defaultValue) : undefined,
  );
}

function isNotFoundError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    Number((error as { code?: unknown }).code) === 404
  );
}

async function ensureDatabase(databases: Databases, databaseId: string) {
  try {
    await databases.get(databaseId);
  } catch (error) {
    if (!isNotFoundError(error)) {
      throw error;
    }

    await databases.create(databaseId, "Clonable", true);
  }
}

async function listCollectionAttributes(
  databases: Databases,
  databaseId: string,
  collectionId: string,
) {
  const attributes = await databases.listAttributes(databaseId, collectionId);
  return new Set(attributes.attributes.map((attribute) => attribute.key));
}

export async function ensureAppwriteCollections() {
  const config = getAppwriteConfig();
  const clients = getAppwriteAdminClients();

  if (!config || !clients) {
    return false;
  }

  const { databases } = clients;
  const { databaseId } = config;

  await ensureDatabase(databases, databaseId);
  const collections = await databases.listCollections(databaseId);
  const existingCollections = new Set(
    collections.collections.map((collection) => collection.$id),
  );

  for (const definition of appwriteCollectionDefinitions) {
    if (!existingCollections.has(definition.id)) {
      await databases.createCollection(
        databaseId,
        definition.id,
        definition.name,
        buildPermissions(),
        false,
        true,
      );

    }

    const existingAttributes = await listCollectionAttributes(
      databases,
      databaseId,
      definition.id,
    );

    for (const attribute of definition.attributes) {
      if (existingAttributes.has(attribute.key)) {
        continue;
      }

      await createAttribute(databases, databaseId, definition.id, attribute);
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
  const resolvedDocumentId = documentId ? toAppwriteDocumentId(documentId) : ID.unique();

  try {
    await databases.updateDocument(
      config.databaseId,
      collectionId,
      resolvedDocumentId,
      data,
    );
  } catch {
    await databases.createDocument(
      config.databaseId,
      collectionId,
      resolvedDocumentId,
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
      defaultChatBotId: project.defaultChatBotId,
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
