import {
  ArrowLeft,
  Check,
  CircleAlert,
  Loader2,
  Network,
  Plug,
  Save,
  Settings,
  Trash2,
  Wrench,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { WysiwygEditor } from "@/shared/components/data/WysiwygEditor";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { LoadingSpinner } from "@/shared/components/feedback/LoadingSpinner";
import { StatusBadge } from "@/shared/components/feedback/StatusBadge";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Separator } from "@/shared/components/ui/separator";
import { McpStatusEnum } from "@/shared/enums/mcp-status.enum";
import { UserRoleEnum } from "@/shared/enums/user-role.enum";
import { useCompany } from "@/shared/hooks/useCompany";
import { useCurrentUser } from "@/shared/hooks/useCurrentUser";
import { useDeleteCompany } from "@/shared/hooks/useDeleteCompany";
import { useUpdateCompany } from "@/shared/hooks/useUpdateCompany";

const mcpStatusConfig: Record<
  McpStatusEnum,
  { variant: "CONNECTED" | "ERROR" | "IDLE"; label: string }
> = {
  [McpStatusEnum.CONNECTED]: { variant: "CONNECTED", label: "MCP connected" },
  [McpStatusEnum.UNREACHABLE]: {
    variant: "ERROR",
    label: "MCP unreachable",
  },
  [McpStatusEnum.NOT_CONFIGURED]: {
    variant: "IDLE",
    label: "MCP not configured",
  },
};

export function CompanyDetailPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const state = useCurrentUser();
  const { data, isLoading } = useCompany(companyId ?? null);
  const { mutateAsync: deleteCompany, isPending: isDeleting } =
    useDeleteCompany();
  const { mutateAsync: updateCompany, isPending: isUpdating } =
    useUpdateCompany(companyId ?? "");

  const company = data?.company;
  const mcpStatus =
    (data?.mcpStatus as McpStatusEnum | undefined) ??
    McpStatusEnum.NOT_CONFIGURED;

  const isRoot =
    state.status === "authenticated" && state.user.role === UserRoleEnum.ROOT;

  const [systemPrompt, setSystemPrompt] = useState("");
  const [promptDirty, setPromptDirty] = useState(false);

  const [mcpUrl, setMcpUrl] = useState("");
  const [mcpDirty, setMcpDirty] = useState(false);

  useEffect(() => {
    if (company) {
      setSystemPrompt(company.systemPrompt ?? "");
      setMcpUrl(company.mcpUrl ?? "");
    }
  }, [company]);

  const handlePromptChange = useCallback(
    (value: string) => {
      setSystemPrompt(value);
      setPromptDirty(value !== (company?.systemPrompt ?? ""));
    },
    [company?.systemPrompt],
  );

  const handleMcpUrlChange = useCallback(
    (value: string) => {
      setMcpUrl(value);
      setMcpDirty(value !== (company?.mcpUrl ?? ""));
    },
    [company?.mcpUrl],
  );

  async function handleSavePrompt() {
    try {
      await updateCompany({ systemPrompt: systemPrompt || null });
      setPromptDirty(false);
      toast.success("System prompt saved");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save system prompt",
      );
    }
  }

  async function handleSaveMcpUrl() {
    try {
      await updateCompany({ mcpUrl: mcpUrl || null });
      setMcpDirty(false);
      toast.success("MCP configuration saved");
    } catch {
      toast.error("Failed to save MCP configuration");
    }
  }

  async function handleToggleStatus() {
    if (!company) return;
    const newStatus = company.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    if (newStatus === "INACTIVE") {
      // biome-ignore lint/suspicious/noAlert: confirmation dialog is intentional UX
      const confirmed = confirm(
        `Deactivate "${company.name}"? This will stop all active services.`,
      );
      if (!confirmed) return;
    }

    try {
      await updateCompany({ status: newStatus });
      toast.success(
        `Company ${newStatus === "ACTIVE" ? "activated" : "deactivated"}`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update company status",
      );
    }
  }

  async function handleDelete() {
    if (!company) return;
    // biome-ignore lint/suspicious/noAlert: confirmation dialog is intentional UX
    if (!confirm(`Delete "${company.name}"? This action cannot be undone.`))
      return;
    try {
      await deleteCompany(company.id);
      toast.success(`Company "${company.name}" deleted`);
      navigate("/dashboard/root");
    } catch {
      toast.error("Failed to delete company");
    }
  }

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingSpinner className="py-12" label="Loading company..." />
      </PageContainer>
    );
  }

  if (!company) {
    return (
      <PageContainer>
        <p className="text-sm text-muted-foreground">Company not found.</p>
      </PageContainer>
    );
  }

  const mcpBadge = mcpStatusConfig[mcpStatus];

  return (
    <PageContainer>
      {/* Back button */}
      {isRoot && (
        <button
          type="button"
          onClick={() => navigate("/dashboard/root")}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft className="size-3.5" />
          Companies
        </button>
      )}

      {/* Header — full width */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {company.name}
          </h1>
          <StatusBadge status={company.status} />
          <StatusBadge status={mcpBadge.variant} label={mcpBadge.label} />
        </div>
        {company.description && (
          <p className="text-sm text-muted-foreground">{company.description}</p>
        )}
        <p className="text-xs text-muted-foreground/60">
          Created{" "}
          {new Date(company.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      <Separator />

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        {/* Left column — scrollable content */}
        <div className="space-y-6 min-w-0">
          {/* System Prompt Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="size-4 text-muted-foreground" />
                System Prompt
              </CardTitle>
              <CardDescription>
                The main system prompt defines the AI assistant's identity,
                instructions, and behavior for this company.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <WysiwygEditor
                value={systemPrompt}
                onChange={handlePromptChange}
                placeholder="Define the AI assistant's personality, instructions, and behavior..."
                minHeight="250px"
              />
              <div className="flex justify-end">
                <Button
                  onClick={handleSavePrompt}
                  disabled={!promptDirty || isUpdating}
                  size="sm"
                  className="gap-1.5"
                >
                  {isUpdating ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : promptDirty ? (
                    <Save className="size-3.5" />
                  ) : (
                    <Check className="size-3.5" />
                  )}
                  {promptDirty ? "Save prompt" : "Saved"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* User Tools Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wrench className="size-4 text-muted-foreground" />
                Tools
              </CardTitle>
              <CardDescription>
                Tools available to the AI assistant, configured via MCP and N8N
                workflows.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mcpStatus === McpStatusEnum.CONNECTED ? (
                <EmptyState
                  icon={Wrench}
                  title="No tools discovered"
                  description="Connect to the MCP server to discover available tools."
                />
              ) : (
                <EmptyState
                  icon={Plug}
                  title="MCP not available"
                  description={
                    mcpStatus === McpStatusEnum.NOT_CONFIGURED
                      ? "Configure the MCP server URL in the settings to discover and manage tools."
                      : "The MCP server is unreachable. Check the URL and server status."
                  }
                />
              )}
            </CardContent>
          </Card>

          {/* System Tools Card (admin only) */}
          {isRoot && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Network className="size-4 text-muted-foreground" />
                  System Tools
                </CardTitle>
                <CardDescription>
                  Platform-level tools injected by the system. Only visible to
                  administrators.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EmptyState
                  icon={Network}
                  title="No system tools configured"
                  description="System tools will appear here once configured."
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column — sticky sidebar */}
        <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="size-4 text-muted-foreground" />
                Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* MCP Configuration — ROOT only */}
              {isRoot && (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium">MCP Server</h3>
                      <StatusBadge
                        status={mcpBadge.variant}
                        label={
                          mcpStatus === McpStatusEnum.CONNECTED
                            ? "Connected"
                            : mcpStatus === McpStatusEnum.UNREACHABLE
                              ? "Unreachable"
                              : "Not configured"
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mcpUrl" className="sr-only">
                        MCP Server URL
                      </Label>
                      <Input
                        id="mcpUrl"
                        type="url"
                        placeholder="https://mcp.example.com"
                        value={mcpUrl}
                        onChange={(e) => handleMcpUrlChange(e.target.value)}
                      />
                      <Button
                        onClick={handleSaveMcpUrl}
                        disabled={!mcpDirty || isUpdating}
                        size="sm"
                        className="w-full gap-1.5"
                      >
                        {isUpdating ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Save className="size-3.5" />
                        )}
                        Save
                      </Button>
                    </div>
                    {mcpStatus === McpStatusEnum.NOT_CONFIGURED && (
                      <p className="flex items-start gap-1.5 text-xs text-amber-600">
                        <CircleAlert className="size-3.5 shrink-0 mt-0.5" />
                        MCP server URL is required for tool discovery.
                      </p>
                    )}
                    {mcpStatus === McpStatusEnum.UNREACHABLE && (
                      <p className="flex items-start gap-1.5 text-xs text-destructive">
                        <CircleAlert className="size-3.5 shrink-0 mt-0.5" />
                        Cannot reach the MCP server. Verify the URL and server
                        status.
                      </p>
                    )}
                  </div>

                  <Separator />
                </>
              )}

              {/* Activation — all users */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Activation</h3>
                <div className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Company status</p>
                    <StatusBadge status={company.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {company.status === "ACTIVE"
                      ? "The company is active and receiving calls."
                      : "The company is inactive. No calls will be processed."}
                  </p>
                  <Button
                    variant={
                      company.status === "ACTIVE" ? "outline" : "default"
                    }
                    size="sm"
                    className="w-full"
                    onClick={handleToggleStatus}
                    disabled={isUpdating}
                  >
                    {company.status === "ACTIVE" ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </div>

              {/* Danger Zone — ROOT only */}
              {isRoot && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-destructive">
                      Danger Zone
                    </h3>
                    <div className="rounded-lg border border-destructive/30 p-3 space-y-2">
                      <p className="text-sm font-medium">Delete company</p>
                      <p className="text-xs text-muted-foreground">
                        Permanently delete this company and all associated data.
                      </p>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="w-full gap-1.5"
                      >
                        <Trash2 className="size-3.5" />
                        {isDeleting ? "Deleting..." : "Delete"}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
