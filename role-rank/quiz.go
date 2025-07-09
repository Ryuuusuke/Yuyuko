package main

type QuizInfo struct {
	Label       string
	Description string
	Value       string
	RoleID      string
	Command     string
}

var Quizzes = map[string]QuizInfo{
	"testlevel1": {
		Label:       "Level 1",
		Description: "Gatau kanji",
		Value:       "testlevel1",
		RoleID:      "1372825348189978665",
		Command:     "k!quiz testlevel1 hardcore mmq=3",
	},
}
