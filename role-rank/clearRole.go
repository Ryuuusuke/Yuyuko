package main

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
		s.ChannelMessageSend(m.ChannelID, "Format salah. Gunakan: `a!clear <user_id> <pesan>`")
		return
	}

	// ✅ Cek apakah pengirim punya role yang diizinkan
	hasAccess := false
	member, err := s.GuildMember(m.GuildID, m.Author.ID)
	if err != nil {
		log.Printf("Gagal mendapatkan data member: %v", err)
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
		s.ChannelMessageSend(m.ChannelID, "Kamu tidak punya izin untuk menggunakan perintah ini.")
		return
	}

	//Ambil user ID & pesan custom
	targetUserID := args[1]
	customMessage := strings.Join(args[2:], " ")

	//Ambil data user target
	targetMember, err := s.GuildMember(m.GuildID, targetUserID)
	if err != nil {
		s.ChannelMessageSend(m.ChannelID, "Gagal menemukan user.")
		log.Printf("Gagal menemukan user %s: %v", targetUserID, err)
		return
	}

	//Hapus semua role quiz
	removedRoles := []string{}
	for _, quiz := range Quizzes {
		for _, r := range targetMember.Roles {
			if r == quiz.RoleID {
				err := s.GuildMemberRoleRemove(m.GuildID, targetUserID, quiz.RoleID)
				if err != nil {
					log.Printf("Gagal menghapus role %s: %v", quiz.RoleID, err)
				} else {
					removedRoles = append(removedRoles, quiz.Label)
				}
			}
		}
	}

	//Kirim DM ke user
	channel, err := s.UserChannelCreate(targetUserID)
	if err == nil {
		dm := fmt.Sprintf("Halo! Role quiz kamu telah dicabut oleh moderator.\n\n**Pesan dari moderator:**\n%s", customMessage)
		_, err = s.ChannelMessageSend(channel.ID, dm)
		if err != nil {
			log.Printf("Gagal kirim DM ke %s: %v", targetUserID, err)
		}
	} else {
		log.Printf("Gagal buka DM ke %s: %v", targetUserID, err)
	}

	msg := fmt.Sprintf("Role quiz <%s> berhasil dicabut.\n DM terkirim dengan pesan:\n> %s", targetUserID, customMessage)
	if len(removedRoles) > 0 {
		msg += fmt.Sprintf("\nRole yang dihapus: %s", strings.Join(removedRoles, ", "))
	} else {
		msg += "\n Tidak ada role quiz yang ditemukan."
	}

	s.ChannelMessageSend(m.ChannelID, msg)
}
