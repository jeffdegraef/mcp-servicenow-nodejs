import { ServiceNowClient } from '../src/servicenow-client.js';
import { createMcpServer } from '../src/mcp-server-consolidated.js';
import { ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

async function test() {
  const client = new ServiceNowClient('http://localhost', 'admin', 'admin');
  const server = await createMcpServer(client);
  
  // Access internal request handlers to simulate a ListTools request
  const handlers = server._requestHandlers;
  const listToolsHandler = handlers.get(ListToolsRequestSchema.method);
  
  if (listToolsHandler) {
    const result = await listToolsHandler();
    const toolNames = result.tools.map(t => t.name);
    console.log('Registered Tools Count:', toolNames.length);
    if (toolNames.includes('SN-Search-Knowledge')) {
      console.log('✅ SN-Search-Knowledge is registered!');
    } else {
      console.log('❌ SN-Search-Knowledge is MISSING!');
    }
  } else {
    console.log('❌ Could not find ListTools handler');
  }
}

test().catch(console.error);
