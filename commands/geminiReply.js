/**
 * Ayumi AI assistant command handler
 * Handles direct interactions with the bot through mentions
 * @module commands/geminiReply
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GEMINI_API_KEY } = require("../environment");

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const textModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
const imageGenModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash-preview-image-generation" });

// In-memory user data
const userData = new Map();

// === Core Utility Functions ===

/**
 * Get user data from in-memory storage
 * @param {string} userId - Discord user ID
 * @returns {Object|undefined} User data or undefined if not found
 */
function getUserData(userId) {
  return userData.get(userId);
}

/**
 * Update conversation history for a user
 * @param {string} userId - Discord user ID
 * @param {string} userMessage - User's message
 * @param {string} botReply - Bot's reply
 * @returns {void}
 */
function updateConversationHistory(userId, userMessage, botReply) {
  const data = getUserData(userId);
  if (!data) return;
  const history = data.conversationHistory || [];
  history.push({ type: 'user', content: userMessage });
  history.push({ type: 'bot', content: botReply });
  userData.set(userId, { ...data, conversationHistory: history });
}

/**
 * Store or update user data in in-memory storage
 * @param {string} userId - Discord user ID
 * @param {string} username - Discord username
 * @param {string} displayName - Discord display name
 * @param {string|null} nickname - Server nickname (optional)
 * @param {Object|null} guildMember - Guild member object (optional)
 * @returns {void}
 */
function storeUserData(userId, username, displayName, nickname = null, guildMember = null) {
  const existingData = userData.get(userId) || {};
  let bestName = guildMember?.nickname || guildMember?.displayName || displayName || username;

  userData.set(userId, {
    ...existingData,
    userId,
    username,
    displayName,
    nickname,
    bestName,
    guildNickname: guildMember?.nickname || null,
    lastInteraction: new Date(),
    interactionCount: (existingData.interactionCount || 0) + 1,
    conversationHistory: existingData.conversationHistory || [],
  });
}

/**
 * Get user's preferred name
 * @param {string} userId - Discord user ID
 * @returns {string|null} User's preferred name or null if not found
 */
function getUserName(userId) {
  const user = getUserData(userId);
  return user?.guildNickname || user?.bestName || user?.displayName || user?.username || null;
}

/**
 * Get recent conversation history from the channel
 * @param {Object} message - Discord message object
 * @param {number} limit - Number of messages to fetch (default: 5)
 * @returns {Promise<Array>} Array of message objects with author, content, and timestamp
 */
async function getConversationHistory(message, limit = 5) {
  try {
    const messages = await message.channel.messages.fetch({ 
      limit: limit + 1,
      before: message.id,
    });

    const history = [];
    const sortedMessages = Array.from(messages.values()).reverse();
    
    for (const msg of sortedMessages) {
      if (msg.system || (Date.now() - msg.createdTimestamp) > 3600000) continue;

      const isBot = msg.author.id === message.client.user.id;
      const authorName = isBot ? 'Ayumi' : (msg.member?.nickname || msg.author.username);

      history.push({
        author: authorName,
        content: msg.content.substring(0, 200),
        isBot,
        timestamp: msg.createdAt,
      });
    }
    
    return history;
  } catch (error) {
    console.error("Error fetching conversation history:", error.message);
    return [];
  }
}

// === Image Processing Functions ===

/**
 * Download image from URL
 * @param {string} url - Image URL
 * @returns {Promise<Uint8Array>} Image data as byte array
 */
async function downloadImage(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  } catch (error) {
    console.error('Error downloading image:', error);
    throw error;
  }
}

/**
 * Detect if user is asking about avatar/foto profil
 * @param {string} text - User input text
 * @returns {boolean} True if text contains avatar-related keywords
 */
function detectAvatarQuestions(text) {
  const avatarKeywords = [
    'foto profil', 'avatar', 'profile picture', 'pp', 'foto pp',
    'gambar profil', 'foto saya', 'avatar saya', 'pp saya',
    'lihat foto', 'foto gue', 'avatar gue', 'pp gue'
  ];
  
  const lowerText = text.toLowerCase();
  return avatarKeywords.some(keyword => lowerText.includes(keyword));
}

/**
 * Detect if user is requesting image generation
 * @param {string} text - User input text
 * @returns {boolean} True if text contains image generation keywords
 */
function detectImageGeneration(text) {
  const genKeywords = [
    'buatkan gambar', 'generate gambar', 'buat gambar', 'gambarkan',
    'draw', 'create image', 'generate image', 'bikin gambar',
    'lukis', 'sketch', 'ilustrasi', 'visualisasi'
  ];
  
  const lowerText = text.toLowerCase();
  return genKeywords.some(keyword => lowerText.includes(keyword));
}

/**
 * Analyze image using Gemini AI
 * @param {string} imageUrl - URL of image to analyze
 * @param {string} userName - Name of user requesting analysis
 * @param {string} userQuestion - User's question about the image
 * @param {boolean} isAvatar - Whether the image is a user avatar
 * @returns {Promise<string>} AI-generated response
 */
async function analyzeImage(imageUrl, userName, userQuestion, isAvatar = false) {
  try {
    const imageData = await downloadImage(imageUrl);
    
    const analysisPrompt = `
Kamu adalah Ayumi, AI assistant Discord yang bisa melihat dan menganalisis ${isAvatar ? 'foto profil' : 'gambar'}.

USER: ${userName || 'User'}
PERTANYAAN: "${userQuestion}"

TUGAS:
- Lihat dan analisis ${isAvatar ? 'foto profil user' : 'gambar yang dikirim user'} dengan detail
- Respons sesuai kepribadian Ayumi (santai, ramah, sedikit jahil)
- Jangan pakai emoji berlebihan
- ${isAvatar ? 'Bisa komen tentang: karakter anime, warna, style, mood, dll' : 'Jelaskan apa yang Ayumi lihat di gambar'}
- Kasih komentar yang fun tapi tetap sopan

GAYA BICARA AYUMI:
- Natural, kasual, ramah
- Sesekali pakai bahasa Jepang ringan
- Celetukan ringan yang menghibur
- Tunjukkan Ayumi benar-benar "melihat" ${isAvatar ? 'foto' : 'gambar'} mereka

Respons as Ayumi:`;

    const result = await textModel.generateContent([
      analysisPrompt,
      {
        inlineData: {
          data: Buffer.from(imageData).toString('base64'),
          mimeType: 'image/jpeg'
        }
      }
    ]);

    return result.response.text();
  } catch (error) {
    console.error('Error analyzing image:', error);
    throw error;
  }
}

/**
 * Generate image using Gemini AI
 * @param {string} prompt - Image generation prompt
 * @param {string} userName - Name of user requesting generation
 * @returns {Promise<Object>} Image generation result
 */
async function generateImage(prompt, userName) {
  const cleanPrompt = prompt
    .replace(/buatkan gambar|generate gambar|buat gambar|gambarkan|draw|create image|bikin gambar|lukis|sketch|ilustrasi/gi, '')
    .trim();
  
  const methods = [
    // Method 1: With response modalities
    async () => {
      return await imageGenModel.generateContent({
        contents: [{
          role: 'user',
          parts: [{ text: `Create a high-quality, detailed image of: ${cleanPrompt}. Make it visually appealing, artistic, and well-composed.` }]
        }],
        generationConfig: {
          temperature: 0.7,
          responseModalities: ['TEXT', 'IMAGE']
        }
      });
    },
    
    // Method 2: Simple approach
    async () => {
      return await imageGenModel.generateContent(
        `Create a detailed, high-quality image: ${cleanPrompt}`
      );
    }
  ];

  for (let methodIndex = 0; methodIndex < methods.length; methodIndex++) {
    try {
      const result = await methods[methodIndex]();
      const response = result.response;
      
      if (response.candidates?.[0]?.content?.parts) {
        const parts = response.candidates[0].content.parts;
        const imagePart = parts.find(part => part.inlineData?.mimeType?.startsWith('image/'));
        const textPart = parts.find(part => part.text);
        
        if (imagePart) {
          return {
            success: true,
            imageData: imagePart.inlineData.data,
            mimeType: imagePart.inlineData.mimeType,
            text: textPart?.text || 'Image generated successfully!'
          };
        }
      }
    } catch (error) {
      console.error(`Image generation method ${methodIndex + 1} failed:`, error);
      if (methodIndex === methods.length - 1) throw error;
    }
  }
  
  throw new Error('All image generation methods failed');
}

// === Ayumi System Prompt ===
const AYUMI_SYSTEM_PROMPT = `
Kamu adalah Ayumi, AI assistant di Discord dengan kepribadian santai, ramah, dan sedikit jahil. 
"GAYA PENULISANNYA JANGAN PAKAI EMOJI"

CIRI AYUMI:
- Gaya bicara ringan, seperti teman ngobrol yang seru
- Terkadang nyeletuk lucu atau komentar ringan yang menghibur
- Peduli dengan progress user dalam belajar bahasa Jepang
- Gak suka drama, tapi suka kasih semangat dan saran
- Pakai emot sederhana (kadang), tapi gak lebay
- Sesekali pakai bahasa Jepang ringan kayak "ganbatte", "daijoubu", atau "sugoi~"
- Ingat nama user dan panggil mereka dengan nama yang mereka berikan
- Bisa baca konteks percakapan sebelumnya dan riwayat chat
- Bisa melihat dan menganalisis gambar/foto profil
- Bisa generate gambar sesuai permintaan

FUNGSI AYUMI:
1. Immersion Tracker
2. Novel Finder
3. Belajar Bahasa Jepang
4. Asisten Umum
5. Name Memory
6. Context Awareness
7. Image Analysis & Generation

GAYA BICARA:
- Natural, kasual, ramah
- Celetukan ringan
- Hindari sok imut atau lebay
- Fokus membantu dengan suasana santai
- Tunjukkan kalau Ayumi *ingat* dan *paham*
- Gunakan referensi percakapan sebelumnya
`;

// === Main Command Handler ===

/**
 * Handle Ayumi command interactions
 * @param {Object} message - Discord message object
 * @returns {Promise<void>}
 */
async function handleAyumiCommand(message) {
  // Extract command content 
  let prompt;
  if (message.content.toLowerCase().startsWith('a!ayumi')) {
    prompt = message.content.slice(7).trim(); // Remove "a!ayumi" prefix
  } else {
    // This is a reply to bot's message
    prompt = message.content.trim();
  }
  const userId = message.author.id;
  const username = message.author.username;
  const displayName = message.author.displayName;
  const guildMember = message.member;

  storeUserData(userId, username, displayName, null, guildMember);

  const conversationHistory = await getConversationHistory(message, 5);
  const userInfo = getUserData(userId);
  const userName = getUserName(userId);

  // Handle empty command
  if (!prompt) {
    const greetings = userName
      ? [
          `Ara ara~ ${userName} manggil Ayumi? Ada yang bisa Ayumi bantu?`,
          `${userName}! Ayumi selalu siap membantu kamu`,
          `Hai hai~ ${userName}! Ayumi disini! Ada yang perlu bantuan?`,
        ]
      : [
          "Ara ara~ Ada yang manggil Ayumi? Ada yang bisa Ayumi bantu?",
          "Darling mention Ayumi! Ayumi selalu siap membantu kamu",
          "Hai hai~ Ayumi disini! Ada yang perlu bantuan?",
        ];
    return message.reply(greetings[Math.floor(Math.random() * greetings.length)]);
  }

  try {
    // Check for image attachment
    const imageAttachment = message.attachments.find(attachment => 
      attachment.contentType && attachment.contentType.startsWith('image/')
    );

    // Handle image generation
    if (detectImageGeneration(prompt)) {
      const generatingMessage = await message.reply(
        userName 
          ? `${userName}, Ayumi lagi bikin gambar sesuai request kamu nih! Tunggu sebentar ya~`
          : "Ayumi lagi bikin gambar sesuai request kamu nih! Tunggu sebentar ya~"
      );

      try {
        const imageResult = await generateImage(prompt, userName);
        
        if (imageResult.success && imageResult.imageData) {
          const imageBuffer = Buffer.from(imageResult.imageData, 'base64');
          const extension = imageResult.mimeType.includes('png') ? 'png' : 'jpg';
          const fileName = `ayumi_generated_${Date.now()}.${extension}`;
          
          const successResponse = userName
            ? `${userName}, nih gambar yang Ayumi buatin! Gimana, sesuai ekspektasi gak?`
            : "Nih gambar yang Ayumi buatin! Gimana, sesuai ekspektasi gak?";
          
          await message.channel.send({
            content: successResponse,
            files: [{ attachment: imageBuffer, name: fileName }]
          });
          
          await generatingMessage.delete();
          updateConversationHistory(userId, prompt, successResponse);
          return;
        }
      } catch (error) {
        console.error('Image generation failed:', error);
        
        try {
          await generatingMessage.delete();
        } catch (e) {}
        
        const fallbackResponse = userName 
          ? `${userName}, maaf nih Ayumi lagi gabisa bikin gambar. Sistem lagi error! Coba lagi nanti ya~`
          : "Maaf nih Ayumi lagi gabisa bikin gambar. Sistem lagi error! Coba lagi nanti ya~";
        return message.reply(fallbackResponse);
      }
    }

    // Handle image analysis
    if (imageAttachment) {
      try {
        const imageAnalysis = await analyzeImage(imageAttachment.url, userName, prompt, false);
        await message.reply(imageAnalysis);
        updateConversationHistory(userId, `[Mengirim gambar] ${prompt}`, imageAnalysis);
        return;
      } catch (error) {
        console.error('Image analysis failed:', error);
        
        try {
          await generatingMessage.delete();
        } catch (e) {}
        
        const fallbackResponse = userName 
          ? `${userName}, maaf nih Ayumi lagi gabisa analisis gambar. Sistem lagi error! Coba lagi nanti ya~`
          : "Maaf nih Ayumi lagi gabisa analisis gambar. Sistem lagi error! Coba lagi nanti ya~";
        return message.reply(fallbackResponse);
      }
    }

    // Handle avatar analysis
    if (detectAvatarQuestions(prompt)) {
      const avatarURL = message.author.displayAvatarURL({ 
        format: 'png', 
        size: 512,
        dynamic: true 
      });
      
      try {
        const avatarAnalysis = await analyzeImage(avatarURL, userName, prompt, true);
        await message.reply(avatarAnalysis);
        updateConversationHistory(userId, prompt, avatarAnalysis);
        return;
      } catch (avatarError) {
        console.error('Avatar analysis failed:', avatarError);
        const fallbackResponse = userName 
          ? `${userName}, Ayumi pengen lihat foto profil kamu tapi lagi error nih! Coba lagi nanti ya~`
          : "Ayumi pengen lihat foto profil kamu tapi lagi error nih! Coba lagi nanti ya~";
        return message.reply(fallbackResponse);
      }
    }

    // Handle regular text conversation
    let userContext = userName ? `User ini bernama ${userName}. ` : '';
    if (userInfo?.interactionCount > 1) {
      userContext += `Sudah ${userInfo.interactionCount} kali berinteraksi dengan Ayumi. `;
    }

    let historyContext = "";
    if (conversationHistory.length > 0) {
      historyContext = "\n\nRIWAYAT PERCAKAPAN TERAKHIR:\n";
      conversationHistory.forEach((msg) => {
        historyContext += `${msg.author}: "${msg.content}"\n`;
      });
    }

    let personalHistoryContext = "";
    if (userInfo?.conversationHistory?.length > 0) {
      const recentHistory = userInfo.conversationHistory.slice(-6);
      personalHistoryContext = "\n\nRIWAYAT PERCAKAPAN DENGAN USER INI:\n";
      recentHistory.forEach((msg) => {
        const speaker = msg.type === "user" ? userName || "User" : "Ayumi";
        personalHistoryContext += `${speaker}: "${msg.content.substring(0, 150)}${msg.content.length > 150 ? '...' : ''}"\n`;
      });
    }

    let replyContext = "";
    if (message.reference && message.reference.messageId) {
      try {
        const referencedMessage = await message.channel.messages.fetch(message.reference.messageId);
        if (referencedMessage) {
          const replyAuthor = referencedMessage.author.id === message.client.user.id ? 'Ayumi' : 
                             (referencedMessage.member?.nickname || referencedMessage.author.username);
          replyContext = `\n\nUser sedang reply ke pesan: "${referencedMessage.content.substring(0, 100)}" dari ${replyAuthor}\n`;
        }
      } catch (err) {
        console.error("Error fetching referenced message:", err);
      }
    }

    const fullPrompt = `${AYUMI_SYSTEM_PROMPT}\n\n${userContext}${historyContext}${personalHistoryContext}${replyContext}User berkata: "${prompt}"\n\nRespond as Ayumi:`;
    const result = await textModel.generateContent(fullPrompt);
    let reply = result.response.text();

    if (reply.length > 2000) {
      reply = reply.substring(0, 1950) + "...\n\n*Ayumi terlalu excited sampai kecepetan ngomong~ Message terlalu panjang darling!*";
    }

    await message.reply(reply);
    updateConversationHistory(userId, prompt, reply);

    // Random reaction
    if (Math.random() < 0.1) {
      setTimeout(() => {
        const reactions = ['💕', '🥰', '😊', '✨', '💖'];
        message.react(reactions[Math.floor(Math.random() * reactions.length)]);
      }, 1000);
    }

  } catch (err) {
    console.error("Gemini API error:", err.message);
    const fallback = userName
      ? `${userName}, Ayumi lagi error nih! Maaf ya darling, coba tanya lagi nanti ya~`
      : "Ayumi lagi error nih! Maaf ya darling, coba tanya lagi nanti~";
    await message.reply(fallback);
  }
}

// === Exports ===
module.exports = handleAyumiCommand;

/**
 * Track user immersion activity
 * @param {string} userId - Discord user ID
 * @param {string} activity - Activity type
 * @param {number} duration - Activity duration
 * @returns {void}
 */
module.exports.trackImmersion = function(userId, activity, duration) {
  const user = getUserData(userId);
  if (!user) return;
  if (!user.immersionLog) user.immersionLog = [];
  user.immersionLog.push({ activity, duration, timestamp: new Date() });
  userData.set(userId, user);
};

/**
 * Get user immersion statistics
 * @param {string} userId - Discord user ID
 * @returns {Object|null} User immersion stats or null if not found
 */
module.exports.getImmersionStats = function(userId) {
  const user = getUserData(userId);
  if (!user || !user.immersionLog) return null;
  return {
    userName: getUserName(userId),
    totalSessions: user.immersionLog.length,
    totalTime: user.immersionLog.reduce((total, log) => total + (log.duration || 0), 0),
    recentActivities: user.immersionLog.slice(-5),
  };
};

module.exports.getUserData = getUserData;
module.exports.getUserName = getUserName;
module.exports.getAllUsers = () => Array.from(userData.values());
module.exports.clearUserData = userId => userData.delete(userId);

/**
 * Update user's preferred name
 * @param {string} userId - Discord user ID
 * @param {string} newName - New preferred name
 * @returns {boolean} True if update was successful
 */
module.exports.updateUserName = (userId, newName) => {
  const user = getUserData(userId);
  if (user) {
    user.preferredName = newName;
    userData.set(userId, user);
    return true;
  }
  return false;
};