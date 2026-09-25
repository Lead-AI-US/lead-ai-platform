import { test, expect, type Page } from "@playwright/test";

/**
 * Browser-driven pilot acceptance test: a new business owner signs up,
 * creates a workspace, approves business knowledge, installs the real
 * website widget, a visitor sends a real message through it, and the
 * resulting lead is visible to the correct owner — who then marks it
 * contacted (the human follow-up step).
 *
 * Runs against the REAL app code and REAL API route handlers
 * (scripts/local-api-server.mts is a thin routing adapter, not a
 * reimplementation) backed by REAL Firestore/Auth emulators. The only
 * non-production piece is the AI model call itself (see
 * src/lib/ai/testModelAdapter.ts) — there is no live OPENAI_API_KEY in
 * this environment, so LEAD_AI_E2E_FAKE_MODEL swaps only that one
 * outbound network call for a deterministic response, exactly the same
 * dependency-injection seam orchestrator.test.ts already uses. Everything
 * else — origin validation, rate limiting, Firestore writes, the security
 * pre-check/prompt/schema/policy pipeline, tenant scoping — is real.
 *
 * Requires the local stack already running: Firestore + Auth emulators,
 * scripts/local-api-server.mts, and the Vite dev server with
 * VITE_USE_FIREBASE_EMULATOR=true. See docs/LOCAL_DEVELOPMENT.md.
 */

const LOCAL_API_ORIGIN = "http://127.0.0.1:3001";
const runId = Date.now();
const ownerEmail = `pilot+${runId}@example.com`;
const ownerPassword = "PilotTest123!";
const businessName = `Test Salon ${runId}`;
const visitorName = "Alex Visitor";
const visitorEmail = `alex.visitor+${runId}@example.com`;
const visitorPhone = "555-0199";

let workspaceId = "";
let publicWidgetKey = "";

test.describe.serial("Pilot journey — signup to captured lead", () => {
  test("1. Owner signs up with real Firebase Auth", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("Email").fill(ownerEmail);
    await page.getByLabel("Password").fill(ownerPassword);
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL(/\/onboarding$/);
    await expect(page.getByRole("heading", { name: "Set up your workspace" })).toBeVisible();
  });

  test("2. Owner creates a workspace (real POST /api/workspaces)", async ({ page }) => {
    // Fresh page/context per Playwright test by default, so this
    // re-authenticates via sign-in — step 1 already created the account.
    await page.goto("/login");
    await page.getByLabel("Email").fill(ownerEmail);
    await page.getByLabel("Password").fill(ownerPassword);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/onboarding$/);

    await page.getByLabel("Business name").fill(businessName);
    await page.getByLabel("Business type").fill("Salon");
    await page.getByLabel("Primary goal").fill("Capture more leads after hours");

    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/workspaces") && res.request().method() === "POST"),
      page.getByRole("button", { name: "Create workspace" }).click(),
    ]);
    expect(response.status()).toBe(201);
    const body = await response.json();
    workspaceId = body.workspace.id;
    publicWidgetKey = body.workspace.publicWidgetKey;
    expect(workspaceId).toBeTruthy();
    expect(publicWidgetKey).toBeTruthy();

    await page.waitForURL(/\/app$/);
    await expect(page).toHaveURL(/\/app$/);
  });

  test("3. Owner adds and approves business knowledge", async ({ page }) => {
    await signIn(page);
    await page.goto("/app/knowledge");

    await page.getByLabel("Title").fill("Hours");
    await page.getByLabel("Content").fill("We're open Tuesday to Saturday, 9am to 6pm.");
    await page.getByRole("button", { name: "Add as draft" }).click();

    await expect(page.getByText("Hours")).toBeVisible();
    await page.getByRole("button", { name: "Approve" }).click();
    await expect(page.getByText("approved").first()).toBeVisible();
  });

  test("4. A real visitor sends a message through the actual embedded widget", async ({ browser }) => {
    // A separate browser context = a genuinely different, unauthenticated
    // visitor session, not the owner's logged-in page.
    const visitorContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const visitorPage = await visitorContext.newPage();

    await visitorPage.goto(`${LOCAL_API_ORIGIN}/_e2e/widget-host?key=${publicWidgetKey}`);
    await expect(visitorPage.getByRole("heading", { name: "Example Salon" })).toBeVisible();

    await visitorPage.getByRole("button", { name: "Chat" }).click();
    const input = visitorPage.locator("input[placeholder='Ask a question…']");
    await input.fill(
      `I'd like to book an appointment. name: ${visitorName} email: ${visitorEmail} phone: ${visitorPhone}`
    );
    await visitorPage.screenshot({ path: "artifacts/pilot-journey/widget-before-send-desktop.png" });
    await visitorPage.getByRole("button", { name: "Send" }).click();

    await expect(visitorPage.getByText(/reach out to schedule/i)).toBeVisible();
    await visitorPage.screenshot({ path: "artifacts/pilot-journey/widget-after-reply-desktop.png" });

    // Mobile viewport pass, same real widget.
    await visitorPage.setViewportSize({ width: 390, height: 844 });
    await visitorPage.screenshot({ path: "artifacts/pilot-journey/widget-mobile.png" });

    await visitorContext.close();
  });

  test("5. Lead is visible to the correct owner and can be marked contacted", async ({ page }) => {
    await signIn(page);
    await page.goto("/app/leads");

    const leadRow = page.locator("tr", { hasText: visitorName });
    await expect(leadRow).toBeVisible({ timeout: 15_000 });
    await expect(leadRow).toContainText(visitorEmail);
    await expect(leadRow).toContainText("Website chat");

    await page.screenshot({ path: "artifacts/pilot-journey/owner-leads-inbox-desktop.png", fullPage: true });

    const statusSelect = leadRow.locator("select");
    await statusSelect.selectOption("contacted");
    await expect(statusSelect).toHaveValue("contacted");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: "artifacts/pilot-journey/owner-leads-inbox-mobile.png", fullPage: true });

    // 320px -- the narrowest viewport a real device ships with (iPhone
    // SE 1st gen/5). Below `sm` the table becomes stacked cards
    // (Leads.tsx), so this isn't just a screenshot: actually reaching
    // and using the status control at this width is what "lead details
    // and status actions remain accessible" means.
    //
    // document.scrollWidth <= clientWidth is NOT sufficient here: `main`
    // (AppLayout.tsx) sets overflow-y-auto, which per the CSS overflow
    // spec forces its computed overflow-x to `auto` too (a `visible`
    // axis paired with a non-visible one is promoted) -- so `main`
    // becomes its own horizontal scroll container and silently clips a
    // too-wide child instead of growing the document. This genuinely
    // happened here (a card was 334px wide clipped inside a 320px
    // viewport, invisible to a document-level width check) until the
    // grid/Card containers got `min-w-0` -- so the real assertion has to
    // check the rendered element's own bounding box, not just the page.
    await page.setViewportSize({ width: 320, height: 700 });
    const mobileList = page.getByTestId("leads-mobile-list");
    await expect(mobileList).toBeVisible();
    await expect(mobileList.getByText(visitorName).first()).toBeVisible();
    await expect(mobileList.getByText(visitorEmail).first()).toBeVisible();
    const mobileStatusSelect = mobileList.getByLabel(`Status for ${visitorName}`);
    await expect(mobileStatusSelect).toBeVisible();
    await mobileStatusSelect.selectOption("qualified");
    await expect(mobileStatusSelect).toHaveValue("qualified");

    const statusBadge = mobileList.getByText("qualified", { exact: true }).first();
    const badgeBox = await statusBadge.boundingBox();
    expect(badgeBox).not.toBeNull();
    expect(badgeBox!.x + badgeBox!.width).toBeLessThanOrEqual(320);

    await page.screenshot({ path: "artifacts/pilot-journey/owner-leads-inbox-320.png", fullPage: true });
  });

  test("6. Tenant isolation: a second, unrelated owner sees none of this", async ({ browser }) => {
    const otherContext = await browser.newContext();
    const otherPage = await otherContext.newPage();
    const otherEmail = `other-owner+${runId}@example.com`;

    await otherPage.goto("/signup");
    await otherPage.getByLabel("Email").fill(otherEmail);
    await otherPage.getByLabel("Password").fill(ownerPassword);
    await otherPage.getByRole("button", { name: "Create account" }).click();
    await otherPage.waitForURL(/\/onboarding$/);
    await otherPage.getByLabel("Business name").fill(`Unrelated Business ${runId}`);
    await otherPage.getByLabel("Business type").fill("Other");
    await otherPage.getByLabel("Primary goal").fill("Unrelated");
    await otherPage.getByRole("button", { name: "Create workspace" }).click();
    await otherPage.waitForURL(/\/app$/);

    await otherPage.goto("/app/leads");
    await expect(otherPage.getByText("No leads yet")).toBeVisible();
    await expect(otherPage.getByText(visitorName)).not.toBeVisible();

    await otherContext.close();
  });
});

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ownerEmail);
  await page.getByLabel("Password").fill(ownerPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"));
}
