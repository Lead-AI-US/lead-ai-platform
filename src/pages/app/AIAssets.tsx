import { BrainCircuit } from "lucide-react";
import { PageHeader } from "@/app/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useWorkspace } from "@/lib/workspace/WorkspaceProvider";

const assetGroups = [
  {
    title: "Repositories",
    provider: "GitHub",
    description: "Repository references will appear after GitHub authorization and metadata sync are configured.",
  },
  {
    title: "Models",
    provider: "Hugging Face",
    description: "Model references will appear after Hugging Face authorization and metadata sync are configured.",
  },
  {
    title: "Datasets",
    provider: "Kaggle / Hugging Face",
    description: "Dataset references will appear after provider sync is explicitly configured.",
  },
];

export default function AIAssets() {
  const { workspace } = useWorkspace();
  if (!workspace) return null;

  return (
    <div>
      <PageHeader
        eyebrow="AI Assets"
        title="AI Assets"
        description="A metadata registry for external AI and data resources. Large files, model weights, and datasets are not copied into Firestore."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {assetGroups.map((group) => (
          <Card key={group.title}>
            <CardHeader>
              <CardTitle>{group.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge>{group.provider}</Badge>
              <EmptyState icon={BrainCircuit} title="No linked assets" description={group.description} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
