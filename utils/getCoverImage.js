/**
 * Utility function to fetch cover images from AniList API
 * @module utils/getCoverImage
 */

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const { asyncHandler } = require("./errorHandler");

/**
 * Get cover image URL for a given media type and title from AniList
 * @param {string} type - Media type ("anime" or "manga")
 * @param {string} title - Media title to search for
 * @returns {Promise<string|null>} Cover image URL or null if not found
 */
async function getCoverImageByType(type, title) {
  if (!title || !type) return null;

  try {
    if (type === "anime" || type === "manga") {
      const query = `
        query ($search: String) {
          Media(search: $search, type: ${type === "anime" ? "ANIME" : "MANGA"}) {
            coverImage {
              large
            }
          }
        }
      `;

      const variables = { search: title };

      const res = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables })
      });

      const json = await res.json();
      return json?.data?.Media?.coverImage?.large || null;
    }

    return null;

  } catch (err) {
    console.error("Failed to fetch cover image:", err);
  }

  return null;
}

module.exports = getCoverImageByType;
