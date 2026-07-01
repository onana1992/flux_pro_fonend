"use client";

import { use } from "react";
import { OrganizationTypeFormPage } from "@/components/OrganizationTypeFormPage";

export default function EditOrgTypePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <OrganizationTypeFormPage typeId={id} />;
}
