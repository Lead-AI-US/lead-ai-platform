import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { searchCommands, type CommandAction } from "@/lib/commandRegistry";

export function CommandPalette({
  commands,
  open,
  onOpenChange,
}: {
  commands: CommandAction[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const results = useMemo(() => searchCommands(commands, query), [commands, query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

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
    <div className="fixed inset-0 z-50 bg-black/40 p-4" onMouseDown={() => onOpenChange(false)} role="presentation">
      <section
        className="mx-auto mt-[10vh] w-full max-w-2xl rounded-lg border border-border bg-background shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-border p-3">
          <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search commands"
            placeholder="Search commands and pages"
            className="min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close command palette"
            className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="max-h-[420px] overflow-y-auto p-2">
          {results.map((command) => (
            <button
              key={command.id}
              type="button"
              className="grid w-full gap-1 rounded-md px-3 py-2 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => {
                void command.run();
                onOpenChange(false);
              }}
            >
              <span className="text-sm font-medium">{command.label}</span>
              <span className="text-xs text-muted-foreground">{command.description}</span>
            </button>
          ))}
          {results.length === 0 && <p className="p-4 text-sm text-muted-foreground">No matching commands.</p>}
        </div>
      </section>
    </div>
  );
}
