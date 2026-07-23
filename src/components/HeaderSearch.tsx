"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Box, Flex, Text } from "@radix-ui/themes";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import { ApiError, searchFiles } from "@/lib/api";
import { canSeePermission } from "@/lib/auth-storage";
import type { FileSummary, UserProfile } from "@/lib/types";

const DEBOUNCE_MS = 300;
const RESULT_LIMIT = 8;
const MIN_QUERY_LEN = 2;

type HeaderSearchProps = {
  user: UserProfile | null;
};

export function HeaderSearch({ user }: HeaderSearchProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FileSummary[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  const canSearch = canSeePermission(user, "FILES:READ");

  // Aligne avec ?search= sur /files
  useEffect(() => {
    if (!pathname.startsWith("/files")) return;
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search).get("search") ?? "";
    setQuery(q);
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    if (!canSearch) return;
    const q = query.trim();
    if (q.length < MIN_QUERY_LEN) {
      setResults([]);
      setLoading(false);
      setError(null);
      setActiveIndex(-1);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    const timer = window.setTimeout(async () => {
      try {
        const page = await searchFiles({ search: q, page: 0, size: RESULT_LIMIT });
        if (cancelled) return;
        setResults(page.content);
        setActiveIndex(-1);
      } catch (err) {
        if (cancelled) return;
        setResults([]);
        setActiveIndex(-1);
        setError(err instanceof ApiError ? err.message : t("common.errorLoad"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [canSearch, query, t]);

  const goToList = useCallback(() => {
    const q = query.trim();
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.blur();
    if (!q) {
      router.push("/files");
      return;
    }
    router.push(`/files?search=${encodeURIComponent(q)}`);
  }, [query, router]);

  const goToFile = useCallback(
    (id: string) => {
      setOpen(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
      router.push(`/files/${id}`);
    },
    [router],
  );

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      if (results.length === 0) return;
      setActiveIndex((i) => (i + 1) % results.length);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (results.length === 0) return;
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (open && activeIndex >= 0 && results[activeIndex]) {
        goToFile(results[activeIndex].id);
        return;
      }
      goToList();
    }
  }

  const showPanel =
    open &&
    canSearch &&
    (query.trim().length >= MIN_QUERY_LEN || loading || error != null);

  return (
    <Box
      ref={wrapRef}
      display={{ initial: "none", sm: "block" }}
      style={{ flex: 1, maxWidth: 430, position: "relative" }}
    >
      <Flex
        align="center"
        gap="2"
        px="3"
        style={{
          height: 44,
          border: "1px solid var(--gray-a5)",
          borderRadius: 8,
          background: "var(--gray-2)",
        }}
      >
        <MagnifyingGlassIcon width={18} height={18} color="var(--gray-9)" />
        <Box asChild style={{ flex: 1, minWidth: 0 }}>
          <input
            ref={inputRef}
            type="search"
            role="combobox"
            aria-expanded={showPanel}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={
              activeIndex >= 0 ? `${listId}-opt-${activeIndex}` : undefined
            }
            value={query}
            disabled={!canSearch}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={t("header.searchPlaceholder")}
            aria-label={t("common.search")}
            style={{
              width: "100%",
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: 14,
              color: "var(--gray-12)",
            }}
          />
        </Box>
        <Text
          size="1"
          color="gray"
          style={{
            flexShrink: 0,
            padding: "2px 6px",
            border: "1px solid var(--gray-a5)",
            borderRadius: 4,
            background: "var(--color-background)",
            fontFamily: "var(--font-geist-mono)",
            lineHeight: 1.4,
          }}
        >
          ⌘ K
        </Text>
      </Flex>

      {showPanel && (
        <Box
          id={listId}
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            zIndex: 50,
            maxHeight: 360,
            overflowY: "auto",
            border: "1px solid var(--gray-a5)",
            borderRadius: 8,
            background: "var(--color-background)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          }}
        >
          {loading && (
            <Flex p="3">
              <Text size="2" color="gray">
                {t("header.searchLoading")}
              </Text>
            </Flex>
          )}
          {!loading && error && (
            <Flex p="3">
              <Text size="2" color="red">
                {error}
              </Text>
            </Flex>
          )}
          {!loading && !error && results.length === 0 && (
            <Flex p="3">
              <Text size="2" color="gray">
                {t("header.searchEmpty")}
              </Text>
            </Flex>
          )}
          {!loading &&
            !error &&
            results.map((file, index) => {
              const active = index === activeIndex;
              return (
                <button
                  key={file.id}
                  id={`${listId}-opt-${index}`}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => goToFile(file.id)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 12px",
                    border: "none",
                    borderBottom: "1px solid var(--gray-a4)",
                    background: active ? "var(--gray-3)" : "transparent",
                    cursor: "pointer",
                    color: "inherit",
                  }}
                >
                  <Text
                    as="div"
                    size="2"
                    weight="medium"
                    style={{ fontFamily: "var(--font-geist-mono)" }}
                  >
                    {file.referenceNumber || "—"}
                  </Text>
                  <Text as="div" size="2" color="gray" style={{ marginTop: 2 }}>
                    {file.subject}
                  </Text>
                </button>
              );
            })}
          {!loading && !error && query.trim().length >= MIN_QUERY_LEN && (
            <button
              type="button"
              onClick={goToList}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "10px 12px",
                border: "none",
                background: "var(--gray-2)",
                cursor: "pointer",
                color: "inherit",
              }}
            >
              <Text size="2" weight="medium">
                {t("header.searchSeeAll", { query: query.trim() })}
              </Text>
            </button>
          )}
        </Box>
      )}
    </Box>
  );
}
