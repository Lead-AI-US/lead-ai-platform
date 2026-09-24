import { test, expect, type Page } from "@playwright/test";

/**
 * Browser-driven test of the team-invite/role-change feature: an owner
 * invites a teammate by email from Settings, the teammate accepts via the
 * generated link (no live email provider in this environment, so the link
 * is copied and shared out-of-band — see TeamCard.tsx), the new membership
 * shows up with the invited role, the owner can change it, and the
 * last-active-owner protection actually blocks a demotion that would leave
 * the workspace without an owner.
 *
 * Requires the local stack already running — see e2e/pilotJourney.spec.ts's
 * docstring and docs/LOCAL_DEVELOPMENT.md.
 */

const runId = Date.now();
const ownerEmail = `invite-owner+${runId}@example.com`;
const ownerPassword = "InviteTest123!";
const memberEmail = `invite-member+${runId}@example.com`;
const memberPassword = "InviteTest123!";
const businessName = `Invite Test Business ${runId}`;

let inviteLink = "";

test.describe.serial("Team invites", () => {
  test("0. Owner signs up and creates a workspace", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("Email").fill(ownerEmail);
    await page.getByLabel("Password").fill(ownerPassword);
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL(/\/onboarding$/);

    await page.getByLabel("Business name").fill(businessName);
    await page.getByLabel("Business type").fill("Services");
    await page.getByLabel("Primary goal").fill("Capture more leads");
    await page.getByRole("button", { name: "Create workspace" }).click();
    await page.waitForURL(/\/app$/);
  });

  test("1. Owner invites a teammate and copies the invite link", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await signIn(page, ownerEmail, ownerPassword);
    await page.goto("/app/settings");

    // The owner's own row, keyed by their real Firebase uid, which the
    // test doesn't know in advance — locate by visible email instead.
    await expect(page.getByTestId(/^member-row-/).filter({ hasText: ownerEmail })).toBeVisible();

    await page.getByLabel("Email to invite").fill(memberEmail);
    await page.getByLabel("Role to invite as").selectOption("member");
    await page.getByRole("button", { name: "Invite" }).click();

    const inviteRow = page.getByTestId(/^invite-row-/).filter({ hasText: memberEmail });
    await expect(inviteRow).toBeVisible();
    await inviteRow.getByRole("button", { name: "Copy invite link" }).click();
    await expect(inviteRow.getByRole("button", { name: "Copied" })).toBeVisible();

    inviteLink = await page.evaluate(() => navigator.clipboard.readText());
    expect(inviteLink).toContain("/accept-invite?");
    expect(new URL(inviteLink).searchParams.get("email")).toBe(memberEmail);
  });

  test("2. Teammate accepts the invite as a brand-new account", async ({ browser }) => {
    expect(inviteLink).toBeTruthy();
    const memberContext = await browser.newContext();
    const memberPage = await memberContext.newPage();

    const url = new URL(inviteLink);
    await memberPage.goto(url.pathname + url.search);

    await expect(memberPage.getByText(`Use the email address this invite was sent to: ${memberEmail}`)).toBeVisible();
    await memberPage.getByRole("button", { name: "Need an account instead?" }).click();
    await memberPage.getByLabel("Email").fill(memberEmail);
    await memberPage.getByLabel("Password").fill(memberPassword);
    await memberPage.getByRole("button", { name: "Create account and accept" }).click();

    await expect(memberPage.getByRole("heading", { name: "You're in" })).toBeVisible({ timeout: 15_000 });
    await memberPage.getByRole("button", { name: "Go to your workspace" }).click();
    await memberPage.waitForURL(/\/app$/);

    await memberContext.close();
  });

  test("3. Owner sees the new member with the invited role and can change it", async ({ page }) => {
    await signIn(page, ownerEmail, ownerPassword);
    await page.goto("/app/settings");

    const memberRow = page.getByTestId(/^member-row-/).filter({ hasText: memberEmail });
    await expect(memberRow).toBeVisible();
    const roleSelect = memberRow.getByLabel(`Role for ${memberEmail}`);
    await expect(roleSelect).toHaveValue("member");

    await roleSelect.selectOption("admin");
    await page.reload();
    await expect(page.getByTestId(/^member-row-/).filter({ hasText: memberEmail }).getByLabel(`Role for ${memberEmail}`)).toHaveValue(
      "admin"
    );
  });

  test("4. The last active owner cannot demote themselves", async ({ page }) => {
    await signIn(page, ownerEmail, ownerPassword);
    await page.goto("/app/settings");

    const ownerRow = page.getByTestId(/^member-row-/).filter({ hasText: ownerEmail });
    const ownerRoleSelect = ownerRow.getByLabel(`Role for ${ownerEmail}`);
    await expect(ownerRoleSelect).toHaveValue("owner");

    await ownerRoleSelect.selectOption("admin");
    await expect(page.getByText("A workspace must keep at least one active owner.")).toBeVisible();

    await page.reload();
    await expect(page.getByTestId(/^member-row-/).filter({ hasText: ownerEmail }).getByLabel(`Role for ${ownerEmail}`)).toHaveValue(
      "owner"
    );
  });
});

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"));
}
