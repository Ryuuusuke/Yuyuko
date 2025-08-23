package main

import (
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/bwmarrin/discordgo"
)

func OnReady(s *discordgo.Session, r *discordgo.Ready) {
	fmt.Printf("Bot logged in as %s\n", s.State.User.Username)

	// Set bot status
	err := s.UpdateGameStatus(0, "Japanese Quiz Master 🎌")
	if err != nil {
		log.Printf("Failed to set status: %v", err)
	}

	// Send initial quiz selector to designated channel
	channelID := "1392463011301691442" // Replace with your channel ID
	SendQuizSelector(s, channelID)

	// Start background sweeper to remove inactive quiz channels (1 day)
	StartInactiveChannelSweeper(s)
}

var quizCategoryID = "1392514838118531132" // ganti dengan ID kategori quiz kamu
var quizChannelTTL = 24 * time.Hour        // durasi tidak aktif sebelum channel quiz dihapus
func OnInteraction(s *discordgo.Session, i *discordgo.InteractionCreate) {
	if i.Type != discordgo.InteractionMessageComponent {
		return
	}

	if i.MessageComponentData().CustomID != "quiz_select" {
		return
	}

	user := i.Member.User
	guildID := i.GuildID
	quizID := i.MessageComponentData().Values[0]
	quiz, ok := Quizzes[quizID]
	if !ok {
		RespondWithError(s, i, "Quiz tidak ditemukan!")
		return
	}

	// 💥 CEK apakah session nyangkut tapi channel-nya sudah tidak ada
	if session, exists := activeQuizzes[user.ID]; exists {
		_, err := s.Channel(session.ThreadID)
		if err != nil {
			// channel sudah dihapus → bersihkan sesi
			log.Printf("Channel quiz milik user %s sudah tidak ada. Membersihkan sesi.", user.ID)
			delete(activeQuizzes, user.ID)
		} else {
			RespondWithError(s, i, "Kamu sudah memiliki quiz aktif. Selesaikan dulu yang sebelumnya ya!")
			return
		}
	}

	channelName := fmt.Sprintf("quiz-%s-%s", strings.ToLower(user.Username), strings.ToLower(strings.ReplaceAll(quiz.Label, " ", "-")))

	// Buat channel private
	channel, err := s.GuildChannelCreateComplex(guildID, discordgo.GuildChannelCreateData{
		Name:     channelName,
		Type:     discordgo.ChannelTypeGuildText,
		ParentID: quizCategoryID,
		PermissionOverwrites: []*discordgo.PermissionOverwrite{
			{
				ID:   guildID, // semua user
				Type: discordgo.PermissionOverwriteTypeRole,
				Deny: discordgo.PermissionViewChannel,
			},
			{
				ID:   user.ID, // user ini
				Type: discordgo.PermissionOverwriteTypeMember,
				Allow: discordgo.PermissionViewChannel |
					discordgo.PermissionSendMessages,
			},
			{
				ID:   kotobaBotID,
				Type: discordgo.PermissionOverwriteTypeMember,
				Allow: discordgo.PermissionViewChannel |
					discordgo.PermissionSendMessages |
					discordgo.PermissionReadMessageHistory,
			},
			{
				ID:   s.State.User.ID,
				Type: discordgo.PermissionOverwriteTypeMember,
				Allow: discordgo.PermissionViewChannel |
					discordgo.PermissionSendMessages |
					discordgo.PermissionReadMessageHistory,
			},
		},
	})
	if err != nil {
		log.Printf("Gagal membuat channel private: %v", err)
		RespondWithError(s, i, "Gagal membuat channel private!")
		return
	}

	// Simpan sesi quiz
	activeQuizzes[user.ID] = QuizSession{
		UserID:    user.ID,
		QuizID:    quizID,
		ThreadID:  channel.ID,
		ChannelID: i.ChannelID,
		Started:   false,
	}

	// Kirim pesan pembuka
	commandsText := quiz.Commands[0]
	welcomeMsg := fmt.Sprintf(`Halo <@%s>! Untuk memulai quiz, copy dan paste command berikut:

**Command:**
`+"```"+
		`%s`+"```"+`

**Cara bermain:**
1. Copy command di atas
2. Paste di channel ini
3. Jawab pertanyaan dari Kotoba Bot
4. Kamu akan mendapat role **%s** setelah menyelesaikan quiz!
5. Kamu bisa hapus channel ini secara manual dengan a!del

Jangan lupa paste command langsung di channel ini ya!`,
		user.ID, commandsText, quiz.Label)

	_, err = s.ChannelMessageSend(channel.ID, welcomeMsg)
	if err != nil {
		log.Printf("Gagal kirim pesan pembuka: %v", err)
	}

	// Respon interaction dengan followup ephemeral (bisa dihapus)
	err = s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseDeferredChannelMessageWithSource,
	})
	if err != nil {
		log.Printf("Gagal merespons interaction: %v", err)
	}

	msg, err := s.FollowupMessageCreate(i.Interaction, true, &discordgo.WebhookParams{
		Content: fmt.Sprintf("Channel private **%s** telah dibuat untuk quiz **%s**. Silakan lanjut di sana!", channel.Name, quiz.Label),
	})
	if err != nil {
		log.Printf("Gagal kirim followup: %v", err)
		return
	}

	// Hapus pesan setelah 10 detik
	go func() {
		time.Sleep(10 * time.Second)
		err := s.FollowupMessageDelete(i.Interaction, msg.ID)
		if err != nil {
			log.Printf("Gagal hapus pesan followup: %v", err)
		}
	}()
}

func OnMessageCreate(s *discordgo.Session, m *discordgo.MessageCreate) {
	// Abaikan pesan bot (selain kotoba)
	if m.Author.Bot && m.Author.ID != kotobaBotID {
		return
	}

	if strings.HasPrefix(m.Content, "a!clear") {
		HandleClearCommand(s, m)
		return
	}

	if strings.HasPrefix(m.Content, "a!del") {
		channel, err := s.State.Channel(m.ChannelID)
		if err != nil {
			channel, err = s.Channel(m.ChannelID)
			if err != nil {
				log.Printf("Gagal mengambil channel: %v", err)
				return
			}
		}

		// Pastikan channel ini berada di kategori quiz
		if channel.ParentID == quizCategoryID {
			// Cegah penghapusan channel utama
			if channel.ID == "1392463011301691442" {
				s.ChannelMessageSend(m.ChannelID, "Channel ini adalah pusat selector quiz. Tidak bisa dihapus.")
				return
			}

			// Kirim konfirmasi dan hapus
			s.ChannelMessageSend(m.ChannelID, "Channel ini akan dihapus...")
			time.Sleep(1 * time.Second)
			_, err := s.ChannelDelete(m.ChannelID)
			if err != nil {
				log.Printf("Gagal hapus channel a!del: %v", err)
			}
			return
		}

		s.ChannelMessageSend(m.ChannelID, "Channel ini bukan bagian dari kategori quiz.")
		return
	}

	// Command quiz user biasa
	if !m.Author.Bot {
		HandleUserCommand(s, m)
		return
	}

	// Pesan dari Kotoba Bot
	if m.Author.ID == kotobaBotID {
		HandleKotobaBotMessage(s, m)
	}
}

func HandleUserCommand(s *discordgo.Session, m *discordgo.MessageCreate) {
	if !strings.HasPrefix(m.Content, "k!quiz") {
		return
	}

	session, exists := activeQuizzes[m.Author.ID]
	if !exists || m.ChannelID != session.ThreadID {
		return
	}

	// Tandai quiz dimulai
	session.Started = true
	activeQuizzes[m.Author.ID] = session

	// Kirim pesan konfirmasi sederhana
	_, err := s.ChannelMessageSend(m.ChannelID, "Quiz dimulai! Tunggu Kotoba Bot untuk memberikan pertanyaan...")
	if err != nil {
		log.Printf("Failed to send quiz start message: %v", err)
	}
}

func HandleKotobaBotMessage(s *discordgo.Session, m *discordgo.MessageCreate) {
	if len(m.Embeds) == 0 {
		return
	}

	for _, embed := range m.Embeds {
		if embed.Description == "" || !strings.Contains(embed.Description, "Congratulations!") {
			continue
		}

		// Temukan user dari session aktif
		var userID string
		var session QuizSession
		for uid, sData := range activeQuizzes {
			if sData.ThreadID == m.ChannelID && sData.Started {
				userID = uid
				session = sData
				break
			}
		}
		if userID == "" {
			return
		}

		// Ambil quiz info dan data validasi
		quiz, ok := Quizzes[session.QuizID]
		if !ok || session.Progress >= len(quiz.Commands) {
			return
		}

		expectedDeck := strings.ToLower(quiz.DeckNames[session.Progress])
		expectedScore := strings.ToLower(quiz.ScoreLimits[session.Progress])

		// Ambil deck name dari title embed (contoh: "jpdb300 Ended")
		titleDeck := strings.ToLower(strings.TrimSuffix(embed.Title, " Ended"))

		// Ambil score limit dari embed fields
		scoreLine := ""

		// Coba cari di embed.Fields
		if embed.Fields != nil {
			for _, f := range embed.Fields {
				if strings.Contains(strings.ToLower(f.Name), "score limit") {
					scoreLine = strings.ToLower(f.Value)
					break
				}
			}
		}

		// Jika masih kosong, cari di embed.Description
		if scoreLine == "" && strings.Contains(strings.ToLower(embed.Description), "score limit of") {
			// Contoh: "The score limit of 10 was reached by @Ardya. Congratulations!"
			desc := strings.ToLower(embed.Description)
			idx := strings.Index(desc, "score limit of ")
			if idx != -1 {
				rest := desc[idx+len("score limit of "):]
				// ambil angka sampai spasi berikutnya
				scoreParts := strings.Fields(rest)
				if len(scoreParts) > 0 {
					scoreLine = scoreParts[0]
				}
			}
		}

		// Ekstrak angka dari "scoreLine"
		scoreParts := strings.Fields(scoreLine)
		if len(scoreParts) == 0 {
			s.ChannelMessageSend(session.ThreadID, "Command tidak sesuai sesi ini tidak dianggap. Silakan ulang dengan command yang sesuai.")
			return
		}
		actualScore := scoreParts[0]

		if titleDeck != expectedDeck || actualScore != expectedScore {
			s.ChannelMessageSend(session.ThreadID,
				"Command tidak sesuai.",
			)
			return
		}

		// ✅ Semua valid → lanjut
		HandleMultiStageQuizCompletion(s, m)
	}
}

func GetCurrentQuizRoleLevel(member *discordgo.Member) (int, string) {
	for _, roleID := range member.Roles {
		for _, quiz := range Quizzes {
			if roleID == quiz.RoleID {
				return quiz.Level, roleID
			}
		}
	}
	return -1, ""
}

func HandleMultiStageQuizCompletion(s *discordgo.Session, m *discordgo.MessageCreate) {
	var completedUserID string
	var session QuizSession

	for userID, sData := range activeQuizzes {
		if sData.ThreadID == m.ChannelID && sData.Started {
			completedUserID = userID
			session = sData
			break
		}
	}
	if completedUserID == "" {
		return
	}

	quiz, ok := Quizzes[session.QuizID]
	if !ok {
		return
	}

	// Tandai sesi saat ini selesai
	session.Started = false

	// === Masih ada command tahap selanjutnya?
	if session.Progress+1 < len(quiz.Commands) {
		session.Progress++
		activeQuizzes[completedUserID] = session

		nextCmd := quiz.Commands[session.Progress]
		s.ChannelMessageSend(session.ThreadID,
			"Sesi sebelumnya selesai! Sekarang lanjut ke quiz berikutnya:\n```"+nextCmd+"```")
		return
	}

	// === Semua tahap selesai ===

	// Dapatkan member info
	member, err := s.GuildMember(m.GuildID, completedUserID)
	if err != nil {
		log.Printf("Gagal mendapatkan member: %v", err)
		return
	}

	currentLevel, currentRoleID := GetCurrentQuizRoleLevel(member)

	// CASE 1: Sudah punya role yang sama
	if currentLevel == quiz.Level {
		s.ChannelMessageSend(m.ChannelID,
			fmt.Sprintf("Kamu sudah memiliki role **%s**. Tidak ada perubahan.\nChannel ini akan dihapus dalam 30 detik.", quiz.Label))
		cleanupQuizChannel(s, completedUserID)
		return
	}

	// CASE 2: Downgrade tidak diizinkan
	if currentLevel > quiz.Level {
		s.ChannelMessageSend(m.ChannelID,
			"Kamu sudah memiliki role dengan level lebih tinggi. Downgrade tidak diizinkan.\nChannel ini akan dihapus dalam 30 detik.")
		cleanupQuizChannel(s, completedUserID)
		return
	}

	// CASE 3: Upgrade role
	if currentLevel >= 0 && currentRoleID != "" {
		err := s.GuildMemberRoleRemove(m.GuildID, completedUserID, currentRoleID)
		if err != nil {
			log.Printf("Gagal menghapus role lama: %v", err)
		}
	}

	err = s.GuildMemberRoleAdd(m.GuildID, completedUserID, quiz.RoleID)
	if err != nil {
		log.Printf("Gagal memberikan role baru: %v", err)
		s.ChannelMessageSend(m.ChannelID, "Gagal memberikan role baru. Mohon hubungi admin.")
		return
	}

	// Sukses
	s.ChannelMessageSend(m.ChannelID,
		fmt.Sprintf("**SELAMAT** <@%s>! Kamu sekarang menjadi **%s**.\nChannel ini akan dihapus dalam 30 detik.", completedUserID, quiz.Label))

	// Bersihkan channel dan sesi
	cleanupQuizChannel(s, completedUserID)
}

// helper untuk bersihkan session, delete channel setelah delay
func cleanupQuizChannel(s *discordgo.Session, userID string) {
	session, exists := activeQuizzes[userID]
	if !exists {
		return
	}
	delete(activeQuizzes, userID)

	go func(chID string) {
		time.Sleep(30 * time.Second)
		if _, err := s.ChannelDelete(chID); err != nil {
			log.Printf("Gagal menghapus channel: %v", err)
		}
	}(session.ThreadID)
}

// Background sweeper: delete inactive quiz channels (no activity for 24h)
func StartInactiveChannelSweeper(s *discordgo.Session) {
	// Run once at start
	go sweepInactiveQuizChannels(s)

	// Run hourly
	go func() {
		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()
		for range ticker.C {
			sweepInactiveQuizChannels(s)
		}
	}()
}

func sweepInactiveQuizChannels(s *discordgo.Session) {
	threshold := time.Now().Add(-quizChannelTTL)

	for _, g := range s.State.Guilds {
		channels, err := s.GuildChannels(g.ID)
		if err != nil {
			log.Printf("Gagal mengambil channel guild %s: %v", g.ID, err)
			continue
		}

		for _, ch := range channels {
			if ch == nil || ch.Type != discordgo.ChannelTypeGuildText {
				continue
			}
			if ch.ParentID != quizCategoryID {
				continue
			}
			// Skip selector channel
			if ch.ID == "1392463011301691442" {
				continue
			}

			msgs, err := s.ChannelMessages(ch.ID, 1, "", "", "")
			if err != nil {
				log.Printf("Gagal membaca pesan terakhir di channel %s: %v", ch.ID, err)
				continue
			}

			// Determine last activity time
			var lastActivity time.Time
			if len(msgs) > 0 {
				lastActivity = msgs[0].Timestamp
			} else {
				// No messages; skip deletion to be safe
				continue
			}

			if lastActivity.Before(threshold) {
				// Remove any tracked session bound to this channel
				for uid, sess := range activeQuizzes {
					if sess.ThreadID == ch.ID {
						delete(activeQuizzes, uid)
						break
					}
				}

				if _, err := s.ChannelDelete(ch.ID); err != nil {
					log.Printf("Gagal menghapus channel tidak aktif %s: %v", ch.ID, err)
				} else {
					log.Printf("Channel tidak aktif %s dihapus (last activity: %s)", ch.ID, lastActivity.Format(time.RFC3339))
				}
			}
		}
	}
}

func RespondWithError(s *discordgo.Session, i *discordgo.InteractionCreate, message string) {
	err := s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Content: "" + message,
			Flags:   discordgo.MessageFlagsEphemeral,
		},
	})
	if err != nil {
		log.Printf("Failed to respond with error: %v", err)
	}
}
