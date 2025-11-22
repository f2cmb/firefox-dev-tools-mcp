import type { Page } from 'playwright';
import { z } from 'zod';
import type { FirefoxBrowser } from '../browser.js';

export const evaluateScriptSchema = z.object({
  script: z.string().describe('JavaScript code to execute in the page context'),
  url: z.string().url().optional().describe('URL to navigate to before executing script'),
});

export type EvaluateScriptArgs = z.infer<typeof evaluateScriptSchema>;

/**
 * Evaluate JavaScript code in the page context
 */
export async function evaluateScript(
  page: Page,
  browser: FirefoxBrowser,
  args: EvaluateScriptArgs
): Promise<string> {
  // Navigate to URL if provided
  if (args.url) {
    await browser.goto(args.url);
  }

  console.error('Executing JavaScript...');

  // Execute the script directly in the page context
  // The script can be either an expression or a function
  // Let errors propagate so server.ts can mark response as error
  const result = await page.evaluate(args.script);

  // Serialize result
  const serialized = JSON.stringify(result, null, 2);

  return `Script executed successfully:\n\n${serialized}`;
}

export const evaluateScriptTool = {
  name: 'evaluate_script',
  description: 'Execute custom JavaScript code in the page context. ' +
    'Useful for extracting specific DOM information, testing JavaScript functions, ' +
    'or getting data not available through the accessibility tree.',
  inputSchema: {
    type: 'object',
    properties: {
      script: {
        type: 'string',
        description: 'JavaScript code to execute. Can be an expression (e.g., "document.title") or a function body that returns a value.',
      },
      url: {
        type: 'string',
        description: 'URL to navigate to before executing script (optional)',
      },
    },
    required: ['script'],
  } as const,
  handler: evaluateScript,
};
