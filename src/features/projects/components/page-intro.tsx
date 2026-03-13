import type { ReactNode } from "react";

import { SectionHeading } from "@/components/ui/section-heading";

export function PageIntro({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <SectionHeading
      eyebrow={eyebrow}
      title={title}
      description={description}
      action={action}
      className="mb-6"
    />
  );
}
