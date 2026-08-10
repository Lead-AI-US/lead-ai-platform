export function formatDateTime(value?: string): string {
  if (!value) return "Not checked";

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
