"use client";

import { use } from "react";
import { AppShell } from "@/components/AppShell";
import { FileFormPage } from "@/components/FileFormPage";
import { RequireAuth } from "@/components/RequireAuth";

export default function EditFilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireAuth permission="FILES:UPDATE">
      <AppShell>
        <FileFormPage mode="edit" fileId={id} />
      </AppShell>
    </RequireAuth>
  );
}
