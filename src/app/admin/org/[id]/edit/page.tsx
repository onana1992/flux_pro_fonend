"use client";

import { use } from "react";
import { OrganizationFormPage } from "@/components/OrganizationFormPage";

export default function EditOrgEntityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <OrganizationFormPage organizationId={id} />;
}
