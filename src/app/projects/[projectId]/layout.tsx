import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { ProjectShell } from "@/features/projects/components/project-shell";
import { getProjectDashboard } from "@/server/services/project-service";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const dashboard = getProjectDashboard(projectId);

  if (!dashboard) {
    notFound();
  }

  return (
    <ProjectShell
      projectId={dashboard.project.id}
      projectName={dashboard.project.name}
      projectStatus={dashboard.project.status}
      currentFocus={dashboard.project.currentFocus}
    >
      {children}
    </ProjectShell>
  );
}
