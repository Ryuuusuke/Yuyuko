/**
 * AniList Service Module
 * Handles AniList API interactions for the immersion tracker
 * @module services/anilistService
 */

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const { asyncHandler, logError, APIError } = require("../utils/errorHandler");

/**
 * Get media info from AniList by title
 * @param {string} title - Media title to search for
 * @param {string} type - Media type (ANIME or MANGA)
 * @returns {Promise<Object|null>} - Media info or null if not found
 * @property {string} title - Media title
 * @property {string} url - Media URL
 * @property {string} image - Media image URL
 * @property {number} id - Media ID
 */
async function getAniListInfo(title, type = 'ANIME') {
  try {
    const query = `
    query ($search: String, $type: MediaType) {
      Media (search: $search, type: $type) {
        id
        title {
          romaji
          english
          native
        }
        siteUrl
        coverImage {
          large
          medium
        }
      }
    }
    `;

    const variables = {
      search: title,
      type: type.toUpperCase()
    };

    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        variables: variables
      })
    });

    const data = await response.json();

    if (data?.data?.Media) {
      const media = data.data.Media;
      
      // Prioritize title selection: English > Romaji > Native
      const preferredTitle = media.title.english || media.title.romaji || media.title.native;
      
      return {
        title: preferredTitle,
        url: media.siteUrl,
        image: media.coverImage.large || media.coverImage.medium,
        id: media.id
      };
    } else {
      return null;
    }
  } catch (err) {
    logError(err, 'getAniListInfo', { title, type });
    return null;
  }
}

/**
 * Search for media on AniList
 * @param {string} searchTerm - Search term
 * @param {string} type - Media type (ANIME or MANGA)
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Array>} - Array of search results
 * @property {string} name - Display name of the media
 * @property {string} value - Value for autocomplete (title|id)
 */
async function searchAniList(searchTerm, type = 'ANIME', limit = 25) {
  try {
    const query = `
    query ($search: String, $type: MediaType, $perPage: Int) {
      Page (page: 1, perPage: $perPage) {
        media (search: $search, type: $type, sort: POPULARITY_DESC) {
          id
          title {
            romaji
            english
            native
          }
          siteUrl
          coverImage {
            large
            medium
          }
          popularity
        }
      }
    }
    `;

    const variables = {
      search: searchTerm,
      type: type.toUpperCase(),
      perPage: limit
    };

    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        variables: variables
      })
    });

    const data = await response.json();

    if (data?.data?.Page?.media) {
      return data.data.Page.media.map(media => {
        // Prioritize title selection: English > Romaji > Native
        const preferredTitle = media.title.english || media.title.romaji || media.title.native;
        
        // Format for Discord autocomplete (name: display, value: title|id)
        return {
          name: preferredTitle.length > 100 ? preferredTitle.substring(0, 97) + '...' : preferredTitle,
          value: `${preferredTitle}|${media.id}`
        };
      });
    } else {
      return [];
    }
  } catch (err) {
    logError(err, 'searchAniList', { searchTerm, type, limit });
    return [];
  }
}

/**
 * Get media info from AniList by ID
 * @param {number|string} id - AniList media ID
 * @param {string} type - Media type (ANIME or MANGA)
 * @returns {Promise<Object|null>} - Media info or null if not found
 * @property {string} title - Media title
 * @property {string} url - Media URL
 * @property {string} image - Media image URL
 * @property {number} id - Media ID
 */
async function getAniListInfoById(id, type = 'ANIME') {
  try {
    const query = `
    query ($id: Int, $type: MediaType) {
      Media (id: $id, type: $type) {
        id
        title {
          romaji
          english
          native
        }
        siteUrl
        coverImage {
          large
          medium
        }
      }
    }
    `;

    const variables = {
      id: parseInt(id),
      type: type.toUpperCase()
    };

    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        variables: variables
      })
    });

    const data = await response.json();

    if (data?.data?.Media) {
      const media = data.data.Media;
      
      // Prioritize title selection: English > Romaji > Native
      const preferredTitle = media.title.english || media.title.romaji || media.title.native;
      
      return {
        title: preferredTitle,
        url: media.siteUrl,
        image: media.coverImage.large || media.coverImage.medium,
        id: media.id
      };
    } else {
      return null;
    }
  } catch (err) {
    logError(err, 'getAniListInfoById', { id, type });
    return null;
 }
}

/**
 * Get media info based on media type
 * @param {string} title - Media title
 * @param {string} mediaType - Media type (anime, manga, visual_novel, book, reading)
 * @returns {Promise<Object|null>} - Media info or null if not found
 * @property {string} title - Media title
 * @property {string} url - Media URL
 * @property {string} image - Media image URL
 * @property {number} id - Media ID
 */
async function getMediaInfo(title, mediaType) {
  let anilistType;
  
  switch (mediaType) {
    case 'anime':
      anilistType = 'ANIME';
      break;
    case 'manga':
    case 'visual_novel':
    case 'book':
    case 'reading':
      anilistType = 'MANGA';
      break;
    default:
      return null;
  }
  
  return await getAniListInfo(title, anilistType);
}

module.exports = {
  getAniListInfo,
  getMediaInfo,
  searchAniList,
  getAniListInfoById
};