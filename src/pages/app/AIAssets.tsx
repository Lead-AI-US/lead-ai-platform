import { type ReactNode, useMemo, useState } from "react";
import { BrainCircuit } from "lucide-react";
import { PageHeader } from "@/app/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import {
  AI_ASSET_PROVIDERS,
  AI_ASSET_STATUSES,
  AI_ASSET_TYPES,
  assetStatusLabel,
  assetTypeLabel,
  groupAssetsByType,
  isAssetVisibleToWorkspace,
  type AIAsset,
  type AIAssetProvider,
  type AIAssetStatus,
  type AIAssetType,
} from "@/lib/aiAssets";
import { providerLabel } from "@/lib/integrations";
import { useWorkspace } from "@/lib/workspace/WorkspaceProvider";

const assets: AIAsset[] = [];

const assetGroupCopy: Record<AIAssetType, { title: string; description: string }> = {
  repository: {
    title: "Repositories",
    description: "Repository references will appear after GitHub authorization and workspace metadata sync are configured.",
  },
  model: {
    title: "Models",
    description: "Model references will appear after Hugging Face authorization and workspace metadata sync are configured.",
  },
  dataset: {
    title: "Datasets",
    description: "Dataset references will appear after Hugging Face or Kaggle sync is explicitly configured.",
  },
  space: {
    title: "Spaces",
    description: "Space references will appear after Hugging Face sync is explicitly configured.",
  },
  notebook: {
    title: "Notebooks",
    description: "Notebook references will appear after Kaggle sync is explicitly configured.",
  },
};

export default function AIAssets() {
  const { workspace } = useWorkspace();
  const [provider, setProvider] = useState<AIAssetProvider | "all">("all");
  const [type, setType] = useState<AIAssetType | "all">("all");
  const [status, setStatus] = useState<AIAssetStatus | "all">("all");
  const [search, setSearch] = useState("");

  const filteredAssets = useMemo(
    () =>
      assets.filter((asset) => {
        if (!workspace || !isAssetVisibleToWorkspace(asset, workspace.id)) return false;
        if (provider !== "all" && asset.provider !== provider) return false;
        if (type !== "all" && asset.type !== type) return false;
        if (status !== "all" && asset.status !== status) return false;
        const haystack = [asset.title, asset.externalId, asset.referenceUrl, asset.provider, asset.type].join(" ").toLowerCase();
        return haystack.includes(search.toLowerCase());
      }),
    [provider, search, status, type, workspace]
  );
  const grouped = groupAssetsByType(filteredAssets);

  if (!workspace) return null;

  return (
    <div>
      <PageHeader
        eyebrow="AI Assets"
        title="AI Assets"
        description="A metadata registry for external AI and data resources. Large files, model weights, and datasets are not copied into Firestore."
      />
      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_180px_180px_180px]">
        <label className="text-sm">
          <span className="sr-only">Search AI assets</span>
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search assets" />
        </label>
        <Filter label="Provider" value={provider} onChange={(next) => setProvider(next as AIAssetProvider | "all")}>
          {AI_ASSET_PROVIDERS.map((id) => (
            <option key={id} value={id}>
              {providerLabel(id)}
            </option>
          ))}
        </Filter>
        <Filter label="Type" value={type} onChange={(next) => setType(next as AIAssetType | "all")}>
          {AI_ASSET_TYPES.map((assetType) => (
            <option key={assetType} value={assetType}>
              {assetTypeLabel(assetType)}
            </option>
          ))}
        </Filter>
        <Filter label="Status" value={status} onChange={(next) => setStatus(next as AIAssetStatus | "all")}>
          {AI_ASSET_STATUSES.map((assetStatus) => (
            <option key={assetStatus} value={assetStatus}>
              {assetStatusLabel(assetStatus)}
            </option>
          ))}
        </Filter>
      </div>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {AI_ASSET_TYPES.map((assetType) => {
          const group = assetGroupCopy[assetType];
          return (
            <Card key={assetType}>
              <CardHeader>
                <CardTitle>{group.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Badge>{assetTypeLabel(assetType)}</Badge>
                {grouped[assetType].length ? (
                  <div className="grid gap-2">
                    {grouped[assetType].map((asset) => (
                      <div key={asset.id} className="rounded-md border border-border p-3 text-sm">
                        <div className="font-medium">{asset.title}</div>
                        <div className="text-xs text-muted-foreground">{asset.externalId}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={BrainCircuit} title="No linked assets" description={group.description} />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Filter({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="text-sm">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <option value="all">All {label.toLowerCase()}</option>
        {children}
      </select>
    </label>
  );
}
