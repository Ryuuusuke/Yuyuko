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
}

var quizCategoryID = "1392514838118531132" // ganti dengan ID kategori quiz kamu
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
	// Check if message starts with k!quiz
	if !strings.HasPrefix(m.Content, "k!quiz") {
		return
	}

	// Find user's active quiz session
	session, exists := activeQuizzes[m.Author.ID]
	if !exists {
		return
	}

	// Check if command is sent in the correct thread
	if m.ChannelID != session.ThreadID {
		return
	}

	// Mark quiz as started
	session.Started = true
	activeQuizzes[m.Author.ID] = session

	quiz, ok := Quizzes[session.QuizID]
	if !ok {
		return
	}

	command := quiz.Commands[session.Progress]

	msg := "Quiz dimulai! Tunggu Kotoba Bot untuk memberikan pertanyaan..."
	msg += "\n\nCommand saat ini:\n```" + command + "```"

	s.ChannelMessageSend(m.ChannelID, msg)

	// Send confirmation message
	_, err := s.ChannelMessageSend(m.ChannelID, "Quiz dimulai! Tunggu Kotoba Bot untuk memberikan pertanyaan...")
	if err != nil {
		log.Printf("Failed to send confirmation: %v", err)
	}
}

func HandleKotobaBotMessage(s *discordgo.Session, m *discordgo.MessageCreate) {
	// Check if message has embeds
	if len(m.Embeds) == 0 {
		return
	}

	// Look for congratulations message
	for _, embed := range m.Embeds {
		if embed.Description != "" && strings.Contains(embed.Description, "Congratulations!") {
			HandleMultiStageQuizCompletion(s, m)
			return
		}
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