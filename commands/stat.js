/**
 * Statistics command
 * Displays user immersion statistics with charts and heatmaps
 * @module commands/stat
 */

const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require("discord.js"); 
const db = require("../firebase/firestore");
const { getUserStreak } = require("../utils/streak");
const { createCanvas } = require('canvas');
const Chart = require('chart.js/auto');
const generateHeatmapImage = require('../utils/generateHeatmapImage'); // Your new heatmap file

module.exports = {
  name: "stat",
  data: new SlashCommandBuilder()
    .setName("stat")
    .setDescription("View your total immersion from all media types")
    .addStringOption(option =>
      option
        .setName("visual_type")
        .setDescription("Choose visualization type")
        .setRequired(false)
        .addChoices(
          { name: "Bar Chart", value: "barchart" },
          { name: "Heatmap", value: "heatmap" }
        )
    )
    .addIntegerOption(option =>
      option
        .setName("days")
        .setDescription("Time period (7 or 30 days)")
        .setRequired(false)
        .addChoices(
          { name: "7 days", value: 7 },
          { name: "30 days", value: 30 }
        )
    )
    .addIntegerOption(option =>
      option
        .setName("year")
        .setDescription("Year for heatmap (default: current year)")
        .setRequired(false)
        .setMinValue(2020)
        .setMaxValue(2030)
    ),

  /**
   * Execute the statistics command
   * @param {Object} interaction - Discord interaction object
   * @returns {Promise<void>}
   */
  async execute(interaction) {
    await interaction.deferReply();

    const user = interaction.user;
    const visualType = interaction.options.getString("visual_type");
    const days = interaction.options.getInteger("days");
    const year = interaction.options.getInteger("year");

    // Get user data
    const userDoc = await db.collection("users").doc(user.id).get();

    if (!userDoc.exists || !userDoc.data().stats) {
      return await interaction.editReply("🚫 No immersion data found for you.");
    }

    const userData = userDoc.data();
    const stats = userData.stats;
    const profile = userData.profile;
    const summary = userData.summary;

    // If heatmap is requested
    if (visualType === "heatmap") {
      try {
        const heatmapData = await getHeatmapData(user.id, year);
        const heatmapBuffer = await generateHeatmapImage(heatmapData, year);
        const attachment = new AttachmentBuilder(heatmapBuffer, { name: 'immersion-heatmap.png' });
        
        const embed = new EmbedBuilder()
          .setColor(0x3498db)
          .setTitle(`📊 Immersion Heatmap – ${profile?.displayName || profile?.username || user.username}`)
          .setDescription(`Showing daily activity for ${year || new Date().getFullYear()}`)
          .setImage('attachment://immersion-heatmap.png')
          .setTimestamp();

        return await interaction.editReply({ embeds: [embed], files: [attachment] });
      } catch (error) {
        console.error("Error generating heatmap:", error);
        return await interaction.editReply("❌ Failed to create heatmap. Please try again.");
      }
    }

    // If bar chart is requested
    if (visualType === "barchart") {
      try {
        const chartBuffer = await generateBarChart(user.id, days);
        const attachment = new AttachmentBuilder(chartBuffer, { name: 'immersion-chart.png' });
        
        const embed = new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle(`📊 Immersion Bar Chart – ${profile?.displayName || profile?.username || user.username}`)
          .setDescription(days ? `Showing data for the last ${days} days` : "Showing all-time data by media type")
          .setImage('attachment://immersion-chart.png')
          .setTimestamp();

        return await interaction.editReply({ embeds: [embed], files: [attachment] });
      } catch (error) {
        console.error("Error generating chart:", error);
        return await interaction.editReply("❌ Failed to create chart. Please try again.");
      }
    }

    // Original stat display code
    const { streak, longest } = await getUserStreak(user.id);

    const pointsMultipliers = {
      visual_novel: 0.0028571428571429,
      manga: 0.25,
      anime: 13.0,
      book: 1.0,
      reading_time: 0.67,
      listening: 0.67,
      reading: 0.0028571428571429,
    };

    const labelMap = {
      visual_novel: "Visual Novel",
      manga: "Manga",
      anime: "Anime",
      book: "Book",
      reading_time: "Reading Time",
      listening: "Listening",
      reading: "Reading",
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

    let totalPoints = 0;
    let totalSessions = 0;
    const statEntries = [];

    for (const [type, data] of Object.entries(stats)) {
      if (data.total > 0) {
        const points = Math.round(data.total * (pointsMultipliers[type] || 1));
        totalPoints += points;
        totalSessions += data.sessions || 0;
        
        statEntries.push({
          label: labelMap[type] || type,
          total: data.total,
          unit: unitMap[type] || 'units',
          sessions: data.sessions || 0,
          points: points,
          type: type
        });
      }
    }

    if (statEntries.length === 0) {
      const embed = new EmbedBuilder()
        .setColor(0x95a5a6)
        .setTitle(`📊 Immersion Stats`)
        .setDescription("No activity has been recorded yet.")
        .setTimestamp();
      
      return await interaction.editReply({ embeds: [embed] });
    }

    statEntries.sort((a, b) => b.points - a.points);

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle(`📊 Immersion Stats – ${profile?.displayName || profile?.username || user.username}`)
      .setDescription(`**Total Points: ${totalPoints.toLocaleString()}** • **Total Sessions: ${totalSessions}**\n\n*Tip: Use \`/stat visual_type:barchart\` or \`/stat visual_type:heatmap\` to see visualizations!*`)
      .setTimestamp();

    if (profile?.avatar) {
      embed.setThumbnail(profile.avatar);
    }

    for (const stat of statEntries) {
      const percentage = totalPoints > 0 ? ((stat.points / totalPoints) * 100).toFixed(1) : 0;
      embed.addFields({
        name: `${stat.label}`,
        value: `**${stat.total.toLocaleString()}** ${stat.unit}\n` +
               `${stat.points.toLocaleString()} pts (${percentage}%)\n` +
               `${stat.sessions} sessions`,
        inline: true,
      });
    }

    embed.addFields(
      { name: "\u200b", value: "\u200b", inline: false },
      { name: "Current Streak", value: `${streak} day${streak !== 1 ? 's' : ''}`, inline: true },
      { name: "Longest Streak", value: `${longest} day${longest !== 1 ? 's' : ''}`, inline: true }
    );

    const lastActivity = summary?.lastActivity;
    if (lastActivity) {
      embed.setFooter({ 
        text: `Last activity: ${lastActivity.toDate().toLocaleDateString()}`,
        iconURL: user.displayAvatarURL({ size: 32 })
      });
    }

    await interaction.editReply({ embeds: [embed] });
  }
};

/**
 * Get heatmap data for a user
 * @param {string} userId - Discord user ID
 * @param {number|null} year - Year to get data for (defaults to current year)
 * @returns {Promise<Object>} Daily totals object with date keys and point values
 */
async function getHeatmapData(userId, year = null) {
  const targetYear = year || new Date().getFullYear();
  const startDate = new Date(targetYear, 0, 1);
  const endDate = new Date(targetYear, 11, 31);

  const logs = await db.collection("users")
    .doc(userId)
    .collection("immersion_logs")
    .where("timestamps.created", ">=", startDate)
    .where("timestamps.created", "<=", endDate)
    .orderBy("timestamps.created", "asc")
    .get();

  const dailyTotals = {};
  const pointsMultipliers = {
    visual_novel: 0.0028571428571429,
    manga: 0.25,
    anime: 13.0,
    book: 1.0,
    reading_time: 0.67,
    listening: 0.67,
    reading: 0.0028571428571429,
  };

  logs.forEach(doc => {
    const data = doc.data();
    let dateStr;
    if (data.timestamps?.date) {
      dateStr = data.timestamps.date;
    } else {
      const dateObj = data.timestamps.created.toDate();
      dateStr = dateObj.getFullYear() + '-' + 
                String(dateObj.getMonth() + 1).padStart(2, '0') + '-' + 
                String(dateObj.getDate()).padStart(2, '0');
    }
    
    const mediaType = data.activity.type;
    const amount = data.activity.amount;
    
    if (!dailyTotals[dateStr]) {
      dailyTotals[dateStr] = 0;
    }
    
    const points = Math.round(amount * (pointsMultipliers[mediaType] || 1));
    dailyTotals[dateStr] += points;
  });

  return dailyTotals;
}

/**
 * Generate bar chart for user statistics
 * @param {string} userId - Discord user ID
 * @param {number|null} days - Number of days to show (7 or 30, or null for all time)
 * @returns {Promise<Buffer>} PNG image buffer
 */
async function generateBarChart(userId, days = null) {
  const CHART_WIDTH = 1200;
  const CHART_HEIGHT = 800;
  const canvas = createCanvas(CHART_WIDTH, CHART_HEIGHT);
  const ctx = canvas.getContext('2d');

  // Media type colors
  const mediaColors = {
    visual_novel: '#9b59b6',
    manga: '#e74c3c',
    anime: '#3498db',
    book: '#2ecc71',
    reading_time: '#f39c12',
    listening: '#1abc9c',
    reading: '#e67e22'
  };

  const labelMap = {
    visual_novel: "Visual Novel",
    manga: "Manga",
    anime: "Anime",
    book: "Book",
    reading_time: "Reading Time",
    listening: "Listening",
    reading: "Reading",
  };

  const pointsMultipliers = {
    visual_novel: 0.0028571428571429,
    manga: 0.25,
    anime: 13.0,
    book: 1.0,
    reading_time: 0.67,
    listening: 0.67,
    reading: 0.0028571428571429,
  };

  let chartData, chartLabels, chartTitle;

  if (days) {
    // Time-based chart (7 or 30 days)
    const { data, labels } = await getTimeBasedData(userId, days);
    chartData = data;
    chartLabels = labels;
    chartTitle = `Immersion Points - Last ${days} Days`;
  } else {
    // Overall media type chart
    const { data, labels } = await getOverallData(userId);
    chartData = data;
    chartLabels = labels;
    chartTitle = 'Immersion Points by Media Type';
  }

  const config = {
    type: 'bar',
    data: chartData,
    options: {
      responsive: false,
      animation: false,
      plugins: {
        title: {
          display: true,
          text: chartTitle,
          color: 'white',
          font: {
            size: 24,
            weight: 'bold'
          },
          padding: 20
        },
        legend: {
          display: days ? true : false,
          labels: {
            color: 'white',
            font: {
              size: 14
            }
          }
        }
      },
      scales: {
        x: {
          stacked: days ? true : false,
          ticks: {
            color: 'white',
            font: {
              size: 12
            }
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        },
        y: {
          stacked: days ? true : false,
          ticks: {
            color: 'white',
            font: {
              size: 12
            }
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        }
      },
      backgroundColor: '#2c2c2d'
    }
  };

  // Set dark background
  ctx.fillStyle = '#2c2c2d';
  ctx.fillRect(0, 0, CHART_WIDTH, CHART_HEIGHT);

  const chart = new Chart(ctx, config);
  
  // Wait for chart to render
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return canvas.toBuffer('image/png');
}

/**
 * Get time-based data for chart (7 or 30 days)
 * @param {string} userId - Discord user ID
 * @param {number} days - Number of days (7 or 30)
 * @returns {Promise<Object>} Chart data and labels
 */
async function getTimeBasedData(userId, days) {
  const today = new Date();
  const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - days + 1);
  startDate.setHours(0, 0, 0, 0);

  const logs = await db.collection("users")
    .doc(userId)
    .collection("immersion_logs")
    .where("timestamps.created", ">=", startDate)
    .where("timestamps.created", "<=", endDate)
    .orderBy("timestamps.created", "asc")
    .get();

  // Group by date
  const dailyData = {};
  const mediaTypes = new Set();

  logs.forEach(doc => {
    const data = doc.data();
    let dateStr;
    
    // Prioritize using timestamps.date if available
    if (data.timestamps?.date) {
      dateStr = data.timestamps.date;
    } else {
      // Convert Firebase Timestamp to local date string
      const dateObj = data.timestamps.created.toDate();
      dateStr = dateObj.getFullYear() + '-' + 
                String(dateObj.getMonth() + 1).padStart(2, '0') + '-' + 
                String(dateObj.getDate()).padStart(2, '0');
    }
    
    const mediaType = data.activity.type;
    
    if (!dailyData[dateStr]) {
      dailyData[dateStr] = {};
    }
    
    if (!dailyData[dateStr][mediaType]) {
      dailyData[dateStr][mediaType] = 0;
    }
    
    const points = Math.round(data.activity.amount * (getPointsMultiplier(mediaType) || 1));
    dailyData[dateStr][mediaType] += points;
    mediaTypes.add(mediaType);
  });

  // Create labels for all days in range
  const labels = [];
  const allDates = [];
  
  // Generate all dates in range
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.getFullYear() + '-' + 
                    String(d.getMonth() + 1).padStart(2, '0') + '-' + 
                    String(d.getDate()).padStart(2, '0');
    allDates.push(dateStr);
    
    // Format label for better readability
    labels.push(d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      weekday: 'short'
    }));
  }

  // Create datasets for each media type
  const mediaColors = {
    visual_novel: '#9b59b6',
    manga: '#e74c3c',
    anime: '#3498db',
    book: '#2ecc71',
    reading_time: '#f39c12',
    listening: '#1abc9c',
    reading: '#e67e22'
  };

  const labelMap = {
    visual_novel: "Visual Novel",
    manga: "Manga",
    anime: "Anime",
    book: "Book",
    reading_time: "Reading Time",
    listening: "Listening",
    reading: "Reading",
  };

  const datasets = [];
  
  // Sort media types by total points (descending) for better visual hierarchy
  const sortedMediaTypes = Array.from(mediaTypes).sort((a, b) => {
    const totalA = allDates.reduce((sum, date) => sum + (dailyData[date] && dailyData[date][a] ? dailyData[date][a] : 0), 0);
    const totalB = allDates.reduce((sum, date) => sum + (dailyData[date] && dailyData[date][b] ? dailyData[date][b] : 0), 0);
    return totalB - totalA;
  });

  sortedMediaTypes.forEach(mediaType => {
    const data = allDates.map(date => {
      return dailyData[date] && dailyData[date][mediaType] ? dailyData[date][mediaType] : 0;
    });

    datasets.push({
      label: labelMap[mediaType] || mediaType,
      data: data,
      backgroundColor: mediaColors[mediaType] || '#95a5a6',
      borderColor: mediaColors[mediaType] || '#95a5a6',
      borderWidth: 1,
      stack: 'stack1' // All datasets use the same stack
    });
  });

  return {
    data: {
      labels: labels,
      datasets: datasets
    },
    labels: labels
  };
}

/**
 * Get overall data by media type
 * @param {string} userId - Discord user ID
 * @returns {Promise<Object>} Chart data and labels
 */
async function getOverallData(userId) {
  const userDoc = await db.collection("users").doc(userId).get();
  const stats = userDoc.data().stats || {};

  const labels = [];
  const data = [];
  const backgroundColors = [];

  const mediaColors = {
    visual_novel: '#9b59b6',
    manga: '#e74c3c',
    anime: '#3498db',
    book: '#2ecc71',
    reading_time: '#f39c12',
    listening: '#1abc9c',
    reading: '#e67e22'
  };

  const labelMap = {
    visual_novel: "Visual Novel",
    manga: "Manga",
    anime: "Anime",
    book: "Book",
    reading_time: "Reading Time",
    listening: "Listening",
    reading: "Reading",
  };

  for (const [type, statData] of Object.entries(stats)) {
    if (statData.total > 0) {
      const points = Math.round(statData.total * (getPointsMultiplier(type) || 1));
      labels.push(labelMap[type] || type);
      data.push(points);
      backgroundColors.push(mediaColors[type] || '#95a5a6');
    }
  }

  return {
    data: {
      labels: labels,
      datasets: [{
        label: 'Points',
        data: data,
        backgroundColor: backgroundColors,
        borderColor: backgroundColors,
        borderWidth: 1
      }]
    },
    labels: labels
  };
}

/**
 * Get points multiplier for media type
 * @param {string} mediaType - Media type
 * @returns {number} Points multiplier
 */
function getPointsMultiplier(mediaType) {
  const multipliers = {
    visual_novel: 0.0028571428571429,
    manga: 0.25,
    anime: 13.0,
    book: 1.0,
    reading_time: 0.67,
    listening: 0.67,
    reading: 0.0028571428571429,
  };
  return multipliers[mediaType];
}