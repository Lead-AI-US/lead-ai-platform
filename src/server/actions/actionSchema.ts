import { z } from "zod";
import type { AgentActionType } from "@/types/action.js";

export const SUPPORTED_ACTION_TYPES = [
  "create_lead",
  "update_lead_stage",
  "request_handoff",
  "schedule_followup",
  "add_customer_tag",
  "create_internal_note",
] as const satisfies readonly AgentActionType[];

const BaseActionSchema = z.object({
  workspaceId: z.string().trim().min(1).max(200),
  customerId: z.string().trim().max(200).optional(),
  leadId: z.string().trim().max(200).optional(),
  conversationId: z.string().trim().max(200).optional(),
  sourceEventId: z.string().trim().max(200).optional(),
  automationRunId: z.string().trim().max(200).optional(),
  idempotencyKey: z.string().trim().min(8).max(300),
  rationale: z.string().trim().max(1000).optional(),
  proposedBy: z.object({
    type: z.enum(["ai", "user", "system", "automation"]),
    id: z.string().trim().max(200).optional(),
  }),
  approvedBy: z.string().trim().max(200).optional(),
});

const CreateLeadSchema = BaseActionSchema.extend({
  type: z.literal("create_lead"),
  payload: z.object({
    source: z.enum(["website_chat", "manual"]),
    name: z.string().trim().max(200).optional(),
    email: z.string().trim().email().max(320).optional(),
    phone: z.string().trim().max(40).optional(),
    message: z.string().trim().max(2000).optional(),
    intent: z.string().trim().max(120).optional(),
  }),
});

const UpdateLeadStageSchema = BaseActionSchema.extend({
  type: z.literal("update_lead_stage"),
  leadId: z.string().trim().min(1).max(200),
  payload: z.object({
    status: z.enum(["new", "reviewed", "contacted", "qualified", "not_ready", "closed"]),
    nextAction: z.string().trim().max(300).optional(),
    nextActionAt: z.string().datetime().optional(),
  }),
});

const RequestHandoffSchema = BaseActionSchema.extend({
  type: z.literal("request_handoff"),
  conversationId: z.string().trim().min(1).max(200),
  payload: z.object({
    reason: z.string().trim().max(500).optional(),
  }),
});

const ScheduleFollowupSchema = BaseActionSchema.extend({
  type: z.literal("schedule_followup"),
  leadId: z.string().trim().min(1).max(200),
  payload: z.object({
    nextAction: z.string().trim().min(1).max(300),
    nextActionAt: z.string().datetime(),
  }),
});

const AddCustomerTagSchema = BaseActionSchema.extend({
  type: z.literal("add_customer_tag"),
  customerId: z.string().trim().min(1).max(200),
  payload: z.object({
    tag: z.string().trim().min(1).max(80),
  }),
});

const CreateInternalNoteSchema = BaseActionSchema.extend({
  type: z.literal("create_internal_note"),
  customerId: z.string().trim().min(1).max(200),
  payload: z.object({
    note: z.string().trim().min(1).max(1000),
  }),
});

export const ActionProposalSchema = z.discriminatedUnion("type", [
  CreateLeadSchema,
  UpdateLeadStageSchema,
  RequestHandoffSchema,
  ScheduleFollowupSchema,
  AddCustomerTagSchema,
  CreateInternalNoteSchema,
]);

export type ActionProposal = z.infer<typeof ActionProposalSchema>;

export function isSupportedActionType(type: string): type is (typeof SUPPORTED_ACTION_TYPES)[number] {
  return (SUPPORTED_ACTION_TYPES as readonly string[]).includes(type);
}

export function parseActionProposal(input: unknown): ActionProposal {
  if (
    typeof input === "object" &&
    input !== null &&
    "type" in input &&
    typeof input.type === "string" &&
    !isSupportedActionType(input.type)
  ) {
    throw Object.assign(new Error("Unsupported action type"), { code: "ACTION_NOT_SUPPORTED" });
  }

  const parsed = ActionProposalSchema.safeParse(input);
  if (!parsed.success) {
    throw Object.assign(new Error("Invalid action schema"), { code: "ACTION_INVALID_STATE" });
  }

  return parsed.data;
}
