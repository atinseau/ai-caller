export enum PromptSection {
  ROLE_OBJECTIVE = "roleObjective",
  PERSONALITY_TONE = "personalityTone",
  CONTEXT = "context",
  REFERENCE_PRONUNCIATIONS = "referencePronunciations",
  INSTRUCTIONS_RULES = "instructionsRules",
  CONVERSATION_FLOW = "conversationFlow",
  SAFETY_ESCALATION = "safetyEscalation",
}

export const PROMPT_SECTION_META: Record<
  PromptSection,
  {
    label: string;
    shortLabel: string;
    description: string;
    placeholder: string;
  }
> = {
  [PromptSection.ROLE_OBJECTIVE]: {
    label: "Role & Objective",
    shortLabel: "Role",
    description:
      "Who is the AI agent and what is its primary mission? Define the role, scope, and success criteria.",
    placeholder:
      "e.g. You are a customer support agent for Acme Corp. Your goal is to resolve inquiries on the first call...",
  },
  [PromptSection.PERSONALITY_TONE]: {
    label: "Personality & Tone",
    shortLabel: "Personality",
    description:
      "How should the agent sound? Define the energy, warmth, formality, and conversational style.",
    placeholder:
      "e.g. Friendly and professional. Speak with warmth but stay concise. Use a calm, reassuring tone...",
  },
  [PromptSection.CONTEXT]: {
    label: "Context",
    shortLabel: "Context",
    description:
      "Company info, products, services, and knowledge the agent should have. This is injected as background context.",
    placeholder:
      "e.g. Acme Corp sells cloud hosting solutions. Plans: Starter ($9/mo), Pro ($29/mo), Enterprise (custom)...",
  },
  [PromptSection.REFERENCE_PRONUNCIATIONS]: {
    label: "Reference Pronunciations",
    shortLabel: "Pronunciations",
    description:
      "Phonetic guides for brand names, technical terms, or proper nouns the agent may need to say aloud.",
    placeholder:
      "e.g. Acme (ACK-mee), PostgreSQL (post-GRESS-Q-L), n8n (n-eight-n)...",
  },
  [PromptSection.INSTRUCTIONS_RULES]: {
    label: "Instructions & Rules",
    shortLabel: "Rules",
    description:
      "Specific business rules, constraints, do's and don'ts. These are hard rules the agent must follow.",
    placeholder:
      "e.g. Never offer discounts above 15%. Always verify the caller's identity before sharing account details...",
  },
  [PromptSection.CONVERSATION_FLOW]: {
    label: "Conversation Flow",
    shortLabel: "Flow",
    description:
      "Define the conversation states, transitions, and expected scenarios. How should the call progress?",
    placeholder:
      "e.g. 1. Greet the caller 2. Identify the issue 3. Look up their account 4. Resolve or escalate...",
  },
  [PromptSection.SAFETY_ESCALATION]: {
    label: "Safety & Escalation",
    shortLabel: "Safety",
    description:
      "Define boundaries, fallback behavior, and when/how to escalate to a human agent.",
    placeholder:
      "e.g. If the caller asks about legal matters, say you cannot provide legal advice and offer to transfer...",
  },
};
