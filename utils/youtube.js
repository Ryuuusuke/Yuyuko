const axios = require("axios");
const { YOUTUBE_API_KEY } = require("../environment");

function extractYouTubeVideoId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : url; // Return the ID or the original string if it's already an ID
}

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
            
            const duration = parseDuration(contentDetails.duration);
            
            return {
                title: snippet.title,
                duration: duration, // in seconds
                thumbnail: snippet.thumbnails?.maxres?.url || 
                          snippet.thumbnails?.high?.url || 
                          snippet.thumbnails?.medium?.url || 
                          snippet.thumbnails?.default?.url || 
                          null
            };
        }
        
        return null;
    } catch (error) {
        console.error("YouTube API Error:", error.response?.data || error.message);
        return null;
    }
}

function parseDuration(duration) {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    
    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    const seconds = parseInt(match[3]) || 0;
    
    return hours * 3600 + minutes * 60 + seconds;
}

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

module.exports = {
    extractYouTubeVideoId,
    getYouTubeVideoInfo,
    normalizeYouTubeUrl
}
