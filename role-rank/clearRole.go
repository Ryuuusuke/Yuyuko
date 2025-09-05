package main

// TODO: Implement centralized error handling mechanism

import (
	"fmt"
	"log"
	"strings"

	"github.com/bwmarrin/discordgo"
)

var allowedRoles = []string{
	"1378503364584931328",
	"1381148056178659399",
}

func HandleClearCommand(s *discordgo.Session, m *discordgo.MessageCreate) {
	if !strings.HasPrefix(m.Content, "a!clear") {
		return
	}

	args := strings.Fields(m.Content)
	if len(args) < 3 {
		s.ChannelMessageSend(m.ChannelID, "Wrong format. Use: `a!clear <user_id> <message>`")
		return
	}

	// ✅ Check if sender has allowed role
	hasAccess := false
	member, err := s.GuildMember(m.GuildID, m.Author.ID)
	if err != nil {
		log.Printf("Failed to get member data: %v", err)
		return
	}
	for _, r := range member.Roles {
		for _, allowed := range allowedRoles {
			if r == allowed {
				hasAccess = true
				break
			}
		}
	}
	if !hasAccess {
		s.ChannelMessageSend(m.ChannelID, "You don't have permission to use this command.")
		return
	}

	//Get user ID & custom message
	targetUserID := args[1]
	customMessage := strings.Join(args[2:], " ")

	//Get target user data
	targetMember, err := s.GuildMember(m.GuildID, targetUserID)
	if err != nil {
		s.ChannelMessageSend(m.ChannelID, "Failed to find user.")
		log.Printf("Failed to find user %s: %v", targetUserID, err)
		return
	}

	//Remove all quiz roles
	removedRoles := []string{}
	for _, quiz := range Quizzes {
		for _, r := range targetMember.Roles {
			if r == quiz.RoleID {
				err := s.GuildMemberRoleRemove(m.GuildID, targetUserID, quiz.RoleID)
				if err != nil {
					log.Printf("Failed to remove role %s: %v", quiz.RoleID, err)
				} else {
					removedRoles = append(removedRoles, quiz.Label)
				}
			}
		}
	}

	//Send DM to user
	channel, err := s.UserChannelCreate(targetUserID)
	if err == nil {
		dm := fmt.Sprintf("Hello! Your quiz roles have been removed by a moderator.\n\n**Message from moderator:**\n%s", customMessage)
		_, err = s.ChannelMessageSend(channel.ID, dm)
		if err != nil {
			log.Printf("Failed to send DM to %s: %v", targetUserID, err)
		}
	} else {
		log.Printf("Failed to open DM to %s: %v", targetUserID, err)
	}

	msg := fmt.Sprintf("Quiz roles for <%s> have been removed.\n DM sent with message:\n> %s", targetUserID, customMessage)
	if len(removedRoles) > 0 {
		msg += fmt.Sprintf("\nRemoved roles: %s", strings.Join(removedRoles, ", "))
	} else {
		msg += "\n No quiz roles found."
	}

	s.ChannelMessageSend(m.ChannelID, msg)
}
