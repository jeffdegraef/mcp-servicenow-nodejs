# ServiceNow MCP Server Setup Guide

## Two Server Modes

This MCP server can run in two different modes:

### 1. HTTP/SSE Mode (Port 3000) - For Claude Code & Testing
- **File**: `src/server.js`
- **Port**: 3000 (configurable via PORT env var)
- **Usage**: Claude Code integration, API testing, web-based access
- **Start Command**: `npm start:http` or `npm run dev`
- **Endpoint**: http://localhost:3000/mcp

### 2. STDIO Mode - For Claude Desktop App
- **File**: `src/stdio-server.js`
- **Usage**: Claude Desktop app integration
- **Start Command**: `npm start:stdio`
- **No port required** (uses standard input/output)

## Configuration for Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "servicenow": {
      "command": "node",
      "args": ["/Users/nczitzer/WebstormProjects/mcp-servicenow-nodejs/src/stdio-server.js"],
      "env": {
        "SERVICENOW_INSTANCE_URL": "https://dev276360.service-now.com",
        "SERVICENOW_USERNAME": "admin",
        "SERVICENOW_PASSWORD": "$h4fG+9nAGeU"
      }
    }
  }
}
```

## Configuration for Claude Code

The HTTP server runs automatically on port 3000 when you use:
```bash
npm start
# or
npm run dev
```

## Running Both Simultaneously

You can run both servers at the same time:

1. **Terminal 1** - HTTP Server for Claude Code:
```bash
npm start:http
```

2. **Claude Desktop** - Will automatically start stdio server when needed

## Testing the Servers

### Test HTTP Server:
```bash
# Health check
curl http://localhost:3000/health

# Test MCP endpoint
curl -X GET http://localhost:3000/mcp
```

### Test STDIO Server:
```bash
# Run directly to see output
node src/stdio-server.js
# Press Ctrl+C to exit
```

## Common Issues

1. **Port 3000 already in use**: Kill existing process:
```bash
pkill -f "node src/server.js"
```

2. **Claude Desktop not connecting**:
- Restart Claude Desktop after updating config
- Check the path in config matches your actual path
- Ensure credentials in config are correct

3. **Both trying to use same port**:
- HTTP server uses port 3000
- STDIO server doesn't use any port
- They can run simultaneously without conflict

## Environment Variables

Make sure your `.env` file contains:
```
SERVICENOW_INSTANCE_URL=https://dev276360.service-now.com
SERVICENOW_USERNAME=admin
SERVICENOW_PASSWORD=$h4fG+9nAGeU
PORT=3000
DEBUG=true
```

## Knowledge Base Setup (Local RAG)

To enable vector search for technical documentation:

1.  **Install Dependencies:**
    ```bash
    npm install @lancedb/lancedb @xenova/transformers
    ```

2.  **Add Documentation:**
    Place your documentation files (PDFs, Markdown, or Text) in `knowledge/servicenow/`.
    *Note: If using PDFs, you may need to convert them to text using `convert_pdfs.py`.*

3.  **Run Ingestion:**
    ```bash
    node scripts/ingest-knowledge.js
    ```

4.  **Verify:**
    The system will create a local LanceDB database in `knowledge/lancedb/` and you can use the `SN-Search-Knowledge` tool.