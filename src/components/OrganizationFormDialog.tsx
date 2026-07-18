"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Button,
  Checkbox,
  Dialog,
  Flex,
  Select,
  Text,
  TextField,
} from "@radix-ui/themes";
import { useTranslation } from "react-i18next";
import {
  ApiError,
  createOrganization,
  getOrganization,
  getOrganizationTypes,
  updateOrganization,
} from "@/lib/api";
import { collectDescendantIds, flattenOrgTree } from "@/lib/org-tree";
import type { OrganisationTreeNode, OrganizationRequest, OrganizationType } from "@/lib/types";
import { preventDialogDismissFromPortals } from "@/lib/dialog-portals";

const EMPTY_FORM: OrganizationRequest = {
  code: "",
  name: "",
  typeId: "",
  parentId: null,
  active: true,
};

export function OrganizationFormDialog({
  open,
  onOpenChange,
  tree,
  organizationId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tree: OrganisationTreeNode[];
  organizationId?: string | null;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const isEdit = Boolean(organizationId);
  const [types, setTypes] = useState<OrganizationType[]>([]);
  const [form, setForm] = useState<OrganizationRequest>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const flatOrgs = useMemo(() => flattenOrgTree(tree), [tree]);
  const excludedParentIds = useMemo(
    () => (organizationId ? collectDescendantIds(tree, organizationId) : new Set<string>()),
    [tree, organizationId],
  );

  const selectedType = types.find((type) => type.id === form.typeId);
  const parentRequired = selectedType ? !selectedType.allowsRoot : false;

  const parentOptions = flatOrgs.filter(
    (org) => org.active && !excludedParentIds.has(org.id) && org.id !== organizationId,
  );

  useEffect(() => {
    if (!open) return;
    setError(null);
    getOrganizationTypes()
      .then(setTypes)
      .catch(() => setTypes([]));
  }, [open]);

  useEffect(() => {
    if (!open) {
      setForm(EMPTY_FORM);
      return;
    }
    if (!organizationId) {
      setForm(EMPTY_FORM);
      return;
    }
    setLoading(true);
    setError(null);
    getOrganization(organizationId)
      .then((org) => {
        setForm({
          code: org.code,
          name: org.name,
          typeId: org.typeId,
          parentId: org.parentId ?? null,
          active: org.active,
        });
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
      })
      .finally(() => setLoading(false));
  }, [open, organizationId, t]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (parentRequired && !form.parentId) {
      setError(t("admin.org.parentRequired"));
      return;
    }
    setSubmitting(true);
    setError(null);
    const payload: OrganizationRequest = {
      ...form,
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      parentId: form.parentId || null,
    };
    try {
      if (isEdit && organizationId) {
        await updateOrganization(organizationId, payload);
      } else {
        await createOrganization(payload);
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("admin.org.saveFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content
        maxWidth="480px"
        onPointerDownOutside={preventDialogDismissFromPortals}
        onInteractOutside={preventDialogDismissFromPortals}
        onFocusOutside={preventDialogDismissFromPortals}
      >
        <Dialog.Title>
          {isEdit ? t("admin.org.editTitle") : t("admin.org.createTitle")}
        </Dialog.Title>
        <Dialog.Description size="2" color="gray" mb="4">
          {isEdit ? t("admin.org.editDescription") : t("admin.org.createDescription")}
        </Dialog.Description>

        {error && (
          <Text size="2" color="red" mb="3" as="p">
            {error}
          </Text>
        )}

        {loading ? (
          <Text size="2" color="gray">
            {t("admin.org.loading")}
          </Text>
        ) : (
          <form onSubmit={handleSubmit}>
            <Flex direction="column" gap="3">
              <label>
                <Text as="div" size="2" weight="medium" mb="1">
                  {t("admin.org.code")}
                </Text>
                <TextField.Root
                  required
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  style={{ fontFamily: "var(--font-geist-mono)" }}
                />
              </label>

              <label>
                <Text as="div" size="2" weight="medium" mb="1">
                  {t("admin.org.name")}
                </Text>
                <TextField.Root
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </label>

              <label>
                <Text as="div" size="2" weight="medium" mb="1">
                  {t("admin.org.type")}
                </Text>
                <Select.Root
                  required
                  value={form.typeId || undefined}
                  onValueChange={(typeId) => setForm((f) => ({ ...f, typeId }))}
                >
                  <Select.Trigger placeholder={t("admin.org.typePlaceholder")} />
                  <Select.Content>
                    {types.map((type) => (
                      <Select.Item key={type.id} value={type.id}>
                        {type.name} ({type.code})
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </label>

              <label>
                <Text as="div" size="2" weight="medium" mb="1">
                  {t("admin.org.parent")}
                  {parentRequired ? " *" : ""}
                </Text>
                <Select.Root
                  value={form.parentId ?? "__none__"}
                  onValueChange={(value) =>
                    setForm((f) => ({ ...f, parentId: value === "__none__" ? null : value }))
                  }
                  disabled={parentRequired && parentOptions.length === 0}
                >
                  <Select.Trigger placeholder={t("admin.org.parentPlaceholder")} />
                  <Select.Content>
                    {!parentRequired && <Select.Item value="__none__">{t("admin.org.noParent")}</Select.Item>}
                    {parentOptions.map((org) => (
                      <Select.Item key={org.id} value={org.id}>
                        {org.code} — {org.name}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </label>

              <Text as="label" size="2">
                <Flex gap="2" align="center">
                  <Checkbox
                    checked={form.active}
                    onCheckedChange={(checked) =>
                      setForm((f) => ({ ...f, active: checked === true }))
                    }
                  />
                  {t("admin.org.active")}
                </Flex>
              </Text>

              <Flex gap="3" justify="end" mt="2">
                <Dialog.Close>
                  <Button type="button" variant="soft" color="gray">
                    {t("common.cancel")}
                  </Button>
                </Dialog.Close>
                <Button type="submit" disabled={submitting}>
                  {submitting
                    ? t("admin.org.saving")
                    : isEdit
                      ? t("admin.org.save")
                      : t("admin.org.create")}
                </Button>
              </Flex>
            </Flex>
          </form>
        )}
      </Dialog.Content>
    </Dialog.Root>
  );
}
