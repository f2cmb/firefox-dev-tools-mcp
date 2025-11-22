# Firefox DevTools MCP Server

**Give any URL to Claude and get a complete snapshot of the webpage.**

Firefox opens automatically, captures all interactive elements (buttons, links, forms), and returns them with unique IDs that Claude can reference.

## Quick Start

### Installation

```bash
# 1. Clone or download this repository
git clone https://github.com/f2cmb/firefox-dev-tools-mcp.git
cd firefox-dev-tools-mcp

# 2. Install dependencies
npm install

# 3. Install Firefox for Playwright
npx playwright install firefox

# 4. Build the project
npm run build
```

### Configuration for Claude Desktop

**macOS:** Open `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows:** Open `%APPDATA%\Claude\claude_desktop_config.json`

Add this configuration (replace `/ABSOLUTE/PATH/TO/` with your actual path):

```json
{
  "mcpServers": {
    "firefox-devtools": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/firefox-dev-tools-mcp/build/index.js"]
    }
  }
}
```

**Restart Claude Desktop completely.**

### Test It

Open Claude Desktop and ask:

```
Take a snapshot of https://example.com
```

Firefox will open, load the page, and Claude will receive a complete list of all interactive elements with unique IDs!

## What You Get

When Claude takes a snapshot, you receive:

```
Accessibility Snapshot (151 interactive elements)
============================================================
  [uid_1] link "Skip to content"
  [uid_2] searchbox "Search GitHub" (focused)
  [uid_3] button "Sign in"
  [uid_4] button "Sign up"
  heading "Where the world builds software"
  ...
```

Each interactive element gets:
- **Unique ID** (`uid_1`, `uid_2`, etc.) for precise reference
- **Role** (button, link, textbox, etc.)
- **Label** or text content
- **State** (focused, disabled, checked, etc.)
- **URL** for links

## What Can You Do With It?

### Debug Web Pages
```
You: "Why is the submit button disabled on https://mysite.com/login?"
Claude: *takes snapshot* "The submit button [uid_5] is disabled because
the email field [uid_2] is empty and required."
```

### Extract Information
```
You: "What products are on https://www.adidas.fr homepage?"
Claude: *takes snapshot* "I found 12 products:
- CHAUSSURE JABBAR - 150€ [uid_46]
- CHAUSSURE ITALIA 60s - 150€ [uid_47]
..."
```

### Understand Page Structure
```
You: "What's in the navigation menu of https://example.com?"
Claude: *takes snapshot* "The main navigation has 5 items:
- Home [uid_10]
- Products [uid_11]
- About [uid_12]
..."
```

## Available Tools

### `take_snapshot`
Captures the accessibility tree of a webpage with all interactive elements.

**Parameters:**
- `url` (optional): URL to navigate to
- `verbose` (optional): Include detailed accessibility info (default: false)

**Example usage with Claude:**
```
Take a snapshot of https://github.com
```

### `evaluate_script`
Execute JavaScript code in the page context for custom data extraction.

**Parameters:**
- `script` (required): JavaScript code to execute
- `url` (optional): URL to navigate to first

**Example usage with Claude:**
```
Run this script on https://example.com:
document.querySelectorAll('img').length
```

## Configuration Options

### Headless Mode

By default, Firefox opens with a visible window. To run headless:

```json
{
  "mcpServers": {
    "firefox-devtools": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/firefox-dev-tools-mcp/build/index.js"],
      "env": {
        "FIREFOX_HEADLESS": "true"
      }
    }
  }
}
```

## For Other MCP-Compatible Assistants

This server works with any MCP-compatible AI assistant. Configure it according to your assistant's MCP server setup instructions. The server communicates via stdio and provides `take_snapshot` and `evaluate_script` tools.

## Troubleshooting

### Firefox doesn't launch

Make sure Playwright browsers are installed:
```bash
npx playwright install firefox
```

### Claude doesn't see the tools

1. Verify the path in your config file is absolute and correct
2. Confirm you ran `npm run build`
3. Restart Claude Desktop completely
4. Check the MCP server logs in `~/Library/Logs/Claude/` (macOS) or `%APPDATA%\Claude\logs\` (Windows)

### "Accessibility tree not available"

Some pages don't expose an accessibility tree. Try using `evaluate_script` to extract DOM information directly instead.

## Development

```bash
# Run in development mode
npm run dev

# Watch mode (auto-rebuild on changes)
npm run watch

# Build for production
npm run build
```

## Roadmap

Future features planned:
- Network request monitoring
- Console log capture
- Click/interact with elements by UID
- Fill forms programmatically
- Wait for elements/events

## License

MIT

## Author

f2cmb

---

**Built with [Model Context Protocol](https://modelcontextprotocol.io) and [Playwright](https://playwright.dev)**
