export const ORG_TYPE_COLOR_OPTIONS = ["purple", "blue", "gray", "green", "orange"] as const;

export type OrgTypeColor = (typeof ORG_TYPE_COLOR_OPTIONS)[number];

const COLOR_HEX: Record<string, string> = {
  purple: "#7c3aed",
  blue: "#2563eb",
  gray: "#64748b",
  green: "#16a34a",
  orange: "#ea580c",
};

export function orgTypeColorHex(color?: string | null): string {
  return COLOR_HEX[color ?? ""] ?? "#64748b";
}
