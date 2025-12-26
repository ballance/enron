/**
 * Parse attachment references from email bodies
 */

/**
 * Extract attachment filenames from email body
 * Matches patterns like: << File: filename.ext >>
 * @param {string} body - Email body text
 * @returns {Array} Array of attachment objects
 */
export function parseAttachments(body) {
  if (!body) return [];

  const attachments = [];
  
  // Match << File: filename >> or <<filename>> patterns
  const filePattern = /<<\s*(?:File:\s*)?([^>]+?)\s*>>/g;
  
  let match;
  while ((match = filePattern.exec(body)) !== null) {
    const filename = match[1].trim();
    
    // Extract file extension
    const extMatch = filename.match(/\.([^.]+)$/);
    const extension = extMatch ? extMatch[1].toLowerCase() : 'unknown';
    
    // Determine file type
    const fileType = getFileType(extension);
    
    attachments.push({
      filename,
      extension,
      type: fileType,
      marker: match[0] // Original marker for reference
    });
  }
  
  return attachments;
}

/**
 * Categorize file type based on extension
 */
function getFileType(extension) {
  const typeMap = {
    // Documents
    'doc': 'document',
    'docx': 'document',
    'txt': 'document',
    'rtf': 'document',
    'pdf': 'document',
    
    // Spreadsheets
    'xls': 'spreadsheet',
    'xlsx': 'spreadsheet',
    'csv': 'spreadsheet',
    
    // Images
    'jpg': 'image',
    'jpeg': 'image',
    'png': 'image',
    'gif': 'image',
    'bmp': 'image',
    
    // Archives
    'zip': 'archive',
    'rar': 'archive',
    'tar': 'archive',
    'gz': 'archive',
    
    // Other
    'ppt': 'presentation',
    'pptx': 'presentation',
    'msg': 'email',
    'eml': 'email',
  };
  
  return typeMap[extension] || 'other';
}

/**
 * Get icon name for file type
 */
export function getFileIcon(type) {
  const iconMap = {
    'document': '📄',
    'spreadsheet': '📊',
    'image': '🖼️',
    'archive': '📦',
    'presentation': '📊',
    'email': '📧',
    'other': '📎'
  };
  
  return iconMap[type] || '📎';
}
