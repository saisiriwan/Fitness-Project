# TestSprite Setup Instructions

TestSprite has been added to your project's `package.json`.

## 1. Install Dependencies

Run the following command in your terminal to ensure all dependencies are installed:

```bash
npm install
```

(If the installation is already running, please wait for it to complete.)

## 2. Configure TestSprite MCP Server

The configuration file `testsprite-mcp-config.json` has been created in the project root with the necessary details (including your API Key).

To use TestSprite in your IDE (e.g., Cursor or VS Code):

1.  Locate `testsprite-mcp-config.json` in the file explorer.
2.  Copy its content.
3.  Paste it into your IDE's global MCP settings file (typically `mcp-servers.json` or accessible via settings).
4.  Restart your IDE or reload the window.

## 3. Verify Installation

To verify TestSprite is installed correctly, run:

```bash
npx testsprite-mcp-server --help
```

or run your tests:

```bash
npm test
```
