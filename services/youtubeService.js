/**
 * YouTube Service Module
 * Handles YouTube API interactions for the immersion tracker
 * @module services/youtubeService
 */

const axios = require("axios");
const { asyncHandler, logError, APIError } = require("../utils/errorHandler");

// YouTube API configuration
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

/**
 * Extract video ID from YouTube URL
 * @param {string} url - YouTube URL or video ID
 * @returns {string} - Video ID
 */
function extractYouTubeVideoId(url) {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : url; // Return the ID or the original string if it's already an ID
}

/**
 * Parse ISO 8601 duration format to seconds
 * @param {string} duration - Duration in ISO 8601 format (PT1H2M10S)
 * @returns {number} - Duration in seconds
 */
function parseDuration(duration) {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  const seconds = parseInt(match[3]) || 0;
  
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Normalize YouTube URL
 * @param {string} inputUrl - Input URL or video ID
 * @returns {string|null} - Normalized URL or null if invalid
 */
function normalizeYouTubeUrl(inputUrl) {
  if (!inputUrl) return null;
  
  let normalizedUrl = inputUrl.trim();
  
  if (normalizedUrl.startsWith('http://') || normalizedUrl.startsWith('https://')) {
    return normalizedUrl;
  }
  
  if (normalizedUrl.startsWith('www.')) {
    return `https://${normalizedUrl}`;
  }
  
  if (normalizedUrl.startsWith('youtube.com') ||
      normalizedUrl.startsWith('youtu.be') ||
      normalizedUrl.startsWith('m.youtube.com')) {
    return `https://${normalizedUrl}`;
  }
  
  return `https://youtube.com/watch?v=${normalizedUrl}`;
}

/**
 * Get YouTube video info using YouTube Data API v3
 * @param {string} videoId - YouTube video ID
 * @returns {Promise<Object|null>} - Video info or null if not found
 */
async function getYouTubeVideoInfo(videoId) {
  try {
    const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      params: {
        part: 'snippet,contentDetails',
        id: videoId,
        key: YOUTUBE_API_KEY
      }
    });

    if (response.data.items && response.data.items.length > 0) {
      const video = response.data.items[0];
      const snippet = video.snippet;
      const contentDetails = video.contentDetails;
      
      // Parse duration from ISO 8601 format (PT1H2M10S) to seconds
      const duration = parseDuration(contentDetails.duration);
      
      return {
        title: snippet.title,
        duration: duration, // in seconds
        thumbnail: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url
      };
    }
    
    return null;
  } catch (error) {
    logError(error, 'getYouTubeVideoInfo', { videoId });
    throw new APIError('Failed to fetch YouTube video information');
  }
}

module.exports = {
  extractYouTubeVideoId,
  parseDuration,
  normalizeYouTubeUrl,
  getYouTubeVideoInfo
};