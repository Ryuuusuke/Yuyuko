/**
 * Generate heatmap image for user immersion statistics
 * @module utils/generateHeatmapImage
 */

const { createCanvas } = require("canvas");

// GitHub-style blues color palette (similar to Blues_r in matplotlib)
const colors = [
  "#222222", "#0e4429", "#006d32", "#26a641",
  "#39d353", "#57e86a", "#7ff081", "#a6f598", "#d1ffcd"
];

/**
 * Get color based on value intensity
 * @param {number} value - Data value
 * @param {number} max - Maximum value in dataset
 * @returns {string} Hex color code
 */
function getColor(value, max) {
  if (value === 0 || max === 0) return colors[0];
  const normalizedValue = Math.log(value + 1) / Math.log(max + 1);
  const index = Math.min(colors.length - 1, Math.floor(normalizedValue * (colors.length - 1)) + 1);
  return colors[index];
}

/**
 * Get day of week according to ISO 8601 standard (Monday = 0, Sunday = 6)
 * @param {Date} date - Date object
 * @returns {number} Day of week index (0-6)
 */
function getDayOfWeek(date) {
  const day = date.getDay();
  // Convert: Sunday(0) -> 6, Monday(1) -> 0, ..., Saturday(6) -> 5
  return day === 0 ? 6 : day - 1;
}

/**
 * Get ISO week number (first week contains the first Thursday)
 * @param {Date} date - Date object
 * @returns {number} Week number
 */
function getISOWeek(date) {
  const dateObject = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = dateObject.getUTCDay() || 7;
  dateObject.setUTCDate(dateObject.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(dateObject.getUTCFullYear(), 0, 1));
  return Math.ceil((((dateObject - yearStart) / 86400000) + 1) / 7);
}

/**
 * Generate heatmap image from daily immersion totals
 * @param {Object} dailyTotals - Object with date keys and point values
 * @param {number|null} year - Year to generate heatmap for (defaults to current year)
 * @returns {Promise<Buffer>} PNG image buffer
 */
async function generateHeatmapImage(dailyTotals, year = null) {
  const CELL_SIZE = 20;
  const CELL_PADDING = 2;
  const MARGIN_LEFT = 60;
  const MARGIN_TOP = 80;
  const MARGIN_BOTTOM = 100;
  const MARGIN_RIGHT = 60;

  const currentYear = year || new Date().getFullYear();
  const WEEKS = 53;
  const DAYS = 7;

  const chartWidth = WEEKS * (CELL_SIZE + CELL_PADDING);
  const chartHeight = DAYS * (CELL_SIZE + CELL_PADDING);
  const canvasWidth = chartWidth + MARGIN_LEFT + MARGIN_RIGHT;
  const canvasHeight = chartHeight + MARGIN_TOP + MARGIN_BOTTOM;

  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#2c2c2d";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const maxVal = Math.max(...Object.values(dailyTotals), 1);

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  ctx.fillStyle = "#ffffff";
  ctx.font = "12px Arial";
  ctx.textAlign = "center";

  // Draw month labels
  for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
    const monthDate = new Date(currentYear, monthIndex, 1);
    const weekOfMonth = getISOWeek(monthDate) - 1;
    const x = MARGIN_LEFT + weekOfMonth * (CELL_SIZE + CELL_PADDING) + CELL_SIZE / 2;
    if (x > MARGIN_LEFT && x < canvasWidth - MARGIN_RIGHT) {
      ctx.fillText(monthNames[monthIndex], x, MARGIN_TOP - 10);
    }
  }

  // Day labels (Monday to Sunday, according to array index)
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.font = "13px 'Segoe UI'";

  for (let dayIndex = 0; dayIndex < dayLabels.length; dayIndex++) {
    const y = MARGIN_TOP + dayIndex * (CELL_SIZE + CELL_PADDING) + CELL_SIZE / 2;
    ctx.fillText(dayLabels[dayIndex], MARGIN_LEFT - 10, y);
  }

  // Draw heatmap grid
  const startDate = new Date(currentYear, 0, 1);
  const endDate = new Date(currentYear, 11, 31);

  for (let currentDate = new Date(startDate); currentDate <= endDate; currentDate.setDate(currentDate.getDate() + 1)) {
    // Ensure consistent date format (local date, not UTC)
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    const value = dailyTotals[dateStr] || 0;
    const week = getISOWeek(currentDate) - 1;
    const dayOfWeek = getDayOfWeek(currentDate);
    const x = MARGIN_LEFT + week * (CELL_SIZE + CELL_PADDING);
    const y = MARGIN_TOP + dayOfWeek * (CELL_SIZE + CELL_PADDING);
    ctx.fillStyle = getColor(value, maxVal);
    ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
    ctx.strokeStyle = "#2c2c2d";
    ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
  }

  // Highlight today
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (today.getFullYear() === currentYear) {
    const currentWeek = getISOWeek(today) - 1;
    const currentDay = getDayOfWeek(today);
    const x = MARGIN_LEFT + currentWeek * (CELL_SIZE + CELL_PADDING);
    const y = MARGIN_TOP + currentDay * (CELL_SIZE + CELL_PADDING);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 1, y - 1, CELL_SIZE + 2, CELL_SIZE + 2);
  }

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 18px Arial";
  ctx.textAlign = "left";
  ctx.fillText(`Immersion Heatmap - ${currentYear}`, MARGIN_LEFT, 30);

  const legendY = chartHeight + MARGIN_TOP + 40;
  const legendStartX = MARGIN_LEFT;
  ctx.font = "12px Arial";
  ctx.fillText("Less", legendStartX, legendY + 20);

  for (let colorIndex = 0; colorIndex < colors.length; colorIndex++) {
    const legendX = legendStartX + 40 + colorIndex * (CELL_SIZE + 2);
    ctx.fillStyle = colors[colorIndex];
    ctx.fillRect(legendX, legendY, CELL_SIZE, CELL_SIZE);
    ctx.strokeStyle = "#2c2c2d";
    ctx.strokeRect(legendX, legendY, CELL_SIZE, CELL_SIZE);
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillText("More", legendStartX + 40 + colors.length * (CELL_SIZE + 2) + 10, legendY + 20);

  // Stats
  const totalDays = Object.keys(dailyTotals).filter(date => dailyTotals[date] > 0).length;
  const totalPoints = Object.values(dailyTotals).reduce((sum, val) => sum + val, 0);
  const avgPoints = totalPoints > 0 ? (totalPoints / Math.max(totalDays, 1)).toFixed(1) : 0;

  ctx.font = "12px Arial";
  ctx.textAlign = "right";
  const statsX = canvasWidth - MARGIN_RIGHT;
  ctx.fillText(`${totalDays} days active`, statsX, legendY);
  ctx.fillText(`${totalPoints.toLocaleString()} total points`, statsX, legendY + 15);
  ctx.fillText(`${avgPoints} avg points/day`, statsX, legendY + 30);

  return canvas.toBuffer("image/png");
}

module.exports = generateHeatmapImage;