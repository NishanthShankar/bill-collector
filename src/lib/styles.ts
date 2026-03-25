/**
 * Centralized style mappings for category colors and bill statuses.
 *
 * These map the color/status keys stored in the database to Tailwind classes.
 * Tailwind classes must be present in source code for the compiler to include
 * them, so these mappings live in code. The keys themselves (e.g. "primary",
 * "secondary") are defined in the appConfig DB table and can be extended there.
 *
 * If you add a new color key to appConfig.categoryColors, add a matching
 * entry here so the UI knows how to render it.
 */

export type StyleMapping = { bg: string; text: string };

export const categoryColorStyles: Record<string, StyleMapping & { border: string; bar: string; iconText: string }> = {
  primary: {
    bg: "bg-primary-fixed",
    text: "text-on-primary-fixed-variant",
    border: "border-primary-fixed-dim",
    bar: "bg-primary",
    iconText: "text-primary",
  },
  secondary: {
    bg: "bg-secondary-container",
    text: "text-on-secondary-container",
    border: "border-secondary",
    bar: "bg-secondary",
    iconText: "text-on-secondary-container",
  },
  tertiary: {
    bg: "bg-tertiary-fixed",
    text: "text-on-tertiary-fixed-variant",
    border: "border-on-tertiary-container",
    bar: "bg-on-tertiary-container",
    iconText: "text-on-tertiary-fixed-variant",
  },
};

export const statusStyles: Record<string, StyleMapping & { label: string }> = {
  paid: {
    bg: "bg-secondary-container",
    text: "text-on-secondary-container",
    label: "Paid",
  },
  pending: {
    bg: "bg-primary-fixed",
    text: "text-on-primary-fixed-variant",
    label: "Pending",
  },
  overdue: {
    bg: "bg-error-container",
    text: "text-on-error-container",
    label: "Overdue",
  },
};

export function getCategoryStyle(color: string) {
  return categoryColorStyles[color] ?? categoryColorStyles.primary;
}

export function getStatusStyle(status: string) {
  return statusStyles[status] ?? statusStyles.pending;
}
