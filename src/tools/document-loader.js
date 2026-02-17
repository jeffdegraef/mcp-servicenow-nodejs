import fs from 'fs/promises';
import path from 'path';

/**
 * Retrieves the full text of a ServiceNow manual from the knowledge base.
 * @param {string} filename - The exact filename of the manual.
 * @returns {Promise<string>} - The file content.
 */
export async function getManualContent(filename) {
  // Security Check: Ensure filename is just a basename (no .. or slashes)
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    throw new Error('Invalid filename. Only base filenames are allowed.');
  }

  const knowledgeDir = path.join(process.cwd(), 'knowledge', 'servicenow');
  const filePath = path.join(knowledgeDir, filename);

  try {
    // Check if the file exists and is within the knowledge directory
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) {
      throw new Error('Requested path is not a file.');
    }

    // Read the file content
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`File not found: ${filename}`);
    } else if (error.code === 'EACCES') {
      throw new Error(`Permission denied: ${filename}`);
    }
    throw error;
  }
}
