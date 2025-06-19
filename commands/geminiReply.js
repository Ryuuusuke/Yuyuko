const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GEMINI_API_KEY } = require("../environment");

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-04-17" });

// In-memory user data
const userData = new Map();

// === Utility Functions ===

function getUserData(userId) {
  return userData.get(userId);
}

function updateConversationHistory(userId, userMessage, botReply) {
  const data = getUserData(userId);
  if (!data) return;
  const history = data.conversationHistory || [];
  history.push({ type: 'user', content: userMessage });
  history.push({ type: 'bot', content: botReply });
  userData.set(userId, { ...data, conversationHistory: history });
}

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
  } catch (err) {
    console.error("Error fetching conversation history:", err.message);
    return [];
  }
}

function getUserName(userId) {
  const user = getUserData(userId);
  return user?.guildNickname || user?.bestName || user?.displayName || user?.username || null;
}

// === Main Mention Handler ===
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
- Ingat nama user dan panggil mereka dengan nama yang mereka berikan (nickname server > display name > username)
- PENTING: Bisa baca konteks percakapan sebelumnya dan riwayat chat untuk respons yang lebih akurat

FUNGSI AYUMI:
1. Immersion Tracker
2. Novel Finder
3. Belajar Bahasa Jepang
4. Asisten Umum
5. Name Memory
6. Context Awareness
7. Conversation Continuity

KEMAMPUAN MEMBACA KONTEKS:
- Baca riwayat percakapan terakhir di channel
- Ingat percakapan pribadi user
- Pahami referensi topik lama
- Respons sesuai flow percakapan

SITUASI KHUSUS - KETIKA USER REPLY PESAN AYUMI:
- Jika sebelumnya kasih soal → cek jawaban
- Jika sebelumnya kasih saran → lanjut diskusi
- Jika reply pertanyaan → jawab sesuai topik
- Acknowledge konteks selalu

GAYA BICARA:
- Natural, kasual, ramah
- Celetukan ringan
- Hindari sok imut atau lebay
- Fokus membantu dengan suasana santai
- Tunjukkan kalau Ayumi *ingat* dan *paham*
- Gunakan referensi percakapan sebelumnya

CONTOH RESPON KONTEKSTUAL:
- "Oh iya [nama], kayak yang kita bahas kemarin..."
- "Wah, [nama] jawab A ya? Sayangnya kurang tepat nih..."
- "Nah [nama], soal [topik] yang tadi gimana progress-nya?"
- "Kayak yang kamu bilang waktu itu, memang [topik] itu..."
`;

async function handleMention(message) {
  const prompt = message.content.replace(/<@!?(\d+)>/, "").trim();
  const userId = message.author.id;
  const username = message.author.username;
  const displayName = message.author.displayName;
  const guildMember = message.member;

  storeUserData(userId, username, displayName, null, guildMember);

  const conversationHistory = await getConversationHistory(message, 5);

  let replyContext = "";
  const userInfo = getUserData(userId);
  const userName = getUserName(userId);

  if (message.reference?.messageId) {
    try {
      const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);
      if (repliedMessage.author.id === message.client.user.id) {
        replyContext = `\n\nKONTEKS REPLY: User sedang merespon pesan Ayumi sebelumnya: "${repliedMessage.content.substring(0, 500)}${repliedMessage.content.length > 500 ? '...' : ''}"\n`;
        if (userInfo) {
          userInfo.lastBotMessage = repliedMessage.content;
          userInfo.lastBotMessageTime = repliedMessage.createdAt;
        }
      }
    } catch (err) {
      console.log("Failed to fetch reply context:", err.message);
    }
  }

  if (!prompt) {
    const greetings = userName
      ? [
          `Ara ara~ ${userName} manggil Ayumi? Ada yang bisa Ayumi bantu?`,
          `${userName}! Ayumi selalu siap membantu kamu`,
          `Hai hai~ ${userName}! Ayumi disini! Ada yang perlu bantuan? Ayumi akan selalu ada untuk kamu`,
        ]
      : [
          "Ara ara~ Ada yang manggil Ayumi? Ada yang bisa Ayumi bantu?",
          "Darling mention Ayumi! Ayumi selalu siap membantu kamu",
          "Hai hai~ Ayumi disini! Ada yang perlu bantuan? Ayumi akan selalu ada untuk kamu",
        ];
    return message.reply(greetings[Math.floor(Math.random() * greetings.length)]);
  }

  try {
    let userContext = userName ? `User ini bernama ${userName}. ` : '';
    if (userInfo?.interactionCount > 1) userContext += `Sudah ${userInfo.interactionCount} kali berinteraksi dengan Ayumi. `;

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

    if (userInfo?.lastBotMessage && replyContext) {
      userContext += `User sedang merespon pesan Ayumi sebelumnya tentang: "${userInfo.lastBotMessage.substring(0, 200)}${userInfo.lastBotMessage.length > 200 ? '...' : ''}". `;
    }

    const fullPrompt = `${AYUMI_SYSTEM_PROMPT}\n\n${userContext}${historyContext}${personalHistoryContext}${replyContext}User berkata: "${prompt}"\n\nRespond as Ayumi:`;
    const result = await model.generateContent(fullPrompt);
    let reply = result.response.text();

    if (reply.length > 2000) {
      reply = reply.substring(0, 1950) + "...\n\n*Ayumi terlalu excited sampai kecepetan ngomong~ Message terlalu panjang darling!* (>_<)";
    }

    await message.reply(reply);
    updateConversationHistory(userId, prompt, reply);

    if (Math.random() < 0.1) {
      setTimeout(() => {
        const reactions = ['💕', '🥰', '😊', '✨', '💖'];
        message.react(reactions[Math.floor(Math.random() * reactions.length)]);
      }, 1000);
    }

  } catch (err) {
    console.error("Gemini API error:", err.message);
    const fallback = userName
      ? [`${userName}, Ayumi lagi error nih! (>_<) Maaf ya darling, coba tanya lagi nanti ya~`, `Eh? ${userName}, sistem Ayumi lagi ngambek... coba lagi sebentar ya!`]
      : ["Ayumi lagi error nih! (>_<) Maaf ya darling, coba tanya lagi nanti~"];
    await message.reply(fallback[Math.floor(Math.random() * fallback.length)]);
  }
}

// === Exports ===

module.exports = handleMention;

module.exports.trackImmersion = function(userId, activity, duration) {
  const user = getUserData(userId);
  if (!user) return;
  if (!user.immersionLog) user.immersionLog = [];
  user.immersionLog.push({ activity, duration, timestamp: new Date() });
  userData.set(userId, user);
};

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
module.exports.updateUserName = (userId, newName) => {
  const user = getUserData(userId);
  if (user) {
    user.preferredName = newName;
    userData.set(userId, user);
    return true;
  }
  return false;
};
