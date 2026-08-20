import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "@/lib/api/client";
import { searchCommands, type CommandAction } from "@/lib/commandRegistry";

export function CommandPalette({
  commands,
  workspaceId,
  open,
  onOpenChange,
}: {
  commands: CommandAction[];
  workspaceId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [workspaceResults, setWorkspaceResults] = useState<WorkspaceSearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const results = useMemo(() => searchCommands(commands, query), [commands, query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setWorkspaceResults([]);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    if (!open || !workspaceId || query.trim().length < 2) {
      setWorkspaceResults([]);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      apiGet<WorkspaceSearchResponse>(`/api/workspaces/${workspaceId}/search?q=${encodeURIComponent(query)}`)
        .then((response) => {
          if (!controller.signal.aborted) setWorkspaceResults(response.results);
        })
        .catch(() => {
          if (!controller.signal.aborted) setWorkspaceResults([]);
        });
    }, 200);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [open, query, workspaceId]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onOpenChange, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 p-4 backdrop-blur-sm" onMouseDown={() => onOpenChange(false)} role="presentation">
      <section
        className="mx-auto mt-[10vh] w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-surface/96 shadow-lift backdrop-blur-xl"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-border bg-card/70 p-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <Search className="h-4 w-4" aria-hidden="true" />
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search commands"
            placeholder="Search workspace, records, and commands"
            className="min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close command palette"
            className="rounded-md p-2 text-muted-foreground hover:bg-surface-interactive hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="max-h-[480px] overflow-y-auto p-2">
          {workspaceResults.length > 0 && (
            <div className="mb-2">
              <p className="px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Workspace</p>
              {workspaceResults.map((result) => (
                <button
                  key={`${result.type}:${result.id}`}
                  type="button"
                  className="grid w-full gap-1 rounded-lg px-3 py-2 text-left transition-colors hover:bg-surface-interactive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  onClick={() => {
                    navigate(result.href);
                    onOpenChange(false);
                  }}
                >
                  <span className="text-sm font-medium">{result.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {result.type.replace("_", " ")} - {result.subtitle}
                  </span>
                </button>
              ))}
            </div>
          )}
          <p className="px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Commands</p>
          {results.map((command) => (
            <button
              key={command.id}
              type="button"
              className="grid w-full gap-1 rounded-lg px-3 py-2 text-left transition-colors hover:bg-surface-interactive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => {
                void command.run();
                onOpenChange(false);
              }}
            >
              <span className="text-sm font-medium">{command.label}</span>
              <span className="text-xs text-muted-foreground">{command.description}</span>
            </button>
          ))}
          {results.length === 0 && workspaceResults.length === 0 && (
            <p className="rounded-lg border border-dashed border-border bg-card/60 p-4 text-sm text-muted-foreground">No matching results.</p>
          )}
        </div>
      </section>
    </div>
  );
}

interface WorkspaceSearchResponse {
  results: WorkspaceSearchResult[];
}

interface WorkspaceSearchResult {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  href: string;
}
