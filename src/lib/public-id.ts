/**
 * Public ID generator for shareable trace links.
 *
 * Generates stable, random public IDs for agent runs that can be shared
 * publicly without exposing internal UUIDs.
 */

export function generatePublicId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    const uuid = crypto.randomUUID();
    // Remove hyphens and prefix with trace_
    const cleanId = uuid.replace(/-/g, "");
    return `trace_${cleanId}`;
  }
  // Fallback for environments without crypto.randomUUID
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return `trace_${timestamp}${random}`;
}
