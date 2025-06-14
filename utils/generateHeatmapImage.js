const { createCanvas } = require("canvas");

// GitHub-style blues color palette (similar to Blues_r in matplotlib)
const colors = [
  "#222222", "#0e4429", "#006d32", "#26a641",
  "#39d353", "#57e86a", "#7ff081", "#a6f598", "#d1ffcd"
];

function getColor(value, max) {
  if (value === 0 || max === 0) return colors[0];
  const normalizedValue = Math.log(value + 1) / Math.log(max + 1);
  const index = Math.min(colors.length - 1, Math.floor(normalizedValue * (colors.length - 1)) + 1);
  return colors[index];
}

// ✅ ISO 8601: Monday = 0, Sunday = 6 (sesuai dengan index array)
function getDayOfWeek(date) {
  const day = date.getDay();
  // Konversi: Sunday(0) -> 6, Monday(1) -> 0, ..., Saturday(6) -> 5
  return day === 0 ? 6 : day - 1;
}

// ✅ ISO 8601: Minggu pertama mengandung hari Kamis pertama
function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

async function generateHeatmapImage(dailyTotals, year = null) {
  const cellSize = 20;
  const cellPadding = 2;
  const marginLeft = 60;
  const marginTop = 80;
  const marginBottom = 100;
  const marginRight = 60;

  const currentYear = year || new Date().getFullYear();
  const weeks = 53;
  const days = 7;

  const chartWidth = weeks * (cellSize + cellPadding);
  const chartHeight = days * (cellSize + cellPadding);
  const canvasWidth = chartWidth + marginLeft + marginRight;
  const canvasHeight = chartHeight + marginTop + marginBottom;

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
  for (let month = 0; month < 12; month++) {
    const monthDate = new Date(currentYear, month, 1);
    const weekOfMonth = getISOWeek(monthDate) - 1;
    const x = marginLeft + weekOfMonth * (cellSize + cellPadding) + cellSize / 2;
    if (x > marginLeft && x < canvasWidth - marginRight) {
      ctx.fillText(monthNames[month], x, marginTop - 10);
    }
  }

  // Day labels (Senin sampai Minggu, sesuai dengan index array)
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.font = "13px 'Segoe UI'";

  for (let i = 0; i < dayLabels.length; i++) {
    const y = marginTop + i * (cellSize + cellPadding) + cellSize / 2;
    ctx.fillText(dayLabels[i], marginLeft - 10, y);
  }

  // Draw heatmap grid
  const startDate = new Date(currentYear, 0, 1);
  const endDate = new Date(currentYear, 11, 31);

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    // Pastikan format tanggal konsisten (local date, bukan UTC)
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    const value = dailyTotals[dateStr] || 0;
    const week = getISOWeek(d) - 1;
    const dayOfWeek = getDayOfWeek(d);
    const x = marginLeft + week * (cellSize + cellPadding);
    const y = marginTop + dayOfWeek * (cellSize + cellPadding);
    ctx.fillStyle = getColor(value, maxVal);
    ctx.fillRect(x, y, cellSize, cellSize);
    ctx.strokeStyle = "#2c2c2d";
    ctx.strokeRect(x, y, cellSize, cellSize);
  }

  // Highlight today
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (today.getFullYear() === currentYear) {
    const currentWeek = getISOWeek(today) - 1;
    const currentDay = getDayOfWeek(today);
    const x = marginLeft + currentWeek * (cellSize + cellPadding);
    const y = marginTop + currentDay * (cellSize + cellPadding);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 1, y - 1, cellSize + 2, cellSize + 2);
  }

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 18px Arial";
  ctx.textAlign = "left";
  ctx.fillText(`Immersion Heatmap - ${currentYear}`, marginLeft, 30);

  const legendY = chartHeight + marginTop + 40;
  const legendStartX = marginLeft;
  ctx.font = "12px Arial";
  ctx.fillText("Less", legendStartX, legendY + 20);

  for (let i = 0; i < colors.length; i++) {
    const legendX = legendStartX + 40 + i * (cellSize + 2);
    ctx.fillStyle = colors[i];
    ctx.fillRect(legendX, legendY, cellSize, cellSize);
    ctx.strokeStyle = "#2c2c2d";
    ctx.strokeRect(legendX, legendY, cellSize, cellSize);
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillText("More", legendStartX + 40 + colors.length * (cellSize + 2) + 10, legendY + 20);

  // Stats
  const totalDays = Object.keys(dailyTotals).filter(date => dailyTotals[date] > 0).length;
  const totalPoints = Object.values(dailyTotals).reduce((sum, val) => sum + val, 0);
  const avgPoints = totalPoints > 0 ? (totalPoints / Math.max(totalDays, 1)).toFixed(1) : 0;

  ctx.font = "12px Arial";
  ctx.textAlign = "right";
  const statsX = canvasWidth - marginRight;
  ctx.fillText(`${totalDays} days active`, statsX, legendY);
  ctx.fillText(`${totalPoints.toLocaleString()} total points`, statsX, legendY + 15);
  ctx.fillText(`${avgPoints} avg points/day`, statsX, legendY + 30);

  return canvas.toBuffer("image/png");
}

module.exports = generateHeatmapImage;