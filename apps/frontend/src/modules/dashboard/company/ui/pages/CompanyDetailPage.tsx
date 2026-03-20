import {
  ArrowLeft,
  Check,
  CircleAlert,
  Loader2,
  Network,
  Pause,
  Phone,
  Play,
  Plug,
  Save,
  Settings,
  Trash2,
  Volume2,
  Wrench,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Separator } from "@/shared/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";
import { Textarea } from "@/shared/components/ui/textarea";
import { LanguageEnum } from "@/shared/enums/language.enum";
import { McpStatusEnum } from "@/shared/enums/mcp-status.enum";
import {
  PROMPT_SECTION_META,
  PromptSection,
} from "@/shared/enums/prompt-section.enum";
import { UserRoleEnum } from "@/shared/enums/user-role.enum";
import { VoiceEnum } from "@/shared/enums/voice.enum";
import { useCompany } from "@/shared/hooks/useCompany";
import { useCurrentUser } from "@/shared/hooks/useCurrentUser";
import { useDeleteCompany } from "@/shared/hooks/useDeleteCompany";
import {
  useProvisionPhoneNumber,
  useReleasePhoneNumber,
} from "@/shared/hooks/usePhoneNumber";
import { useUpdateCompany } from "@/shared/hooks/useUpdateCompany";
import {
  formatToolName,
  type ToolConfig,
  ToolConfigDialog,
} from "../components/ToolConfigDialog";

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

const LANGUAGE_LABELS: Record<string, string> = {
  [LanguageEnum.FR]: "French",
  [LanguageEnum.EN]: "English",
  [LanguageEnum.ES]: "Spanish",
  [LanguageEnum.DE]: "German",
  [LanguageEnum.IT]: "Italian",
  [LanguageEnum.PT]: "Portuguese",
  [LanguageEnum.NL]: "Dutch",
  [LanguageEnum.PL]: "Polish",
  [LanguageEnum.RU]: "Russian",
  [LanguageEnum.JA]: "Japanese",
  [LanguageEnum.ZH]: "Chinese",
  [LanguageEnum.KO]: "Korean",
  [LanguageEnum.AR]: "Arabic",
  [LanguageEnum.TR]: "Turkish",
};

const SYSTEM_TOOLS = [
  {
    name: "close_call",
    label: "Close Call",
    description:
      "Custom instructions appended to the close call tool prompt. Use this to personalize the AI's behavior when ending a call.",
  },
  {
    name: "get_tool_status",
    label: "Get Tool Status",
    description:
      "Custom instructions appended to the tool status check prompt.",
  },
] as const;

const COUNTRY_OPTIONS = [
  { value: "US", label: "United States (+1)" },
  { value: "GB", label: "United Kingdom (+44)" },
  { value: "FR", label: "France (+33)" },
  { value: "DE", label: "Germany (+49)" },
  { value: "ES", label: "Spain (+34)" },
  { value: "IT", label: "Italy (+39)" },
  { value: "NL", label: "Netherlands (+31)" },
  { value: "PT", label: "Portugal (+351)" },
  { value: "BE", label: "Belgium (+32)" },
  { value: "CH", label: "Switzerland (+41)" },
  { value: "CA", label: "Canada (+1)" },
  { value: "AU", label: "Australia (+61)" },
] as const;

export function CompanyDetailPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const state = useCurrentUser();
  const { data, isLoading, isFetching } = useCompany(companyId ?? null);
  const { mutateAsync: deleteCompany, isPending: isDeleting } =
    useDeleteCompany();
  const { mutateAsync: updateCompany, isPending: isUpdating } =
    useUpdateCompany(companyId ?? "");
  const { mutateAsync: provisionPhone, isPending: isProvisioning } =
    useProvisionPhoneNumber(companyId ?? "");
  const { mutateAsync: releasePhone, isPending: isReleasing } =
    useReleasePhoneNumber(companyId ?? "");

  const company = data?.company;
  const mcpStatus =
    (data?.mcpStatus as McpStatusEnum | undefined) ??
    McpStatusEnum.NOT_CONFIGURED;
  const tools = data?.tools ?? [];
  const phoneNumber = (data as Record<string, unknown>)?.phoneNumber as
    | { id: string; phoneNumber: string; companyId: string }
    | null
    | undefined;

  const isRoot =
    state.status === "authenticated" && state.user.role === UserRoleEnum.ROOT;

  const [promptSections, setPromptSections] = useState<Record<string, string>>(
    {},
  );
  const [activeSection, setActiveSection] = useState<PromptSection>(
    PromptSection.ROLE_OBJECTIVE,
  );
  const [promptDirty, setPromptDirty] = useState(false);

  const [mcpUrl, setMcpUrl] = useState("");
  const [mcpDirty, setMcpDirty] = useState(false);

  const [toolConfigs, setToolConfigs] = useState<Record<string, ToolConfig>>(
    {},
  );
  const [selectedToolName, setSelectedToolName] = useState<string | null>(null);

  const [systemToolPrompts, setSystemToolPrompts] = useState<
    Record<string, string>
  >({});
  const [systemToolPromptsDirty, setSystemToolPromptsDirty] = useState(false);

  const [voice, setVoice] = useState<string>(VoiceEnum.MARIN);
  const [language, setLanguage] = useState<string>(LanguageEnum.FR);
  const [voiceConfigDirty, setVoiceConfigDirty] = useState(false);

  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [provisionCountry, setProvisionCountry] = useState("US");

  useEffect(() => {
    if (company) {
      const sections =
        (company.systemPromptSections as Record<string, string> | null) ?? {};
      setPromptSections(sections);
      setPromptDirty(false);
      setMcpUrl(company.mcpUrl ?? "");
      setToolConfigs(
        (company.toolConfigs as Record<string, ToolConfig> | null) ?? {},
      );
      setSystemToolPrompts(
        (company.systemToolPrompts as Record<string, string> | null) ?? {},
      );
      setSystemToolPromptsDirty(false);
      setVoice(company.voice ?? VoiceEnum.MARIN);
      setLanguage(company.language ?? LanguageEnum.FR);
      setVoiceConfigDirty(false);
    }
  }, [company]);

  const handleSectionChange = useCallback(
    (value: string) => {
      setPromptSections((prev) => {
        const next = { ...prev };
        if (value.trim()) {
          next[activeSection] = value;
        } else {
          delete next[activeSection];
        }
        return next;
      });
      setPromptDirty(true);
    },
    [activeSection],
  );

  const handleMcpUrlChange = useCallback(
    (value: string) => {
      setMcpUrl(value);
      setMcpDirty(value !== (company?.mcpUrl ?? ""));
    },
    [company?.mcpUrl],
  );

  const handleNavigateToSession = useCallback(() => {
    if (isRoot) {
      navigate(`/dashboard/root/session/${companyId}`);
    } else {
      navigate("/dashboard/session");
    }
  }, [isRoot, navigate, companyId]);

  const handleToolConfigSave = useCallback(
    async (toolName: string, config: ToolConfig) => {
      const next = { ...toolConfigs };
      if (Object.keys(config).length === 0) {
        delete next[toolName];
      } else {
        next[toolName] = config;
      }
      setToolConfigs(next);

      try {
        const configs = Object.keys(next).length > 0 ? next : null;
        await updateCompany({ toolConfigs: configs });
        toast.success("Tool configuration saved");
      } catch {
        toast.error("Failed to save tool configuration");
      }
    },
    [toolConfigs, updateCompany],
  );

  const handleSystemToolPromptChange = useCallback(
    (toolName: string, value: string) => {
      setSystemToolPrompts((prev) => {
        const next = { ...prev };
        if (value.trim()) {
          next[toolName] = value;
        } else {
          delete next[toolName];
        }
        return next;
      });
      setSystemToolPromptsDirty(true);
    },
    [],
  );

  async function handleSaveSystemToolPrompts() {
    try {
      const prompts =
        Object.keys(systemToolPrompts).length > 0 ? systemToolPrompts : null;
      await updateCompany({ systemToolPrompts: prompts });
      setSystemToolPromptsDirty(false);
      toast.success("System tool prompts saved");
    } catch {
      toast.error("Failed to save system tool prompts");
    }
  }

  async function handleSaveVoiceConfig() {
    try {
      await updateCompany({
        voice: voice as VoiceEnum,
        language: language as LanguageEnum,
      });
      setVoiceConfigDirty(false);
      toast.success("Voice configuration saved");
    } catch {
      toast.error("Failed to save voice configuration");
    }
  }

  async function handlePreviewVoice() {
    if (previewPlaying && previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
      setPreviewPlaying(false);
      return;
    }

    setPreviewLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const url = `${apiUrl}/api/v1/voice/preview?voice=${encodeURIComponent(voice)}&language=${encodeURIComponent(language)}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch preview");

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const audio = new Audio(objectUrl);
      previewAudioRef.current = audio;

      audio.onended = () => {
        setPreviewPlaying(false);
        URL.revokeObjectURL(objectUrl);
      };
      audio.onerror = () => {
        setPreviewPlaying(false);
        URL.revokeObjectURL(objectUrl);
      };

      setPreviewLoading(false);
      setPreviewPlaying(true);
      await audio.play();
    } catch {
      setPreviewLoading(false);
      setPreviewPlaying(false);
      toast.error("Failed to preview voice");
    }
  }

  async function handleSavePrompt() {
    try {
      const hasContent = Object.values(promptSections).some(
        (v) => v && v.trim() !== "",
      );
      await updateCompany({
        systemPromptSections: hasContent ? promptSections : null,
      });
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

  if (isLoading || (!company && isFetching)) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner label="Loading company..." />
      </div>
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
          <div className="ml-auto">
            <Button
              size="sm"
              className="gap-1.5"
              disabled={
                mcpStatus === McpStatusEnum.NOT_CONFIGURED && tools.length === 0
              }
              onClick={handleNavigateToSession}
            >
              <Play className="size-3.5" />
              Essayer
            </Button>
          </div>
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
                Configure each section of the AI agent's prompt. All sections
                are merged into a single prompt at call time, following OpenAI's
                recommended structure.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs
                value={activeSection}
                onValueChange={(v) => setActiveSection(v as PromptSection)}
                className="gap-6"
              >
                <TabsList className="w-auto max-w-full overflow-x-auto overflow-y-hidden h-auto justify-start">
                  {Object.values(PromptSection).map((section) => {
                    const meta = PROMPT_SECTION_META[section];
                    const hasContent = !!promptSections[section]?.trim();
                    return (
                      <TabsTrigger
                        key={section}
                        value={section}
                        className="gap-1.5"
                      >
                        {hasContent ? (
                          <Check className="size-3.5 text-emerald-500" />
                        ) : (
                          <CircleAlert className="size-3.5 text-amber-500" />
                        )}
                        {meta.shortLabel}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {Object.values(PromptSection).map((section) => {
                  const meta = PROMPT_SECTION_META[section];
                  return (
                    <TabsContent
                      key={section}
                      value={section}
                      className="space-y-3"
                    >
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium">{meta.label}</h4>
                        <p className="text-xs text-muted-foreground">
                          {meta.description}
                        </p>
                      </div>
                      <WysiwygEditor
                        key={section}
                        value={promptSections[section] ?? ""}
                        onChange={handleSectionChange}
                        placeholder={meta.placeholder}
                        minHeight="200px"
                      />
                    </TabsContent>
                  );
                })}
              </Tabs>
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
                tools.length > 0 ? (
                  <div className="space-y-3">
                    {tools.map((tool) => {
                      const cfg = toolConfigs[tool.name];
                      const paramCount = Object.keys(
                        (tool.parameters as Record<string, unknown>)
                          ?.properties ?? {},
                      ).length;
                      const isConfigured =
                        cfg?.description && cfg.description.trim().length > 0;
                      return (
                        <div
                          key={tool.name}
                          className="rounded-lg border p-3 flex items-center gap-3"
                        >
                          {!isConfigured && (
                            <CircleAlert className="size-4 text-amber-500 shrink-0" />
                          )}
                          <div className="flex-1 min-w-0 space-y-1">
                            <p className="text-sm font-medium">
                              {cfg?.displayName || formatToolName(tool.name)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {paramCount}{" "}
                              {paramCount > 1 ? "parameters" : "parameter"}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 shrink-0"
                            onClick={() => setSelectedToolName(tool.name)}
                          >
                            <Settings className="size-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    icon={Wrench}
                    title="No tools discovered"
                    description="The MCP server is connected but no tools were found."
                  />
                )
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
                  Custom prompts appended to built-in system tool descriptions.
                  Leave empty to use defaults. Only visible to administrators.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {SYSTEM_TOOLS.map((tool) => (
                  <div key={tool.name} className="space-y-2">
                    <Label htmlFor={`system-tool-${tool.name}`}>
                      {tool.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {tool.description}
                    </p>
                    <Textarea
                      id={`system-tool-${tool.name}`}
                      placeholder="Enter custom instructions for this tool..."
                      value={systemToolPrompts[tool.name] ?? ""}
                      onChange={(e) =>
                        handleSystemToolPromptChange(tool.name, e.target.value)
                      }
                      className="min-h-[100px]"
                    />
                  </div>
                ))}
                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveSystemToolPrompts}
                    disabled={!systemToolPromptsDirty || isUpdating}
                    size="sm"
                    className="gap-1.5"
                  >
                    {isUpdating ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : systemToolPromptsDirty ? (
                      <Save className="size-3.5" />
                    ) : (
                      <Check className="size-3.5" />
                    )}
                    {systemToolPromptsDirty ? "Save prompts" : "Saved"}
                  </Button>
                </div>
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

              {/* Voice Configuration */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Voice Configuration</h3>
                <div className="space-y-2">
                  <Label htmlFor="voice">Voice</Label>
                  <div className="flex items-center gap-2">
                    <Select
                      value={voice}
                      onValueChange={(v) => {
                        setVoice(v);
                        setVoiceConfigDirty(true);
                        if (previewPlaying && previewAudioRef.current) {
                          previewAudioRef.current.pause();
                          setPreviewPlaying(false);
                        }
                      }}
                    >
                      <SelectTrigger id="voice" className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(VoiceEnum).map((v) => (
                          <SelectItem key={v} value={v}>
                            {v.charAt(0).toUpperCase() + v.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-9 shrink-0"
                      onClick={handlePreviewVoice}
                      disabled={previewLoading}
                    >
                      {previewLoading ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : previewPlaying ? (
                        <Pause className="size-4" />
                      ) : (
                        <Volume2 className="size-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select
                    value={language}
                    onValueChange={(v) => {
                      setLanguage(v);
                      setVoiceConfigDirty(true);
                    }}
                  >
                    <SelectTrigger id="language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(LanguageEnum).map((l) => (
                        <SelectItem key={l} value={l}>
                          {LANGUAGE_LABELS[l] ?? l} ({l})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleSaveVoiceConfig}
                  disabled={!voiceConfigDirty || isUpdating}
                  size="sm"
                  className="w-full gap-1.5"
                >
                  {isUpdating ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : voiceConfigDirty ? (
                    <Save className="size-3.5" />
                  ) : (
                    <Check className="size-3.5" />
                  )}
                  {voiceConfigDirty ? "Save voice config" : "Saved"}
                </Button>
              </div>

              <Separator />

              {/* Telephony */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Telephony</h3>
                {phoneNumber ? (
                  <div className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Phone className="size-4 text-muted-foreground" />
                      <p className="text-sm font-medium">
                        {phoneNumber.phoneNumber}
                      </p>
                    </div>
                    {isRoot && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-1.5"
                        onClick={async () => {
                          if (
                            // biome-ignore lint/suspicious/noAlert: confirmation dialog is intentional UX
                            !confirm(
                              `Release ${phoneNumber.phoneNumber}? This will stop receiving calls on this number.`,
                            )
                          )
                            return;
                          try {
                            await releasePhone();
                            toast.success("Phone number released");
                          } catch {
                            toast.error("Failed to release phone number");
                          }
                        }}
                        disabled={isReleasing}
                      >
                        {isReleasing ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                        Release number
                      </Button>
                    )}
                  </div>
                ) : isRoot ? (
                  <div className="space-y-2">
                    <Label htmlFor="provisionCountry">Country</Label>
                    <Select
                      value={provisionCountry}
                      onValueChange={setProvisionCountry}
                    >
                      <SelectTrigger id="provisionCountry">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRY_OPTIONS.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      className="w-full gap-1.5"
                      onClick={async () => {
                        try {
                          const result = await provisionPhone({
                            country: provisionCountry,
                          });
                          toast.success(
                            `Phone number ${result.phoneNumber} provisioned`,
                          );
                        } catch (error) {
                          toast.error(
                            error instanceof Error
                              ? error.message
                              : "Failed to provision phone number",
                          );
                        }
                      }}
                      disabled={isProvisioning}
                    >
                      {isProvisioning ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Phone className="size-3.5" />
                      )}
                      Provision number
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No phone number configured.
                  </p>
                )}
              </div>

              <Separator />

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
      <ToolConfigDialog
        tool={
          selectedToolName
            ? (tools.find((t) => t.name === selectedToolName) ?? null)
            : null
        }
        config={selectedToolName ? toolConfigs[selectedToolName] : undefined}
        onSave={handleToolConfigSave}
        open={selectedToolName !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedToolName(null);
        }}
      />
    </PageContainer>
  );
}
