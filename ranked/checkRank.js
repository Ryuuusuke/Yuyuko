const activeQuizzes = new Map(); // Menyimpan userId yang sedang ikut quiz

const kotobaBotId = "251239170058616833";
const level1RoleId = "1372825348189978665";

/**
 * Menyimpan user yang mulai quiz
 */
function trackUserQuizStart(message) {
    if (message.content === "k!quiz testlevel1 hardcore mmq=3") {
        console.log(`[Quiz] ${message.author.tag} memulai quiz`);
        activeQuizzes.set(message.author.id, Date.now()); // bisa pakai Date.now() untuk tracking waktu
    }
}

/**
 * Cek apakah pesan embed dari Kotoba Bot berisi skor & tambahkan role
 */
async function checkRank(message) {
    if (!message.embeds.length) {
        console.log("bukan kotoba bot");
    } else {
        console.log("kotoba bot nih");
    }

    for (const embed of message.embeds) {
        console.log(embed.description);
        if (
            embed.description &&
            embed.description.includes("Congratulations!")
        ) {
            // Ambil userId dari Map
            const [userId] = activeQuizzes.keys();
            if (!userId) {
                console.log(
                    "[Quiz] Tidak ada user yang sedang mengikuti quiz.",
                );
                return;
            }

            try {
                const member = await message.guild.members.fetch(userId);
                await member.roles.add(level1RoleId);
                console.log(
                    `[Quiz] Role Level 1 diberikan ke ${member.user.tag}`,
                );
                activeQuizzes.delete(userId);
            } catch (err) {
                console.error("[Quiz] Gagal memberikan role:", err);
            }

            break; // keluar dari loop jika sudah cocok
        }
    }
}

module.exports = {
    trackUserQuizStart,
    checkRank,
};
