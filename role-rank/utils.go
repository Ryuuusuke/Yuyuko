package main

import (
	"log"
	"time"

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

	embed := &discordgo.MessageEmbed{
		Title:       "Japanese Quiz Selector",
		Description: `Pilih level quiz yang ingin kamu ambil dari dropdown menu di bawah ini. Setiap quiz akan memberikan role sesuai level.`,
		Color:       0xf173ff,
		Footer: &discordgo.MessageEmbedFooter{
			Text: "Powered by Kotoba Bot",
		},
		Timestamp: time.Now().Format(time.RFC3339),
	}

	msg := &discordgo.MessageSend{
		Embeds: []*discordgo.MessageEmbed{embed},
		Components: []discordgo.MessageComponent{
			discordgo.ActionsRow{
				Components: []discordgo.MessageComponent{
					discordgo.SelectMenu{
						CustomID:    "quiz_select",
						Placeholder: "Pilih level quiz...",
						Options:     menuOptions,
						MinValues:   &[]int{1}[0],
						MaxValues:   1,
					},
				},
			},
		},
	}

	_, err := s.ChannelMessageSendComplex(channelID, msg)
	if err != nil {
		log.Printf("Failed to send quiz selector: %v", err)
	}
}
