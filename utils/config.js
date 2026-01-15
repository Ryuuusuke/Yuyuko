// Centralized configuration for Yuyuko Bot

// Day offset configuration
// Set to 2 means: day ends at 2:00 AM instead of midnight
// Example: Activity at 1:30 AM on Jan 16 will count as Jan 15
const DAY_END_HOUR = 2; // Hours after midnight when the "day" ends

// Get current date with day offset applied
// If current time is before DAY_END_HOUR, return yesterday's date
function getEffectiveDate() {
    const now = new Date();
    const hours = now.getHours();

    // If it's before DAY_END_HOUR (e.g., 2 AM), subtract a day
    if (hours < DAY_END_HOUR) {
        now.setDate(now.getDate() - 1);
    }
    return now;
}

// Convert any date to effective date (applying day offset)
function toEffectiveDate(date) {
    const d = new Date(date);
    const hours = d.getHours();

    if (hours < DAY_END_HOUR) {
        d.setDate(d.getDate() - 1);
    }
    return d;
}

// Get current date string in YYYY-MM-DD format (with day offset)
function getEffectiveDateString() {
    const d = getEffectiveDate();
    return d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');
}

// Format date for display
function formatDate(date) {
    return new Date(date).toLocaleString('id-ID', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Designated channel IDs where Ayumi responds to all messages
const designatedChannelIds = [
    "1427247637618360432",
    "1400398753420021814",
    "1427246299375337604"
];

// Discord embed colors
const COLORS = {
    PRIMARY: 0x00bfff,
    SUCCESS: 0x2ecc71,
    ERROR: 0xff0000,
    WARNING: 0xffa500,
    INFO: 0x3498db,
    IMMERSION: 0x00d4aa
};

const mediaTypeLabelMap = {
    visual_novel: "Visual Novel",
    manga: "Manga",
    anime: "Anime",
    book: "Book",
    reading_time: "Reading Time",
    listening: "Listening",
    reading: "Reading",
    all: "All Media Types"
};

const unitMap = {
    visual_novel: "characters",
    manga: "pages",
    anime: "episodes",
    book: "pages",
    reading_time: "minutes",
    listening: "minutes",
    reading: "characters",
};

module.exports = {
    DAY_END_HOUR,
    getEffectiveDate,
    toEffectiveDate,
    getEffectiveDateString,
    formatDate,
    designatedChannelIds,
    COLORS,
    mediaTypeLabelMap,
    unitMap
};
