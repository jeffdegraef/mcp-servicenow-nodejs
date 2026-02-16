import * as lancedb from '@lancedb/lancedb';
import { pipeline } from '@xenova/transformers';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_DIR = path.join(__dirname, '..', '..', 'knowledge', 'lancedb');

let db;
let embedder;

async function init() {
  if (!embedder) {
    console.error('Loading embedding pipeline for search...');
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  if (!db) {
    db = await lancedb.connect(DB_DIR);
  }
}

export async function searchKnowledge(query, limit = 5) {
  try {
    await init();
    
    const output = await embedder(query, { pooling: 'mean', normalize: true });
    const vector = Array.from(output.data);
    
    const table = await db.openTable('servicenow_docs');
    
    // Perform search and convert to array
    const results = await table.search(vector)
      .limit(limit)
      .toArray();
      
    return results.map(row => ({
      text: row.text,
      source: row.source_filename,
      score: row._distance
    }));
  } catch (error) {
    console.error('Search knowledge failed:', error);
    throw error;
  }
}
