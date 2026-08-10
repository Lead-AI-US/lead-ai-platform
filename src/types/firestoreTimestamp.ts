/**
 * All domain timestamps are ISO 8601 strings on the wire, not raw Firestore
 * `Timestamp` objects. The client SDK (`firebase/firestore`) and Admin SDK
 * (`firebase-admin/firestore`) each export their own incompatible
 * `Timestamp` class, so a shared domain type can't use either directly
 * without every consumer depending on one specific SDK package. ISO
 * strings are trivially serializable (API responses, tests, logs) and
 * sortable as strings. See docs/FIRESTORE_SCHEMA.md.
 *
 * - Server writes: `new Date().toISOString()`.
 * - Client reads: converted from `Timestamp` via `snapshotToIso()` below.
 */
export type IsoTimestamp = string;

/** Converts a Firestore client Timestamp-like value (has `.toDate()`) to ISO. */
export function timestampToIso(value: unknown): IsoTimestamp | undefined {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: unknown }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return undefined;
}
