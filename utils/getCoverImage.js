const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

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
    console.error("Gagal fetch cover image:", err);
  }

  return null;
}

module.exports = getCoverImageByType;
