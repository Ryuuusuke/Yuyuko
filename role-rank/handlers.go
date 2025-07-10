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

	if _, exists := activeQuizzes[user.ID]; exists {
		RespondWithError(s, i, "Kamu sudah memiliki quiz aktif. Selesaikan dulu yang sebelumnya ya!")
		return
	}

	channelName := fmt.Sprintf("quiz-%s-%s", strings.ToLower(user.Username), strings.ToLower(strings.ReplaceAll(quiz.Label, " ", "-")))

	// Buat channel private
	channel, err := s.GuildChannelCreateComplex(guildID, discordgo.GuildChannelCreateData{
		Name:     channelName,
		Type:     discordgo.ChannelTypeGuildText,
		ParentID: quizCategoryID,
		PermissionOverwrites: []*discordgo.PermissionOverwrite{
			{
				ID:    guildID, // semua user
				Type:  discordgo.PermissionOverwriteTypeRole,
				Deny:  discordgo.PermissionViewChannel,
			},
			{
				ID:    user.ID, // user ini
				Type:  discordgo.PermissionOverwriteTypeMember,
				Allow: discordgo.PermissionViewChannel | discordgo.PermissionSendMessages,
			},
			{
				ID:    kotobaBotID,
				Type:  discordgo.PermissionOverwriteTypeMember,
				Allow: discordgo.PermissionViewChannel | discordgo.PermissionSendMessages | discordgo.PermissionReadMessageHistory,
			},
			{
				ID:    s.State.User.ID, // ID bot
				Type:  discordgo.PermissionOverwriteTypeMember,
				Allow: discordgo.PermissionViewChannel | discordgo.PermissionSendMessages | discordgo.PermissionReadMessageHistory,
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
commandsText := strings.Join(quiz.Commands, "\n")

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

	// Respon ke user (ephemeral)
	err = s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Content: fmt.Sprintf("Channel private **%s** telah dibuat untuk quiz **%s**. Silakan lanjut di sana!", channel.Name, quiz.Label),
			Flags:   discordgo.MessageFlagsEphemeral,
		},
	})
	if err != nil {
		log.Printf("Gagal merespon interaction: %v", err)
	}
}

func OnMessageCreate(s *discordgo.Session, m *discordgo.MessageCreate) {
	// Abaikan pesan bot (selain kotoba)
	if m.Author.Bot && m.Author.ID != kotobaBotID {
		return
	}

	// Command manual delete
	if strings.HasPrefix(m.Content, "a!del") {
		// Opsional: batasi hanya user pemilik quiz
		session, exists := activeQuizzes[m.Author.ID]
		if exists && m.ChannelID == session.ThreadID {
			go func() {
				s.ChannelMessageSend(m.ChannelID, "Channel akan dihapus...")
				time.Sleep(2 * time.Second)
				_, err := s.ChannelDelete(m.ChannelID)
				if err != nil {
					log.Printf("Gagal menghapus channel via a!del: %v", err)
				}
			}()
			return
		}

		s.ChannelMessageSend(m.ChannelID, "Kamu tidak memiliki quiz aktif di sini.")
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

	session.Progress++
	session.Started = false

	if session.Progress < len(quiz.Commands) {
		// Masih ada quiz berikutnya
		activeQuizzes[completedUserID] = session
		nextCommand := quiz.Commands[session.Progress]

		msg := "Sesi pertama selesai! Sekarang lanjut ke quiz berikutnya:\n```" + nextCommand + "```"
		s.ChannelMessageSend(session.ThreadID, msg)
		return
	}

	// Semua quiz selesai, beri role
	err := s.GuildMemberRoleAdd(m.GuildID, completedUserID, quiz.RoleID)
	if err != nil {
		log.Printf("Gagal memberikan role: %v", err)
		s.ChannelMessageSend(session.ThreadID, "Gagal memberikan role. Mohon hubungi admin.")
		return
	}

	// Kirim pesan sukses
	successMsg := "Semua sesi quiz berhasil diselesaikan! Role **" + quiz.Label + "** berhasil diberikan.\nChannel ini akan ditutup dalam 30 detik."
	s.ChannelMessageSend(session.ThreadID, successMsg)

	// Hapus dari active
	delete(activeQuizzes, completedUserID)

	// Hapus channel
	go func() {
		time.Sleep(30 * time.Second)
		_, err := s.ChannelDelete(session.ThreadID)
		if err != nil {
			log.Printf("Gagal hapus channel: %v", err)
		}
	}()
}


func RespondWithError(s *discordgo.Session, i *discordgo.InteractionCreate, message string) {
	err := s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Content: "❌ " + message,
			Flags:   discordgo.MessageFlagsEphemeral,
		},
	})
	if err != nil {
		log.Printf("Failed to respond with error: %v", err)
	}
}