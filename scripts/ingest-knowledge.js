import * as lancedb from '@lancedb/lancedb';
import { pipeline } from '@xenova/transformers';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const KNOWLEDGE_DIR = path.join(__dirname, '..', 'knowledge', 'servicenow');
const DB_DIR = path.join(__dirname, '..', 'knowledge', 'lancedb');

async function ingest() {
  try {
    await fs.mkdir(DB_DIR, { recursive: true });

    console.error('Loading embedding pipeline...');
    const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

    const db = await lancedb.connect(DB_DIR);
    
    const files = (await fs.readdir(KNOWLEDGE_DIR)).filter(f => f.endsWith('.txt'));
    console.error(`Found ${files.length} files to ingest.`);

    // Initialize/Create table with the first file's data
    let table;
    let isFirstFile = true;

    for (const file of files) {
      const filePath = path.join(KNOWLEDGE_DIR, file);
      const text = await fs.readFile(filePath, 'utf-8');
      
      if (!text.trim()) continue;

      const chunks = [];
      const chunkSize = 1000;
      const overlap = 200;
      
      for (let i = 0; i < text.length; i += (chunkSize - overlap)) {
        const chunk = text.substring(i, i + chunkSize);
        if (chunk.trim()) {
          chunks.push(chunk);
        }
        if (i + chunkSize >= text.length) break;
      }

      console.error(`Processing ${file} (${chunks.length} chunks)...`);

      const fileData = [];
      for (let j = 0; j < chunks.length; j++) {
        const chunk = chunks[j];
        if (j % 100 === 0) console.error(`  - Embedding chunk ${j}/${chunks.length}`);
        
        const output = await embedder(chunk, { pooling: 'mean', normalize: true });
        const vector = Array.from(output.data);
        
        fileData.push({
          text: chunk,
          source_filename: file,
          vector: vector
        });
      }

      if (fileData.length > 0) {
        if (isFirstFile) {
          table = await db.createTable('servicenow_docs', fileData, { mode: 'overwrite' });
          isFirstFile = false;
        } else {
          await table.add(fileData);
        }
      }
      
      console.log(`Ingested [${file}]`);
    }

    console.error('✅ Ingestion complete!');
  } catch (error) {
    console.error('❌ Ingestion failed:', error);
    process.exit(1);
  }
}

ingest();
