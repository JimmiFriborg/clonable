export const appwriteCollectionIds = {
  projects: "projects",
  projectMvp: "project_mvp",
  phases: "phases",
  features: "features",
  tasks: "tasks",
  agents: "agents",
  agentRuns: "agent_runs",
  events: "events",
  projectDocuments: "project_documents",
  projectMemberships: "project_memberships",
  providerProfiles: "provider_profiles",
} as const;

type AppwriteAttributeKind = "string" | "integer" | "boolean";

interface AppwriteAttributeDefinition {
  key: string;
  kind: AppwriteAttributeKind;
  size?: number;
  required?: boolean;
  default?: string | number | boolean;
}

interface AppwriteCollectionDefinition {
  id: (typeof appwriteCollectionIds)[keyof typeof appwriteCollectionIds];
  name: string;
  attributes: AppwriteAttributeDefinition[];
}

const payloadAttribute: AppwriteAttributeDefinition = {
  key: "payload",
  kind: "string",
  size: 65535,
  required: true,
};

export const appwriteCollectionDefinitions: AppwriteCollectionDefinition[] = [
  {
    id: appwriteCollectionIds.projects,
    name: "Projects",
    attributes: [
      { key: "slug", kind: "string", size: 255, required: true },
      { key: "name", kind: "string", size: 255, required: true },
      { key: "status", kind: "string", size: 64, required: true },
      { key: "updatedAt", kind: "string", size: 64, required: true },
      payloadAttribute,
    ],
  },
  {
    id: appwriteCollectionIds.projectMvp,
    name: "Project MVP",
    attributes: [
      { key: "projectId", kind: "string", size: 255, required: true },
      { key: "updatedAt", kind: "string", size: 64, required: true },
      payloadAttribute,
    ],
  },
  {
    id: appwriteCollectionIds.phases,
    name: "Phases",
    attributes: [
      { key: "projectId", kind: "string", size: 255, required: true },
      { key: "title", kind: "string", size: 255, required: true },
      { key: "sortOrder", kind: "integer", required: true, default: 0 },
      { key: "updatedAt", kind: "string", size: 64, required: true },
      payloadAttribute,
    ],
  },
  {
    id: appwriteCollectionIds.features,
    name: "Features",
    attributes: [
      { key: "projectId", kind: "string", size: 255, required: true },
      { key: "phaseId", kind: "string", size: 255, required: true },
      { key: "title", kind: "string", size: 255, required: true },
      { key: "sortOrder", kind: "integer", required: true, default: 0 },
      { key: "updatedAt", kind: "string", size: 64, required: true },
      payloadAttribute,
    ],
  },
  {
    id: appwriteCollectionIds.tasks,
    name: "Tasks",
    attributes: [
      { key: "projectId", kind: "string", size: 255, required: true },
      { key: "phaseId", kind: "string", size: 255, required: true },
      { key: "featureId", kind: "string", size: 255, required: true },
      { key: "state", kind: "string", size: 64, required: true },
      { key: "priority", kind: "string", size: 64, required: true },
      { key: "ownerAgentId", kind: "string", size: 255, required: false, default: "" },
      { key: "sortOrder", kind: "integer", required: true, default: 0 },
      { key: "updatedAt", kind: "string", size: 64, required: true },
      payloadAttribute,
    ],
  },
  {
    id: appwriteCollectionIds.agents,
    name: "Agents",
    attributes: [
      { key: "projectId", kind: "string", size: 255, required: true },
      { key: "policyRole", kind: "string", size: 64, required: true },
      { key: "enabled", kind: "boolean", required: true, default: true },
      { key: "updatedAt", kind: "string", size: 64, required: true },
      payloadAttribute,
    ],
  },
  {
    id: appwriteCollectionIds.agentRuns,
    name: "Agent Runs",
    attributes: [
      { key: "projectId", kind: "string", size: 255, required: true },
      { key: "agentId", kind: "string", size: 255, required: true },
      { key: "taskId", kind: "string", size: 255, required: false, default: "" },
      { key: "status", kind: "string", size: 64, required: true },
      { key: "trigger", kind: "string", size: 64, required: true },
      { key: "createdAt", kind: "string", size: 64, required: true },
      payloadAttribute,
    ],
  },
  {
    id: appwriteCollectionIds.events,
    name: "Events",
    attributes: [
      { key: "projectId", kind: "string", size: 255, required: true },
      { key: "type", kind: "string", size: 64, required: true },
      { key: "createdAt", kind: "string", size: 64, required: true },
      payloadAttribute,
    ],
  },
  {
    id: appwriteCollectionIds.projectDocuments,
    name: "Project Documents",
    attributes: [
      { key: "projectId", kind: "string", size: 255, required: true },
      { key: "kind", kind: "string", size: 64, required: true },
      { key: "updatedAt", kind: "string", size: 64, required: true },
      payloadAttribute,
    ],
  },
  {
    id: appwriteCollectionIds.projectMemberships,
    name: "Project Memberships",
    attributes: [
      { key: "projectId", kind: "string", size: 255, required: true },
      { key: "userId", kind: "string", size: 255, required: true },
      { key: "role", kind: "string", size: 64, required: true },
      payloadAttribute,
    ],
  },
  {
    id: appwriteCollectionIds.providerProfiles,
    name: "Provider Profiles",
    attributes: [
      { key: "projectId", kind: "string", size: 255, required: true },
      { key: "provider", kind: "string", size: 64, required: true },
      { key: "model", kind: "string", size: 255, required: true },
      { key: "updatedAt", kind: "string", size: 64, required: true },
      payloadAttribute,
    ],
  },
];
