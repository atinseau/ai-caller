import { Info } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Separator } from "@/shared/components/ui/separator";
import { Textarea } from "@/shared/components/ui/textarea";

export interface ToolConfig {
  displayName?: string;
  description?: string;
  parameters?: Record<string, { description?: string }>;
}

interface ToolParameter {
  name: string;
  type?: string;
  description?: string;
  required: boolean;
}

interface ToolConfigDialogProps {
  tool: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  } | null;
  config: ToolConfig | undefined;
  onSave: (toolName: string, config: ToolConfig) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function extractParameters(params: Record<string, unknown>): ToolParameter[] {
  const properties = params.properties as
    | Record<string, { type?: string; description?: string }>
    | undefined;
  if (!properties) return [];

  const required = (params.required as string[]) ?? [];

  return Object.entries(properties).map(([name, schema]) => ({
    name,
    type: schema.type,
    description: schema.description,
    required: required.includes(name),
  }));
}

export function formatToolName(name: string): string {
  return name.replace(/_/g, " ");
}

export function ToolConfigDialog({
  tool,
  config,
  onSave,
  open,
  onOpenChange,
}: ToolConfigDialogProps) {
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [paramOverrides, setParamOverrides] = useState<Record<string, string>>(
    {},
  );

  useEffect(() => {
    if (tool) {
      setDisplayName(config?.displayName ?? "");
      setDescription(config?.description ?? "");

      const initialOverrides: Record<string, string> = {};
      const params = extractParameters(tool.parameters);
      for (const param of params) {
        initialOverrides[param.name] =
          config?.parameters?.[param.name]?.description ?? "";
      }
      setParamOverrides(initialOverrides);
    }
  }, [tool, config]);

  if (!tool) return null;

  const parameters = extractParameters(tool.parameters);

  function handleSave() {
    if (!tool) return;

    const paramConfigs: Record<string, { description?: string }> = {};
    for (const [name, desc] of Object.entries(paramOverrides)) {
      if (desc.trim()) {
        paramConfigs[name] = { description: desc.trim() };
      }
    }

    const cfg: ToolConfig = {};
    if (displayName.trim()) cfg.displayName = displayName.trim();
    if (description.trim()) cfg.description = description.trim();
    if (Object.keys(paramConfigs).length > 0) cfg.parameters = paramConfigs;

    onSave(tool.name, cfg);
    onOpenChange(false);
  }

  function handleReset() {
    if (!tool) return;
    onSave(tool.name, {});
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure tool</DialogTitle>
        </DialogHeader>

        {/* Tool identity */}
        <div className="rounded-lg bg-muted/50 border p-3 flex gap-2.5">
          <Info className="size-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-sm font-medium">{formatToolName(tool.name)}</p>
        </div>

        {/* Display name */}
        <div className="space-y-2">
          <Label htmlFor="tool-display-name">Display name</Label>
          <Input
            id="tool-display-name"
            placeholder={formatToolName(tool.name)}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Friendly name shown in the interface. Does not affect AI behavior.
          </p>
        </div>

        <Separator />

        {/* Two-column layout: prompt left, parameters right */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:items-stretch">
          {/* Left: Tool prompt */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="tool-description">System prompt</Label>
            <p className="text-xs text-muted-foreground">
              Instructions injected into the AI conversation to guide tool
              usage.
            </p>
            <Textarea
              id="tool-description"
              placeholder="Describe when and how the AI should use this tool, what context to provide, and any specific instructions..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="flex-1 min-h-[200px]"
            />
          </div>

          {/* Right: Parameters */}
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium">Parameters</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Describe each parameter to guide the AI.
              </p>
            </div>
            {parameters.length > 0 ? (
              <div className="space-y-3">
                {parameters.map((param) => (
                  <div key={param.name} className="space-y-1.5">
                    <Label
                      htmlFor={`param-${param.name}`}
                      className="text-xs font-medium"
                    >
                      {formatToolName(param.name)}
                      {param.required && (
                        <span className="text-destructive">*</span>
                      )}
                      {param.type && (
                        <span className="text-muted-foreground font-normal ml-1.5">
                          {param.type}
                        </span>
                      )}
                    </Label>
                    <Textarea
                      id={`param-${param.name}`}
                      placeholder={
                        param.description ?? "Describe this parameter..."
                      }
                      value={paramOverrides[param.name] ?? ""}
                      onChange={(e) =>
                        setParamOverrides((prev) => ({
                          ...prev,
                          [param.name]: e.target.value,
                        }))
                      }
                      className="min-h-[60px]"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                This tool has no configurable parameters.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" size="sm" onClick={handleReset}>
            Reset
          </Button>
          <div className="flex-1" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
