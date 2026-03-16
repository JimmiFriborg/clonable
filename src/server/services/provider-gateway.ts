import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import type { AiProvider, ProviderConfigResponse } from "@/server/domain/ai-provider";

const DEFAULT_MODELS: Record<AiProvider, string> = {
  openai: "gpt-5.4",
  anthropic: "claude-sonnet-4.5",
  gemini: "gemini-3.1-pro",
};

export class AiProviderGatewayError extends Error {}

interface StructuredGenerationInput<TSchema extends z.ZodType> {
  provider: AiProvider;
  model: string;
  instructions: string;
  input: string;
  schema: TSchema;
  schemaName: string;
}

function getApiKey(provider: AiProvider) {
  switch (provider) {
    case "openai":
      return process.env.OPENAI_API_KEY;
    case "anthropic":
      return process.env.ANTHROPIC_API_KEY;
    case "gemini":
      return process.env.GEMINI_API_KEY;
    default:
      return undefined;
  }
}

function getDefaultModel(provider: AiProvider) {
  switch (provider) {
    case "openai":
      return process.env.CLONABLE_OPENAI_MODEL ?? DEFAULT_MODELS.openai;
    case "anthropic":
      return process.env.CLONABLE_ANTHROPIC_MODEL ?? DEFAULT_MODELS.anthropic;
    case "gemini":
      return process.env.CLONABLE_GEMINI_MODEL ?? DEFAULT_MODELS.gemini;
    default:
      return DEFAULT_MODELS.openai;
  }
}

function buildJsonPrompt(input: string) {
  return `${input}\n\nRespond with valid JSON only. Do not wrap the JSON in markdown.`;
}

async function generateWithOpenAi<TSchema extends z.ZodType>({
  model,
  instructions,
  input,
  schema,
  schemaName,
}: StructuredGenerationInput<TSchema>) {
  const client = new OpenAI({
    apiKey: getApiKey("openai"),
  });

  const response = await client.responses.parse({
    model,
    instructions,
    input,
    text: {
      format: zodTextFormat(schema, schemaName),
    },
  });

  if (!response.output_parsed) {
    throw new AiProviderGatewayError("OpenAI did not return parsed output.");
  }

  return response.output_parsed as z.infer<TSchema>;
}

async function generateWithAnthropic<TSchema extends z.ZodType>({
  model,
  instructions,
  input,
  schema,
}: StructuredGenerationInput<TSchema>) {
  const apiKey = getApiKey("anthropic");

  if (!apiKey) {
    throw new AiProviderGatewayError("ANTHROPIC_API_KEY is missing.");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: instructions,
      messages: [
        {
          role: "user",
          content: buildJsonPrompt(input),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new AiProviderGatewayError(`Anthropic request failed with ${response.status}.`);
  }

  const payload = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = payload.content?.find((item) => item.type === "text")?.text;

  if (!text) {
    throw new AiProviderGatewayError("Anthropic did not return text content.");
  }

  return schema.parse(JSON.parse(text)) as z.infer<TSchema>;
}

async function generateWithGemini<TSchema extends z.ZodType>({
  model,
  instructions,
  input,
  schema,
}: StructuredGenerationInput<TSchema>) {
  const apiKey = getApiKey("gemini");

  if (!apiKey) {
    throw new AiProviderGatewayError("GEMINI_API_KEY is missing.");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: instructions }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: buildJsonPrompt(input) }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!response.ok) {
    throw new AiProviderGatewayError(`Gemini request failed with ${response.status}.`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new AiProviderGatewayError("Gemini did not return text content.");
  }

  return schema.parse(JSON.parse(text)) as z.infer<TSchema>;
}

export async function generateStructuredObject<TSchema extends z.ZodType>(
  input: StructuredGenerationInput<TSchema>,
) {
  if (!getApiKey(input.provider)) {
    throw new AiProviderGatewayError(`${input.provider} API key is missing.`);
  }

  switch (input.provider) {
    case "openai":
      return generateWithOpenAi(input);
    case "anthropic":
      return generateWithAnthropic(input);
    case "gemini":
      return generateWithGemini(input);
    default:
      throw new AiProviderGatewayError(`Unsupported provider: ${input.provider}`);
  }
}

export function getProviderConfigResponse(): ProviderConfigResponse {
  return {
    providers: (["openai", "anthropic", "gemini"] as const).map((provider) => ({
      provider,
      configured: Boolean(getApiKey(provider)),
      defaultModel: getDefaultModel(provider),
    })),
  };
}

export function getPlannerProviderSelection() {
  const provider = (process.env.CLONABLE_PLANNER_PROVIDER?.trim().toLowerCase() ??
    "openai") as AiProvider;

  return {
    provider,
    model: process.env.CLONABLE_PLANNER_MODEL?.trim() || getDefaultModel(provider),
  };
}
