package main

import (
	"fmt"
	"log"
	"strings"

	"github.com/bwmarrin/discordgo"
)

func SendQuizSelector(s *discordgo.Session, channelID string) {
	var menuOptions []discordgo.SelectMenuOption
	for _, quiz := range Quizzes {
		menuOptions = append(menuOptions, discordgo.SelectMenuOption{
			Label:       quiz.Label,
			Description: quiz.Description,
			Value:       quiz.Value,
		})
	}

	msg := &discordgo.MessageSend{
		Content: "Pilih quiz level mu:",
		Components: []discordgo.MessageComponent{
			discordgo.ActionsRow{
				Components: []discordgo.MessageComponent{
					discordgo.SelectMenu{
						CustomID:    "quiz_select",
						Placeholder: "Pilih level...",
						Options:     menuOptions,
					},
				},
			},
		},
	}

	_, err := s.ChannelMessageSendComplex(channelID, msg)
	if err != nil {
		log.Printf("Failed to send selector: %v", err)
	}
}

func OnReady(s *discordgo.Session, r *discordgo.Ready) {
	fmt.Printf("Logged in as %s\n", s.State.User.Username)
	channelID := "1372825233295147073"
	SendQuizSelector(s, channelID)
}

func OnInteraction(s *discordgo.Session, i *discordgo.InteractionCreate) {
	if i.Type != discordgo.InteractionMessageComponent {
		return
	}

	if i.MessageComponentData().CustomID == "quiz_select" {
		user := i.Member.User
		quizID := i.MessageComponentData().Values[0]
		quiz, ok := Quizzes[quizID]
		if !ok {
			return
		}

		threadName := fmt.Sprintf("%s - Quiz", user.Username)
		thread, err := s.MessageThreadStartComplex(i.ChannelID, i.Message.ID, &discordgo.ThreadStart{
			Name: threadName,
			Type: discordgo.ChannelTypeGuildPrivateThread,
		})
		if err != nil {
			log.Printf("Failed to chreate thread: %v", err)
			return
		}

		err = s.ThreadMemberAdd(thread.ID, user.ID)
		if err != nil {
			log.Printf("Failed to add user to thread: %v", err)
		}

		s.ChannelMessageSend(thread.ID, fmt.Sprintf("Halo <@%s>! untuk memulai quiz, jalankan command ini: \n```%s```", user.ID, quiz.Command))

	}
}

func OnMessageCreate(s *discordgo.Session, m *discordgo.MessageCreate) {
	if m.Author.ID != kotobaBotID || len(m.Embeds) == 0 {
		return
	}

	for _, embed := range m.Embeds {
		if strings.Contains(embed.Description, "Congratulations!") {
			for userID, quizID := range activeQuizzes {
				quiz := Quizzes[quizID]

				err := s.GuildMemberRoleAdd(m.GuildID, userID, quiz.RoleID)
				if err != nil {
					log.Printf("Failed to give role: %v", err)
					return
				}

				s.ChannelMessageSend(m.ChannelID, fmt.Sprintf("🎉 Selamat <@%s>, kamu telah menyelesaikan quiz dan naik mendapatkan role **%s**!", userID, quiz.Label))

				delete(activeQuizzes, userID)
				break
			}
		}
	}
}
