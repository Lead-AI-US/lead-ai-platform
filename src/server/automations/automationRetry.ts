export const MAX_AUTOMATION_RETRIES = 2;

const NON_RETRYABLE = new Set([
  "ACTION_NOT_SUPPORTED",
  "ACTION_POLICY_DENIED",
  "ACTION_APPROVAL_REQUIRED",
  "ACTION_ALREADY_COMPLETED",
  "ACTION_INVALID_STATE",
  "AUTOMATION_CONDITION_FAILED",
  "AUTOMATION_ALREADY_PROCESSED",
]);

export function shouldRetryAutomation(failureCode: string | undefined, retryCount: number): boolean {
  if (!failureCode || NON_RETRYABLE.has(failureCode)) return false;
  return retryCount < MAX_AUTOMATION_RETRIES;
}
