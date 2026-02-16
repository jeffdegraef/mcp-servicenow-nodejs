# Gemini CLI Configuration

## Project Context
This project is a ServiceNow MCP (Model Context Protocol) Server. It contains a large knowledge base of ServiceNow technical documentation in `knowledge/servicenow/`.

## Knowledge Retrieval Instructions
**CRITICAL:** The `knowledge/servicenow/` directory contains extremely large text files (>200MB).
1.  **DO NOT** attempt to read or index all files in `knowledge/servicenow/` automatically.
2.  **ALWAYS** refer to `knowledge/servicenow/CONTENT_MAP.md` first to locate the relevant file for a specific query.
3.  **ONLY** read/include the specific file(s) identified from the map.

## Interaction Style
- When answering ServiceNow technical questions, cite the specific documentation file used.
- If the answer requires reading a file that is not currently in context, request the user to add it explicitly or (if capable) retrieve it yourself.
