import { describe, expect, it } from "bun:test";
import { HandlebarsPromptAdapter } from "@/infrastructure/prompt/handlebars-prompt.adapter.ts";

describe("HandlebarsPromptAdapter", () => {
  const adapter = new HandlebarsPromptAdapter();

  it("should render a prompt with context variables", async () => {
    const result = await adapter.render("sub-agent-summarize-prompt", {
      toolName: "search_customer",
      result: '{"name": "John"}',
    });

    expect(result).toContain("search_customer");
    expect(result).toContain('{"name": "John"}');
  });

  it("should render a prompt without context", async () => {
    const result = await adapter.render("call-close-tool-prompt");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("should render instructions prompt with env variable", async () => {
    const result = await adapter.render("instructions-prompt", {
      env: "production",
    });
    expect(typeof result).toBe("string");
  });

  it("should cache templates across calls", async () => {
    const result1 = await adapter.render("get-tool-status-prompt");
    const result2 = await adapter.render("get-tool-status-prompt");
    expect(result1).toBe(result2);
  });

  it("should throw on nonexistent prompt", async () => {
    await expect(adapter.render("nonexistent-prompt-xyz")).rejects.toThrow();
  });
});
