"use client";

import { useParams } from "next/navigation";
import { ChainTemplateFormLoader } from "@/components/ChainTemplateFormPage";

export default function EditChainTemplatePage() {
  const params = useParams();
  return <ChainTemplateFormLoader mode="edit" templateId={params.id as string} />;
}
