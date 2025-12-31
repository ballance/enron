import { useQuery } from '@tanstack/react-query';
import api from '../api/client';

/**
 * Fetch attachment statistics
 */
export function useAttachmentStats() {
  return useQuery({
    queryKey: ['attachment-stats'],
    queryFn: async () => {
      const response = await api.get('/attachments/stats');
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Fetch attachments for a specific message
 */
export function useMessageAttachments(messageId) {
  return useQuery({
    queryKey: ['message-attachments', messageId],
    queryFn: async () => {
      const response = await api.get(`/attachments/message/${messageId}`);
      return response.data;
    },
    enabled: !!messageId,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Search attachments by filename
 */
export function useAttachmentSearch(search, page = 1) {
  return useQuery({
    queryKey: ['attachment-search', search, page],
    queryFn: async () => {
      const response = await api.get('/attachments/search', {
        params: { q: search, page, limit: 50 }
      });
      return response.data;
    },
    enabled: !!search && search.length >= 2,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch messages with attachments (paginated)
 */
export function useMessagesWithAttachments(page = 1) {
  return useQuery({
    queryKey: ['messages-with-attachments', page],
    queryFn: async () => {
      const response = await api.get('/attachments/messages', {
        params: { page, limit: 50 }
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get download URL for an attachment
 * @param {number} attachmentId - The attachment ID
 * @returns {string} Download URL
 */
export function getAttachmentDownloadUrl(attachmentId) {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  return `${baseUrl}/attachments/${attachmentId}/download`;
}

/**
 * Format file size for display
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size string
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  if (!bytes) return 'Unknown';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Get file icon based on MIME type
 * @param {string} mimeType - MIME type of the file
 * @returns {string} Icon character/emoji
 */
export function getFileIcon(mimeType) {
  if (!mimeType) return '\uD83D\uDCC4'; // Default document

  if (mimeType.startsWith('image/')) return '\uD83D\uDDBC\uFE0F'; // Picture
  if (mimeType.startsWith('video/')) return '\uD83C\uDFAC'; // Video
  if (mimeType.startsWith('audio/')) return '\uD83C\uDFB5'; // Music

  const typeMap = {
    'application/pdf': '\uD83D\uDCC4',
    'application/msword': '\uD83D\uDCC4',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '\uD83D\uDCC4',
    'application/vnd.ms-excel': '\uD83D\uDCCA',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '\uD83D\uDCCA',
    'application/vnd.ms-powerpoint': '\uD83D\uDCCA',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '\uD83D\uDCCA',
    'application/zip': '\uD83D\uDDC4\uFE0F',
    'application/x-zip-compressed': '\uD83D\uDDC4\uFE0F',
    'application/x-gzip': '\uD83D\uDDC4\uFE0F',
    'text/plain': '\uD83D\uDCC3',
    'text/html': '\uD83C\uDF10',
    'text/csv': '\uD83D\uDCCA',
    'message/rfc822': '\u2709\uFE0F',
  };

  return typeMap[mimeType] || '\uD83D\uDCC4';
}
