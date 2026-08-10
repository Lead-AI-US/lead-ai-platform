import { z } from "zod";

export const aiAssetSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  provider: z.enum(["github", "huggingface", "kaggle"]),
  type: z.enum(["repository", "model", "dataset", "space", "notebook"]),
  externalId: z.string().min(1),
  title: z.string().min(1),
  referenceUrl: z.string().url().optional(),
  status: z.enum(["active", "disabled"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type AIAsset = z.infer<typeof aiAssetSchema>;

export function isAssetVisibleToWorkspace(asset: AIAsset, workspaceId: string): boolean {
  return asset.workspaceId === workspaceId;
}

export function assetTypeLabel(type: AIAsset["type"]): string {
  const labels: Record<AIAsset["type"], string> = {
    dataset: "Dataset",
    model: "Model",
    notebook: "Notebook",
    repository: "Repository",
    space: "Space",
  };

  return labels[type];
}
