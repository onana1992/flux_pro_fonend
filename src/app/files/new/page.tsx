"use client";

import { AppShell } from "@/components/AppShell";
import { FileFormPage } from "@/components/FileFormPage";
import { RequireAuth } from "@/components/RequireAuth";

export default function NewFilePage() {
  return (
    <RequireAuth permission="FILES:CREATE">
      <AppShell>
        <FileFormPage mode="create" />
      </AppShell>
    </RequireAuth>
  );
}
