/** High-entropy public locator embedded in the widget snippet. Not a secret - see docs/WIDGET.md. */
export function generatePublicWidgetKey(): string {
  return `wk_${crypto.randomUUID().replace(/-/g, "")}`;
}
