"use client";

import { use } from "react";
import { AppShell } from "@/components/AppShell";
import { FileDetailPage } from "@/components/FileDetailPage";
import { RequireAuth } from "@/components/RequireAuth";

export default function FileDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <RequireAuth permission="FILES:READ">
      <AppShell>
        <FileDetailPage fileId={id} />
      </AppShell>
    </RequireAuth>
  );
}
