const activeQuizzes = new Map(); // Menyimpan userId yang sedang ikut quiz

const kotobaBotId = "251239170058616833";
const level1RoleId = "1372825348189978665";

function trackUserQuizStart(message) {
    if (message.content === "k!quiz testlevel1 hardcore mmq=3") {
        activeQuizzes.set(message.author.id, Date.now());
    }
}

async function checkRank(message) {
    for (const embed of message.embeds) {
        console.log(embed.description);
        if (
            embed.description &&
            embed.description.includes("Congratulations!")
        ) {
            // Ambil userId dari Map
            const [userId] = activeQuizzes.keys();
            if (!userId) return;

            try {
                const member = await message.guild.members.fetch(userId);
                await member.roles.add(level1RoleId);

                message.channel.send({
                    content: `<@${member.id}> Congratulations for you just finished Level 1 ranked quiz!`,
                });
                activeQuizzes.delete(userId);
            } catch (err) {
                console.error("[Quiz] Gagal memberikan role:", err);
            }
            break;
        }
    }
}

module.exports = {
    trackUserQuizStart,
    checkRank,
};
