import { getManualContent } from '../src/tools/document-loader.js';

async function test() {
  const filename = 'servicenow-zurich-impact-enus.txt';
  console.log(`🧪 Testing getManualContent with: ${filename}`);
  
  try {
    const content = await getManualContent(filename);
    console.log(`✅ Success! Retrieved ${content.length} characters.`);
    console.log('--- First 500 characters ---');
    console.log(content.substring(0, 500));
    console.log('----------------------------');
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    process.exit(1);
  }
}

test();
