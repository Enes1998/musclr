// Contract test for the live AI adapter: pins how generatePlan drives the Vercel AI SDK
// (generateObject + provider factory), so a breaking SDK/provider upgrade fails CI rather than
// production. The 'ai' + '@ai-sdk/openai' modules are mocked — no network, no real key.

import { describe, it, expect, beforeEach, vi } from 'vitest';

const { genObj, createOpenAI } = vi.hoisted(() => ({
  genObj: vi.fn(),
  createOpenAI: vi.fn(() => (modelId: string) => ({ __mockModel: modelId })),
}));

vi.mock('ai', () => ({ generateObject: genObj }));
vi.mock('@ai-sdk/openai', () => ({ createOpenAI }));

import { generatePlan } from '../src/ai/generatePlan';
import { mockPlanner } from '../src/ai/mockPlanner';

const input = { goal: 'hypertrophy', loads: { chest: 80, back: 30 } } as const;
const validPlan = mockPlanner(input);

beforeEach(() => {
  genObj.mockReset();
  createOpenAI.mockClear();
});

describe('AI adapter contract (openai via Vercel AI SDK)', () => {
  it('builds the provider with the BYO key and calls generateObject with a schema + grounded prompt', async () => {
    genObj.mockResolvedValueOnce({ object: validPlan });

    const out = await generatePlan({ ...input, provider: 'openai', byoKey: 'sk-test', model: 'gpt-test' });

    expect(createOpenAI).toHaveBeenCalledWith({ apiKey: 'sk-test' });
    expect(genObj).toHaveBeenCalledTimes(1);
    const callArg = genObj.mock.calls[0]![0] as Record<string, unknown>;
    expect(callArg.schema).toBeDefined();
    expect(typeof callArg.system).toBe('string');
    expect(typeof callArg.prompt).toBe('string');
    expect(callArg.model).toEqual({ __mockModel: 'gpt-test' });
    expect(out.meta.provider).toBe('openai');
    expect(out.meta.repaired).toBe(false);
    expect(out.plan).toEqual(validPlan);
  });

  it('retries once with a repair prompt when the first response is invalid', async () => {
    genObj
      .mockResolvedValueOnce({ object: { not: 'a valid plan' } })
      .mockResolvedValueOnce({ object: validPlan });

    const out = await generatePlan({ ...input, provider: 'openai', byoKey: 'sk-test' });

    expect(genObj).toHaveBeenCalledTimes(2);
    expect(out.meta.repaired).toBe(true);
    const repairPrompt = genObj.mock.calls[1]![0] as { prompt: string };
    expect(repairPrompt.prompt).toMatch(/invalid|fix|corrected/i);
  });

  it('requires a key for BYO providers (no silent unauthenticated call)', async () => {
    await expect(generatePlan({ ...input, provider: 'openai' })).rejects.toThrow(/key/i);
    expect(genObj).not.toHaveBeenCalled();
  });

  it('the keyless mock path needs no provider SDK at all', async () => {
    const out = await generatePlan({ ...input, provider: 'mock' });
    expect(out.meta.provider).toBe('mock');
    expect(genObj).not.toHaveBeenCalled();
  });
});
