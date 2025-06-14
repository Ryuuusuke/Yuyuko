const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

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
    console.error("⚠️ Gagal fetch data dari AniList:", err.message);
    return null;
  }
}

// New function for searching multiple results (for autocomplete)
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
    console.error("⚠️ Gagal search data dari AniList:", err.message);
    return [];
  }
}

// Function to get info by ID (for when user selects from autocomplete)
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
    console.error("⚠️ Gagal fetch data dari AniList by ID:", err.message);
    return null;
  }
}

// Function to get info based on media type
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