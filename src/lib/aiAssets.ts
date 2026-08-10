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
export type AIAssetProvider = AIAsset["provider"];
export type AIAssetType = AIAsset["type"];
export type AIAssetStatus = AIAsset["status"];

export const AI_ASSET_TYPES: AIAssetType[] = ["repository", "model", "dataset", "space", "notebook"];
export const AI_ASSET_PROVIDERS: AIAssetProvider[] = ["github", "huggingface", "kaggle"];
export const AI_ASSET_STATUSES: AIAssetStatus[] = ["active", "disabled"];

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

export function groupAssetsByType(assets: AIAsset[]): Record<AIAssetType, AIAsset[]> {
  return AI_ASSET_TYPES.reduce(
    (groups, type) => ({
      ...groups,
      [type]: assets.filter((asset) => asset.type === type),
    }),
    {} as Record<AIAssetType, AIAsset[]>
  );
}

export function assetStatusLabel(status: AIAssetStatus): string {
  return status === "active" ? "Active" : "Disabled";
}
