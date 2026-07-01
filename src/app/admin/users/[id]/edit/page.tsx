"use client";

import { use } from "react";
import { UserFormPage } from "@/components/UserFormPage";

export default function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <UserFormPage userId={id} />;
}
