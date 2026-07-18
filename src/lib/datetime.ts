/** Fuseau métier FluxPro (aligné sur ClockService.BUSINESS_ZONE). */
export const BUSINESS_ZONE = "Africa/Douala";

export function formatBusinessDateTime(
  iso?: string | null,
  locale?: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(locale, {
      timeZone: BUSINESS_ZONE,
      dateStyle: "short",
      timeStyle: "short",
      ...options,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatBusinessDate(iso?: string | null, locale?: string): string {
  if (!iso) return "—";
  try {
    // Date seule (yyyy-MM-dd) : pas de décalage TZ
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      const [y, m, d] = iso.split("-").map(Number);
      return new Intl.DateTimeFormat(locale, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date(y, m - 1, d));
    }
    return new Intl.DateTimeFormat(locale, {
      timeZone: BUSINESS_ZONE,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** Extrait yyyy-MM-dd de l'horloge système (Instant ISO) en fuseau Douala. */
export function businessDateFromInstant(iso: string, zoneId = BUSINESS_ZONE): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zoneId || BUSINESS_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
