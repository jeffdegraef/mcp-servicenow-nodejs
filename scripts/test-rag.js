import { searchKnowledge } from '../src/tools/knowledge.js';

async function test() {
  const query = "What is the ServiceNow Technology Industry solution?";
  console.log(`🔍 Testing search for: "${query}"...`);
  
  try {
    const results = await searchKnowledge(query, 3);
    
    if (!results || results.length === 0) {
      console.log("❌ No results found. Did you run the ingestion script?");
      return;
    }

    console.log(`✅ Raw result sample:`, JSON.stringify(results[0], null, 2));
    console.log(`✅ Found ${results.length} matches:\n`);
    results.forEach((res, i) => {
      console.log(`--- Match ${i + 1} (Source: ${res.source}) ---`);
      console.log(res.text.substring(0, 300).replace(/\n/g, ' ') + "...\n");
    });
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

test();
