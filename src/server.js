/**
 * ServiceNow MCP Server - Express HTTP Server
 *
 * Copyright (c) 2025 Happy Technologies LLC
 * Licensed under the MIT License - see LICENSE file for details
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { ServiceNowClient } from './servicenow-client.js';
import { createMcpServer } from './mcp-server-consolidated.js';
import { configManager } from './config-manager.js';

// Load environment variables
dotenv.config();

// SSE configuration
const SSE_KEEPALIVE_INTERVAL = parseInt(process.env.SSE_KEEPALIVE_INTERVAL || '15000', 10); // Default: 15 seconds

const app = express();
app.use(cors());

// In-memory session store (sessionId -> {server, transport})
const sessions = {};

// Get default instance configuration
const defaultInstance = configManager.getDefaultInstance();
console.log(`🔗 Default ServiceNow instance: ${defaultInstance.name} (${defaultInstance.url})`);
console.log(`💡 Use SN-Set-Instance tool to switch instances during session`);

// Create ServiceNow client with default instance
const serviceNowClient = new ServiceNowClient(
  defaultInstance.url,
  defaultInstance.username,
  defaultInstance.password
);
serviceNowClient.currentInstanceName = defaultInstance.name;

/**
 * GET /mcp - Establish SSE connection
 */
app.get('/mcp', async (req, res) => {
  try {
    // SSE-specific headers to prevent buffering and timeouts
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.setHeader('Connection', 'keep-alive');

    // Disable timeout for SSE endpoint (0 = infinite)
    req.setTimeout(0);
    res.setTimeout(0);

    // Create transport
    const transport = new SSEServerTransport('/mcp', res);
    const sessionId = transport.sessionId;

    // Store the session IMMEDIATELY before any async yields
    // This prevents a race condition if the client POSTs before metadata finishes loading
    sessions[sessionId] = { transport };
    console.log(`📡 SSE connection initiated: ${sessionId}`);

    // Create and configure new MCP server instance
    const server = await createMcpServer(serviceNowClient);
    sessions[sessionId].server = server;

    // Set up keepalive heartbeat to prevent connection timeout
    const keepaliveInterval = setInterval(() => {
      try {
        res.write(': keepalive\n\n');
      } catch (error) {
        console.error(`❌ Keepalive failed for ${sessionId}:`, error.message);
        clearInterval(keepaliveInterval);
      }
    }, SSE_KEEPALIVE_INTERVAL);

    sessions[sessionId].keepaliveInterval = keepaliveInterval;

    // Set up transport cleanup
    transport.onclose = () => {
      if (sessions[sessionId]) {
        clearInterval(sessions[sessionId].keepaliveInterval);
        delete sessions[sessionId];
        console.log(`🧹 Cleaned up session ${sessionId}`);
      }
    };

    // Clean up on request close/error
    req.on('close', () => {
      if (sessions[sessionId]) {
        clearInterval(sessions[sessionId].keepaliveInterval);
        delete sessions[sessionId];
        console.log(`🔌 Client disconnected: ${sessionId}`);
      }
    });

    req.on('error', (error) => {
      console.error(`❌ Request error for ${sessionId}:`, error);
    });

    // Connect server to transport
    await server.connect(transport);
    console.log(`🔗 Session fully established: ${sessionId}`);

  } catch (error) {
    console.error('❌ Error establishing SSE connection:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to establish SSE connection' });
    }
  }
});

/**
 * POST /mcp - Handle JSON-RPC messages
 */
app.post('/mcp', async (req, res) => {
  try {
    const sessionId = req.query.sessionId;

    if (!sessionId) {
      console.error('❌ POST request missing sessionId');
      return res.status(400).json({ error: 'Missing session ID' });
    }

    if (!sessions[sessionId]) {
      console.error(`❌ POST request for unknown/expired session: ${sessionId}`);
      return res.status(400).json({ error: 'Invalid or expired session ID' });
    }

    const { transport } = sessions[sessionId];
    await transport.handlePostMessage(req, res);

  } catch (error) {
    console.error('❌ Error handling POST message:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    servicenow_instance: defaultInstance.url,
    instance_name: defaultInstance.name,
    timestamp: new Date().toISOString()
  });
});

// List available instances endpoint
app.get('/instances', (req, res) => {
  try {
    const instances = configManager.listInstances();
    res.json({ instances });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 ServiceNow MCP Server listening on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 MCP SSE endpoint: http://localhost:${PORT}/mcp`);
  console.log(`📋 Available instances: http://localhost:${PORT}/instances`);
  console.log(`💓 SSE keepalive interval: ${SSE_KEEPALIVE_INTERVAL}ms`);

  if (process.env.DEBUG === 'true') {
    console.log('🐛 Debug mode enabled');
    console.log(`🔗 Active ServiceNow instance: ${defaultInstance.name} - ${defaultInstance.url}`);
  }
});