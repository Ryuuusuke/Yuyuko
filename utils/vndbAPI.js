const https = require('https');

/**
 * Search for Visual Novel information from VNDB API
 * @param {string} title - The title to search for
 * @returns {Promise<Object|null>} VN info object or null if not found
 */
async function getVNInfo(title) {
  if (!title || title.trim() === "" || title === "-") {
    return null;
  }

  try {
    const searchQuery = {
      filters: ["search", "=", title.trim()],
      fields: "title, image.url, image.dims, aliases, released, length, description, developers.name",
      sort: "searchrank",
      results: 5
    };

    const vnInfo = await makeVNDBRequest('vn', searchQuery);
    
    if (vnInfo && vnInfo.results && vnInfo.results.length > 0) {
      const vn = vnInfo.results[0]; // Get the most relevant result
      
      return {
        title: vn.title || title,
        image: vn.image?.url || null,
        url: `https://vndb.org/v${vn.id}`,
        description: vn.description?.substring(0, 200) + (vn.description?.length > 200 ? "..." : "") || null,
        released: vn.released || null,
        length: vn.length || null,
        developer: vn.developers?.[0]?.name || null,
        aliases: vn.aliases || []
      };
    }

    return null;
  } catch (error) {
    console.error("❌ Error fetching VN info from VNDB:", error);
    return null;
  }
}

/**
 * Make a request to VNDB API
 * @param {string} endpoint - API endpoint (e.g., 'vn', 'character', 'producer')
 * @param {Object} query - Query object for the API
 * @returns {Promise<Object>} API response
 */
function makeVNDBRequest(endpoint, query) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(query);
    
    const options = {
      hostname: 'api.vndb.org',
      port: 443,
      path: `/kana/${endpoint}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'Discord-Immersion-Bot/1.0 (https://github.com/your-repo)', // Replace with your actual info
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const jsonData = JSON.parse(data);
            resolve(jsonData);
          } else {
            console.error(`VNDB API Error: ${res.statusCode} - ${data}`);
            reject(new Error(`VNDB API returned status ${res.statusCode}`));
          }
        } catch (parseError) {
          console.error("Error parsing VNDB response:", parseError);
          reject(parseError);
        }
      });
    });

    req.on('error', (error) => {
      console.error('VNDB API Request Error:', error);
      reject(error);
    });

    // Set timeout for the request
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('VNDB API request timeout'));
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Get Visual Novel cover image by title
 * @param {string} title - The VN title to search for
 * @returns {Promise<string|null>} Image URL or null if not found
 */
async function getVNCoverImage(title) {
  try {
    const vnInfo = await getVNInfo(title);
    return vnInfo?.image || null;
  } catch (error) {
    console.error("Error getting VN cover image:", error);
    return null;
  }
}

/**
 * Search for multiple Visual Novels (for autocomplete)
 * @param {string} searchTerm - Search term
 * @param {number} limit - Maximum number of results (default: 10)
 * @returns {Promise<Array>} Array of VN objects for autocomplete
 */
async function searchVNs(searchTerm, limit = 10) {
  if (!searchTerm || searchTerm.trim() === "" || searchTerm.length < 2) {
    return [];
  }

  try {
    const searchQuery = {
      filters: ["search", "=", searchTerm.trim()],
      fields: "title, aliases, released, length",
      sort: "searchrank",
      results: Math.min(limit, 25) // VNDB API limit is 25
    };

    const vnInfo = await makeVNDBRequest('vn', searchQuery);
    
    if (vnInfo && vnInfo.results) {
      return vnInfo.results.map(vn => {
        // Create a display name with ID for uniqueness
        let displayName = vn.title;
        if (vn.released) {
          displayName += ` (${vn.released})`;
        }
        
        // Truncate if too long for Discord autocomplete (100 char limit)
        if (displayName.length > 90) {
          displayName = displayName.substring(0, 87) + "...";
        }

        return {
          name: displayName,
          value: `${vn.title}|${vn.id}`, // Use pipe separator to store both title and ID
          id: vn.id,
          title: vn.title,
          released: vn.released || null,
          length: vn.length || null,
          aliases: vn.aliases || []
        };
      });
    }

    return [];
  } catch (error) {
    console.error("❌ Error searching VNs from VNDB:", error);
    return [];
  }
}

/**
 * Get VN info by ID (for when user selects from autocomplete)
 * @param {string} vnId - VNDB ID (e.g., "v27448")
 * @returns {Promise<Object|null>} VN info object or null if not found
 */
async function getVNInfoById(vnId) {
  if (!vnId) {
    return null;
  }

  try {
    // Remove 'v' prefix if present
    const cleanId = vnId.startsWith('v') ? vnId.substring(1) : vnId;
    
    const searchQuery = {
      filters: ["id", "=", cleanId],
      fields: "title, image.url, image.dims, aliases, released, length, description, developers.name",
    };

    const vnInfo = await makeVNDBRequest('vn', searchQuery);
    
    if (vnInfo && vnInfo.results && vnInfo.results.length > 0) {
      const vn = vnInfo.results[0];
      
      return {
        id: vn.id,
        title: vn.title,
        image: vn.image?.url || null,
        url: `https://vndb.org/v${vn.id}`,
        description: vn.description?.substring(0, 200) + (vn.description?.length > 200 ? "..." : "") || null,
        released: vn.released || null,
        length: vn.length || null,
        developer: vn.developers?.[0]?.name || null,
        aliases: vn.aliases || []
      };
    }

    return null;
  } catch (error) {
    console.error("❌ Error fetching VN info by ID from VNDB:", error);
    return null;
  }
}

module.exports = {
  getVNInfo,
  getVNInfoById,
  getVNCoverImage,
  searchVNs,
  makeVNDBRequest
};