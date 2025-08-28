const pointsMultipliers = {
    visual_novel: 0.0028571428571429,
    manga: 0.25,
    anime: 13.0,
    book: 1.0,
    reading_time: 0.67,
    listening: 0.67,
    reading: 0.0028571428571429,
};

function calculatePoints(mediaType, amount) {
    return Math.round(amount * (pointsMultipliers[mediaType] || 1));
}

module.exports = {
    pointsMultipliers,
    calculatePoints
}
