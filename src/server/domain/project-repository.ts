import type { MetadataRepository } from "@/server/domain/metadata-repository";
import type { RuntimeRepository } from "@/server/domain/runtime-repository";

export interface ProjectRepository extends MetadataRepository, RuntimeRepository {}
