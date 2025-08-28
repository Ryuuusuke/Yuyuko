
// Helper function to format date
function formatDate(timestamp) {
  let logDate;
  
  // Handle Firestore Timestamp object
  if (timestamp && typeof timestamp.toDate === 'function') {
    logDate = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    logDate = timestamp;
  } else {
    logDate = new Date(timestamp);
  }
  
  const now = new Date();
  const diffTime = now - logDate;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // Convert to 24-hour format
  const timeString = logDate.toLocaleTimeString('en-GB', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
  
  if (diffDays === 0) {
    return `Today, ${timeString}`;
  } else if (diffDays === 1) {
    return `Yesterday, ${timeString}`;
  } else {
    return logDate.toLocaleDateString('en-GB', { 
      weekday: 'long',
      day: 'numeric',
      month: 'short'
    }) + `, ${timeString}`;
  }
}

// Helper function to get media type label
function getMediaTypeLabel(mediaType) {
  const labelMap = {
    visual_novel: "Visual Novel",
    manga: "Manga",
    anime: "Anime", 
    book: "Book",
    reading_time: "Reading Time",
    listening: "Listening",
    reading: "Reading",
  };
  return labelMap[mediaType] || mediaType;
}

// Helper function to get unit for type
function getUnitForType(type) {
  const unitMap = {
    visual_novel: "characters",
    manga: "pages",
    anime: "episodes", 
    book: "pages",
    reading_time: "minutes",
    listening: "minutes",
    reading: "characters",
  };
  return unitMap[type] || "units";
}

// Helper function to get timeframe label
function getTimeframeLabel(timeframe) {
  const labelMap = {
    day: "Last 24 Hours",
    week: "Last 7 Days",
    month: "Last 30 Days",
    year: "Last 365 Days",
    all: "All Time"
  };
  return labelMap[timeframe] || timeframe;
}

module.exports = {
    formatDate,
    getMediaTypeLabel,
    getUnitForType,
    getTimeframeLabel
}
