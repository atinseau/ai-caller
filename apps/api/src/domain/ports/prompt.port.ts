export abstract class PromptPort {
  /**
   * Render a prompt template with the given context.
   *
   * @param name - prompt file name without extension (e.g. "instructions-prompt")
   * @param context - Handlebars context variables to inject
   * @returns the rendered prompt string
   */
  abstract render(
    name: string,
    context?: Record<string, unknown>,
  ): Promise<string>;
}
