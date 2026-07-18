"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Button, Flex, Popover, Text, TextField } from "@radix-ui/themes";
import { CalendarIcon } from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import {
  ApiError,
  getSystemClock,
  resetSystemClock,
  runAlertEngineNow,
  setSystemClock,
} from "@/lib/api";
import type { SystemClock } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";

/** Africa/Douala n'observe pas le DST (UTC+1). */
const DOUALA_OFFSET = "+01:00";

function canControlClock(role?: string | null) {
  return role === "SUPER_ADMIN" || role === "BUSINESS_ADMIN";
}

function formatTick(iso: string, zoneId: string, offsetMs: number) {
  const base = new Date(iso).getTime() + offsetMs;
  return new Intl.DateTimeFormat("fr-CM", {
    timeZone: zoneId || "Africa/Douala",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(base));
}

/** Convertit un Instant ISO → valeur `datetime-local` en fuseau donné. */
function toDatetimeLocalValue(iso: string, zoneId: string, offsetMs = 0): string {
  const d = new Date(new Date(iso).getTime() + offsetMs);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zoneId || "Africa/Douala",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
}

/** Interprète un `datetime-local` comme heure locale Douala → Instant ISO. */
function doualaLocalToIso(local: string): string {
  const normalized = local.length === 16 ? `${local}:00` : local;
  return new Date(`${normalized}${DOUALA_OFFSET}`).toISOString();
}

export function TestClockBar() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [clock, setClock] = useState<SystemClock | null>(null);
  const [tickMs, setTickMs] = useState(0);
  const [syncedAt, setSyncedAt] = useState(0);
  const [pickerValue, setPickerValue] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyClock = useCallback((next: SystemClock) => {
    setClock(next);
    setSyncedAt(Date.now());
    setTickMs(0);
    window.dispatchEvent(
      new CustomEvent<SystemClock>("fluxpro:system-clock-updated", { detail: next }),
    );
  }, []);

  const load = useCallback(async () => {
    try {
      const status = await getSystemClock();
      applyClock(status);
      setError(null);
    } catch {
      // garder la dernière horloge connue — ne pas masquer la barre sur un hic réseau
    }
  }, [applyClock]);

  useEffect(() => {
    const initialLoad = setTimeout(load, 0);
    const poll = setInterval(load, 30_000);
    return () => {
      clearTimeout(initialLoad);
      clearInterval(poll);
    };
  }, [load]);

  useEffect(() => {
    if (!clock || clock.mode !== "TEST") return;
    const id = setInterval(() => setTickMs(Date.now() - syncedAt), 1000);
    return () => clearInterval(id);
  }, [clock, syncedAt]);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen && clock) {
      setPickerValue(toDatetimeLocalValue(clock.now, clock.zoneId, Date.now() - syncedAt));
      setError(null);
      setBusy(false);
    }
  }

  if (!clock || clock.mode !== "TEST") {
    return null;
  }

  const display = formatTick(clock.now, clock.zoneId, tickMs);
  const controls = canControlClock(user?.role);

  async function run(action: () => Promise<SystemClock | unknown>) {
    setBusy(true);
    setError(null);
    try {
      const result = await action();
      if (result && typeof result === "object" && "mode" in result && "now" in result) {
        applyClock(result as SystemClock);
      } else {
        await load();
      }
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("header.testClock.error"));
    } finally {
      setBusy(false);
    }
  }

  function handleApply(e: FormEvent) {
    e.preventDefault();
    if (!pickerValue || busy) return;
    run(() => setSystemClock(doualaLocalToIso(pickerValue)));
  }

  return (
    <Flex
      align="center"
      gap="2"
      px="2"
      py="1"
      style={{
        border: "1px solid var(--amber-a7)",
        background: "var(--amber-a3)",
        borderRadius: 8,
        flexShrink: 0,
        maxWidth: "100%",
      }}
    >
      <Text
        size="1"
        weight="bold"
        style={{
          color: "var(--amber-11)",
          fontFamily: "var(--font-geist-mono)",
          whiteSpace: "nowrap",
        }}
      >
        {t("header.testClock.badge")} {display}
      </Text>

      {controls && (
        <Popover.Root open={open} onOpenChange={handleOpenChange}>
          <Popover.Trigger>
            <Button size="1" variant="soft" color="amber" aria-label={t("header.testClock.pickDate")}>
              <CalendarIcon width={14} height={14} />
            </Button>
          </Popover.Trigger>
          <Popover.Content width="300px" style={{ zIndex: 100 }}>
            <form onSubmit={handleApply}>
              <Flex direction="column" gap="3">
                <Text size="2" weight="bold">
                  {t("header.testClock.pickTitle")}
                </Text>
                <Text size="1" color="gray">
                  {t("header.testClock.pickHint")}
                </Text>
                <TextField.Root
                  type="datetime-local"
                  required
                  value={pickerValue}
                  onChange={(e) => setPickerValue(e.target.value)}
                  style={{ fontFamily: "var(--font-geist-mono)" }}
                />
                {error && (
                  <Text size="1" color="red">
                    {error}
                  </Text>
                )}
                <Flex gap="2" justify="end" wrap="wrap">
                  <Button
                    type="button"
                    size="1"
                    variant="ghost"
                    color="gray"
                    disabled={busy}
                    onClick={() => run(() => resetSystemClock())}
                  >
                    {t("header.testClock.reset")}
                  </Button>
                  <Button
                    type="button"
                    size="1"
                    variant="soft"
                    color="orange"
                    disabled={busy}
                    onClick={() => run(() => runAlertEngineNow())}
                  >
                    {t("header.testClock.runAlerts")}
                  </Button>
                  <Button type="submit" size="1" disabled={busy || !pickerValue}>
                    {busy ? t("header.testClock.applying") : t("header.testClock.apply")}
                  </Button>
                </Flex>
              </Flex>
            </form>
          </Popover.Content>
        </Popover.Root>
      )}
    </Flex>
  );
}
