package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/bwmarrin/discordgo"
	"github.com/joho/godotenv"
)

var (
	activeQuizzes = make(map[string]QuizSession) // userID -> QuizSession
	kotobaBotID   = "251239170058616833"
)

type QuizSession struct {
	UserID    string
	QuizID    string
	ThreadID  string
	ChannelID string
	Started   bool
	Progress  int
}

func main() {
	err := godotenv.Load("../.env")
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	token := os.Getenv("DISCORD_TOKEN")
	if token == "" {
		log.Fatal("DISCORD_TOKEN is not set")
	}

	dg, err := discordgo.New("Bot " + token)
	if err != nil {
		log.Fatal("Error creating Discord session: ", err)
	}

	// Register event handlers
	dg.AddHandler(OnReady)
	dg.AddHandler(OnInteraction)
	dg.AddHandler(OnMessageCreate)

	// Set intents
	dg.Identify.Intents = discordgo.IntentsGuilds | 
		discordgo.IntentsGuildMessages | 
		discordgo.IntentMessageContent |
		discordgo.IntentsDirectMessages

	err = dg.Open()
	if err != nil {
		log.Fatalf("Failed to connect: %v", err)
	}
	defer dg.Close()

	log.Println("Bot is running. Press CTRL+C to exit.")
	sc := make(chan os.Signal, 1)
	signal.Notify(sc, syscall.SIGINT, syscall.SIGTERM, os.Interrupt)
	<-sc
}
