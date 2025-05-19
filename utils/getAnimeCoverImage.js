const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

async function getAnimeCoverImage(title) {
  try {
    const response = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(title)}&limit=1`);
    const data = await response.json();

    if (data?.data?.length > 0 && data.data[0].images?.jpg?.image_url) {
      return data.data[0].images.jpg.image_url;
    } else {
      return null;
    }
  } catch (err) {
    console.error("⚠️ Gagal fetch gambar anime:", err.message);
    return null;
  }
}

module.exports = getAnimeCoverImage;
