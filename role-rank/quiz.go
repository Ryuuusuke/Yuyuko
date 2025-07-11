package main

type QuizInfo struct {
	Label       string
	Description string
	Value       string
	RoleID      string
	Commands    []string
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
	},
	"Level_1": {
		Label:       "Shoshinsha (初心者)",
		Level:       1,
		Description: "JPDB Beginner Level (1-300)",
		Value:       "Level_1",
		RoleID:      "1392065395984306246", // Replace with actual role ID
		Commands: []string{    
			"k!quiz jpdbtop30k(1-300) 20 hardcore nd mmq=10 dauq=1 font=5 atl=16 color=#f173ff size=100 effect=antiocr",
		},
	},
	"Level_2": {
		Label:       "Gakushūsha (学習者)",
		Level:       2,
		Description: "JPDB Intermediate Level (1-1000)",
		Value:       "Level_2",
		RoleID:      "1392065532051591240", // Replace with actual role ID
		Commands: []string{    
			"k!quiz jpdbtop30k(300-1000) 25 hardcore nd mmq=10 dauq=1 font=5 atl=16 color=#f173ff size=100 effect=antiocr",
		},
	},
	"Level_3": {
		Label:       "Jōkyūsha (上級者)",
		Level:       3,
		Description: "JPDB Advance Level (1-3000)",
		Value:       "Level_3",
		RoleID:      "1392065673185857627", // Replace with actual role ID
		Commands: []string{    
			"k!quiz jpdbtop30k(1000-3000) 30 hardcore nd mmq=10 dauq=1 font=5 atl=16 color=#f173ff size=100 effect=antiocr",
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
			"k!quiz jpdbtop30k(3000-5000) 35 hardcore nd mmq=10 dauq=1 font=5 atl=16 color=#f173ff size=100 effect=antiocr",
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
			"k!quiz jpdbtop30k(5000-10000) 40 hardcore nd mmq=10 dauq=1 font=5 atl=16 color=#f173ff size=100 effect=antiocr",
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
			"k!quiz jpdbtop30k(10000-20000) 45 hardcore nd mmq=10 dauq=1 font=5 atl=16 color=#f173ff size=100 effect=antiocr",
		},
	},
	"Level_7": {
		Label:       "Koten Kami (古典神)",
		Level:       7,
		Description: "JPDB 30K",
		Value:       "Level_7",
		RoleID:      "1392066430467440742", // Replace with actual role ID
		Commands: []string{     
			"k!quiz jpdbtop30k(20000-30000)+haado 50 nd hardcore dauq=1 font=5 atl=16 mmq=9 color=#f173ff size=100 effect=antiocr",
		},
	},
}
