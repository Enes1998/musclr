// Real LLM provider adapters via the Vercel AI SDK. The SDK + provider packages are LAZY,
// OPTIONAL dependencies: this file compiles and the backend runs (with the mock planner) without
// them installed. To enable live AI, install the relevant packages, e.g.:
//   pnpm --filter backend add ai @ai-sdk/google-vertex @ai-sdk/openai @ai-sdk/anthropic \
//     @ai-sdk/google @ai-sdk/openai-compatible
// All routes call the SAME generateObject(generatedPlanSchema, ...) so output is uniform.

import { generatedPlanSchema } from '@musclr/core';
import { VERTEX_PROJECT, VERTEX_LOCATION } from '../env';

export type ModelProvider = 'hosted' | 'openai' | 'anthropic' | 'google' | 'local';

// Dynamic import with a non-literal specifier so TS doesn't require the package at build time.
async function dyn(name: string): Promise<any> {
  try {
    return await import(name);
  } catch {
    throw new Error(
      `AI provider dependency "${name}" is not installed. Install it to enable live AI, e.g. \`pnpm --filter backend add ${name}\`.`,
    );
  }
}

export interface CallModelOptions {
  provider: ModelProvider;
  model?: string;
  byoKey?: string;
  localBaseUrl?: string;
  system: string;
  prompt: string;
}

/** Build the provider model + run structured generation. Returns the (unvalidated) object. */
export async function callModel(o: CallModelOptions): Promise<unknown> {
  const ai = await dyn('ai');
  let model: unknown;

  switch (o.provider) {
    case 'hosted': {
      if (!VERTEX_PROJECT) throw new Error('GOOGLE_VERTEX_PROJECT is not set for the hosted provider.');
      const m = await dyn('@ai-sdk/google-vertex');
      model = m.createVertex({ project: VERTEX_PROJECT, location: VERTEX_LOCATION })(
        o.model ?? 'gemini-2.5-flash',
      );
      break;
    }
    case 'openai': {
      const m = await dyn('@ai-sdk/openai');
      model = m.createOpenAI({ apiKey: o.byoKey })(o.model ?? 'gpt-4o-2024-08-06');
      break;
    }
    case 'anthropic': {
      const m = await dyn('@ai-sdk/anthropic');
      model = m.createAnthropic({ apiKey: o.byoKey })(o.model ?? 'claude-sonnet-4-5');
      break;
    }
    case 'google': {
      const m = await dyn('@ai-sdk/google');
      model = m.createGoogleGenerativeAI({ apiKey: o.byoKey })(o.model ?? 'gemini-2.5-flash');
      break;
    }
    case 'local': {
      const m = await dyn('@ai-sdk/openai-compatible');
      model = m
        .createOpenAICompatible({ name: 'local', baseURL: o.localBaseUrl ?? 'http://localhost:11434/v1' })
        .chatModel(o.model ?? 'llama3.1');
      break;
    }
  }

  const { object } = await ai.generateObject({
    model,
    schema: generatedPlanSchema,
    system: o.system,
    prompt: o.prompt,
  });
  return object;
}
