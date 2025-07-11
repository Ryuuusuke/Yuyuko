package main

import (
	"fmt"
	"log"
	"time"

	"github.com/bwmarrin/discordgo"
)

func SendQuizSelector(s *discordgo.Session, channelID string) {
	// Hapus semua pesan sebelumnya dari bot sendiri
	messages, err := s.ChannelMessages(channelID, 100, "", "", "")
	if err == nil {
		for _, msg := range messages {
			if msg.Author != nil && msg.Author.ID == s.State.User.ID {
				_ = s.ChannelMessageDelete(channelID, msg.ID)
				time.Sleep(200 * time.Millisecond) // Hindari rate limit
			}
		}
	}

	var menuOptions []discordgo.SelectMenuOption
	var quizOrder = []string{
		"hiragana_katakana",
		"Level_1",
		"Level_2",
		"Level_3",
		"Level_4",
		"Level_5",
		"Level_6",
		"Level_7",
	}

	for i, key := range quizOrder {
		quiz, ok := Quizzes[key]
		if !ok {
			continue
		}
		menuOptions = append(menuOptions, discordgo.SelectMenuOption{
			Label:       fmt.Sprintf("%d. %s", i+1, quiz.Label),
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

	_, err = s.ChannelMessageSendComplex(channelID, msg)
	if err != nil {
		log.Printf("Failed to send quiz selector: %v", err)
	}
}
