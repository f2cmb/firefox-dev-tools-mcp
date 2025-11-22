import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { FirefoxBrowser } from './browser.js';
import {
  takeSnapshotTool,
  takeSnapshotSchema,
  type TakeSnapshotArgs,
} from './tools/take_snapshot.js';
import {
  evaluateScriptTool,
  evaluateScriptSchema,
  type EvaluateScriptArgs,
} from './tools/evaluate_script.js';

// Load package.json to get version
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJsonPath = join(__dirname, '../package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

export class FirefoxDevToolsServer {
  private server: Server;
  private firefoxBrowser: FirefoxBrowser;

  constructor() {
    this.server = new Server(
      {
        name: 'firefox-devtools-mcp',
        version: packageJson.version,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize Firefox browser (headless based on env var)
    const headless = process.env.FIREFOX_HEADLESS === 'true';
    this.firefoxBrowser = new FirefoxBrowser(headless);

    this.setupHandlers();
    this.setupErrorHandlers();
  }

  private setupHandlers(): void {
    // Handler to list available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: takeSnapshotTool.name,
            description: takeSnapshotTool.description,
            inputSchema: takeSnapshotTool.inputSchema,
          },
          {
            name: evaluateScriptTool.name,
            description: evaluateScriptTool.description,
            inputSchema: evaluateScriptTool.inputSchema,
          },
        ],
      };
    });

    // Handler to call a tool
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        // Ensure Firefox is connected
        await this.ensureConnected();

        const page = this.firefoxBrowser.getPage();
        let result: string;

        switch (name) {
          case 'take_snapshot': {
            const validatedArgs = takeSnapshotSchema.parse(args || {});
            result = await takeSnapshotTool.handler(page, this.firefoxBrowser, validatedArgs as TakeSnapshotArgs);
            break;
          }

          case 'evaluate_script': {
            const validatedArgs = evaluateScriptSchema.parse(args || {});
            result = await evaluateScriptTool.handler(page, this.firefoxBrowser, validatedArgs as EvaluateScriptArgs);
            break;
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        return {
          content: [
            {
              type: 'text',
              text: result,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async ensureConnected(): Promise<void> {
    if (!this.firefoxBrowser.isConnected()) {
      await this.firefoxBrowser.connect();
    }
  }

  private setupErrorHandlers(): void {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.cleanup();
      process.exit(0);
    });
  }

  private async cleanup(): Promise<void> {
    console.error('\nCleaning up...');
    if (this.firefoxBrowser.isConnected()) {
      await this.firefoxBrowser.close();
    }
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Firefox DevTools MCP Server running on stdio');
  }
}
