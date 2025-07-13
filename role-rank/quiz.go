package main

type QuizInfo struct {
	Label       string
	Description string
	Value       string
	RoleID      string
	Commands    []string
	DeckNames   []string
	ScoreLimits []string
	Level       int
}


var Quizzes = map[string]QuizInfo{
	"hiragana_katakana": {
		Label:       "Kanji Wakaran (漢字わからん)",
		Level:       0,
		Description: "Hiragana + Katakana Quiz",
		Value:       "hiragana_katakana",
		RoleID:      "1392065087216291891", // Replace with actual role ID
		Commands: []string{
		    "k!quiz hiragana+katakana nd mmq=10 dauq=1 font=5 atl=16 color=#f173ff size=100",
		},
		DeckNames: []string{
			"multiple",
		},
		ScoreLimits: []string{
			"10",
		},
	},
	"Level_1": {
		Label:       "Shoshinsha (初心者)",
		Level:       1,
		Description: "JPDB Beginner Level (1-300)",
		Value:       "Level_1",
		RoleID:      "1392065395984306246", // Replace with actual role ID
		Commands: []string{    
			"k!quiz jpdb300 20 hardcore nd mmq=10 dauq=1 font=5 atl=16 color=#f173ff size=100 effect=antiocr",
		},
		DeckNames: []string{
			"jpdb300",
		},
		ScoreLimits: []string{
			"20",
		},
	},
	"Level_2": {
		Label:       "Gakushūsha (学習者)",
		Level:       2,
		Description: "JPDB Intermediate Level (300-1000)",
		Value:       "Level_2",
		RoleID:      "1392065532051591240", // Replace with actual role ID
		Commands: []string{    
			"k!quiz jpdb300to1k 25 hardcore nd mmq=10 dauq=1 font=5 atl=16 color=#f173ff size=100 effect=antiocr",
		},
		DeckNames: []string{
			"jpdb300to1k",
		},
		ScoreLimits: []string{
			"25",
		},
	},
	"Level_3": {
		Label:       "Jōkyūsha (上級者)",
		Level:       3,
		Description: "JPDB Advance Level (1000-3000)",
		Value:       "Level_3",
		RoleID:      "1392065673185857627", // Replace with actual role ID
		Commands: []string{    
			"k!quiz jpdb1k3k 30 hardcore nd mmq=10 dauq=1 font=5 atl=16 color=#f173ff size=100 effect=antiocr",
		},
		DeckNames: []string{
			"jpdb1k3k",
		},
		ScoreLimits: []string{
			"30",
		},
	},
	"Level_4": {
		Label:       "Senpai (先輩)",
		Level:       4,
		Description: "JPDB 5000 + gn2",
		Value:       "Level_4",
		RoleID:      "1392066020235153408",
		Commands: []string{
			"k!quiz gn2 nd 20 mmq=4 atl=60",
			"k!quiz jpdb3k5k 35 hardcore nd mmq=10 dauq=1 font=5 atl=16 color=#f173ff size=100 effect=antiocr",
		},
		DeckNames: []string{
			"jJLPT N2 Grammar",
			"jpdb3k5k",
		},
		ScoreLimits: []string{
			"20",
			"35",
		},
	},
	"Level_5": {
		Label:       "Tetsujin (鉄人)",
		Level:       5,
		Description: "JPDB 10K + gn1",
		Value:       "Level_5",
		RoleID:      "1392066105677189121", // Replace with actual role ID
		Commands: []string{
		    "k!quiz gn1 nd 20 mmq=4 atl=60",
			"k!quiz jpdb5k10k 40 hardcore nd mmq=10 dauq=1 font=5 atl=16 color=#f173ff size=100 effect=antiocr",
		},
		DeckNames: []string{
			"jJLPT N1 Grammar",
			"jpdb5k10k",
		},
		ScoreLimits: []string{
			"20",
			"40",
		},
	},
	"Level_6": {
		Label:       "Kotodama (言霊)",
		Level:       6,
		Description: "JPDB 20K + gn1",
		Value:       "Level_6",
		RoleID:      "1392066278335840376", // Replace with actual role ID
		Commands: []string{
		    "k!quiz gn1 nd 20 mmq=4 atl=60",
			"k!quiz jpdb10k20k 45 hardcore nd mmq=10 dauq=1 font=5 atl=16 color=#f173ff size=100 effect=antiocr",
		},
		DeckNames: []string{
			"jJLPT N1 Grammar",
			"jpdb10k20k",
		},
		ScoreLimits: []string{
			"20",
			"45",
		},
	},
	"Level_7": {
		Label:       "Koten Kam(古典神)",
		Level:       7,
		Description: "JPDB 30K",
		Value:       "Level_7",
		RoleID:      "1392066430467440742", // Replace with actual role ID
		Commands: []string{     
			"k!quiz jpdb20k30k+haado+cope+kunyomi1kfull+loli+Myouji+jpdefs+places_full 50 nd hardcore dauq=1 font=5 atl=16 mmq=9 color=#f173ff size=100 effect=antiocr",
		},
		DeckNames: []string{
			"multiple",
		},
		ScoreLimits: []string{
			"50",
		},
	},
}
