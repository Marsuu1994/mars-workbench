import type {ServerContext} from '@modelcontextprotocol/server';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {PlanningError} from '@/services/planningService';
import {TemplateNotFoundError} from '@/services/planService';
import {MCP_ERROR} from '@/utils/errorMessages';
import {runTool} from './runTool';

const asUser = (userId?: string) =>
  ({
    http: {authInfo: userId ? {extra: {userId}} : undefined},
  }) as unknown as ServerContext;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('runTool', () => {
  it("returns the tool's result as JSON text and structured content", async () => {
    const result = await runTool(asUser('user-1'), async userId => ({
      userId,
    }));
    expect(result).toEqual({
      content: [
        {type: 'text', text: JSON.stringify({userId: 'user-1'}, null, 2)},
      ],
      structuredContent: {userId: 'user-1'},
    });
  });

  it('refuses a request with no signed-in user', async () => {
    const toolFunction = vi.fn();
    const result = await runTool(asUser(), toolFunction);
    expect(toolFunction).not.toHaveBeenCalled();
    expect(result).toEqual({
      content: [{type: 'text', text: MCP_ERROR.NO_SIGNED_IN_USER}],
      isError: true,
    });
  });

  it('passes a planning error to the model to act on', async () => {
    const result = await runTool(asUser('user-1'), async () => {
      throw new PlanningError('This week already has a plan.');
    });
    expect(result).toEqual({
      content: [{type: 'text', text: 'This week already has a plan.'}],
      isError: true,
    });
  });

  it('names the templates that were not found', async () => {
    const result = await runTool(asUser('user-1'), async () => {
      throw new TemplateNotFoundError(['template-1']);
    });
    expect(result.content).toEqual([
      {type: 'text', text: MCP_ERROR.TEMPLATE_NOT_FOUND(['template-1'])},
    ]);
  });

  it('reports anything else generically and logs it', async () => {
    const logError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await runTool(asUser('user-1'), async () => {
      throw new Error('connection refused at 10.0.0.1');
    });
    expect(result).toEqual({
      content: [{type: 'text', text: MCP_ERROR.UNEXPECTED}],
      isError: true,
    });
    expect(logError).toHaveBeenCalledOnce();
  });
});
