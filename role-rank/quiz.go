package main

type QuizInfo struct {
	Label       string
	Description string
	Value       string
	RoleID      string
	Commands    []string
}

var Quizzes = map[string]QuizInfo{
	"hiragana_katakana": {
		Label:       "Kanji Wakaran (漢字わからん)",
		Description: "Hiragana + Katakana Quiz",
		Value:       "hiragana_katakana",
		RoleID:      "1392065087216291891", // Replace with actual role ID
		Commands: []string{
		    "k!quiz hiragana+katakana nd mmq=10 dauq=1 font=5 atl=16 color=#f173ff size=100",
		},
	},
	"Level_1": {
		Label:       "Shoshinsha (初心者)",
		Description: "JPDB Beginner Level (1-300)",
		Value:       "Level_1",
		RoleID:      "1392065395984306246", // Replace with actual role ID
		Commands: []string{    
			"k!quiz jpdbtop30k(1-300) 20 hardcore nd mmq=10 dauq=1 font=5 atl=16 color=#f173ff size=100 effect=antiocr",
		},
	},
	"Level_2": {
		Label:       "Gakushūsha (学習者)",
		Description: "JPDB Intermediate Level (1-1000)",
		Value:       "Level_2",
		RoleID:      "1392065532051591240", // Replace with actual role ID
		Commands: []string{    
			"k!quiz jpdbtop30k(1-1000) 25 hardcore nd mmq=10 dauq=1 font=5 atl=16 color=#f173ff size=100 effect=antiocr",
		},
	},
	"Level_3": {
		Label:       "Jōkyūsha (上級者)",
		Description: "JPDB Advance Level (1-3000)",
		Value:       "Level_3",
		RoleID:      "1392065673185857627", // Replace with actual role ID
		Commands: []string{    
			"k!quiz jpdbtop30k(1-3000) 30 hardcore nd mmq=10 dauq=1 font=5 atl=16 color=#f173ff size=100 effect=antiocr",
		},
	},
	"Level_4": {
		Label:       "Senpai (先輩)",
		Description: "JPDB 5000 + gn2",
		Value:       "Level_4",
		RoleID:      "Y1392066020235153408",
		Commands: []string{
			"k!quiz jpdbtop30k(1-2) 20 hardcore nd mmq=10 dauq=1 font=5 atl=16 color=#f173ff size=100 effect=antiocr",
			"k!quiz jpdbtop30k(1-3) 20 hardcore nd mmq=10 dauq=1 font=5 atl=16 color=#f173ff size=100 effect=antiocr",
		},
	},
	"Level_5": {
		Label:       "Tetsujin (鉄人)",
		Description: "JPDB 10K + gn1",
		Value:       "Level_5",
		RoleID:      "1392066105677189121", // Replace with actual role ID
		Commands: []string{
		    "k!quiz gn1 nd 20 mmq=4 atl=60",
			"k!quiz jpdbtop30k(1-10000) 40 hardcore nd mmq=10 dauq=1 font=5 atl=16 color=#f173ff size=100 effect=antiocr",
		},
	},
	"Level_6": {
		Label:       "Kotodama (言霊)",
		Description: "JPDB 20K + gn1",
		Value:       "Level_6",
		RoleID:      "1392066278335840376", // Replace with actual role ID
		Commands: []string{
		    "k!quiz gn1 nd 20 mmq=4 atl=60",
			"k!quiz jpdbtop30k(1-20000) 45 hardcore nd mmq=10 dauq=1 font=5 atl=16 color=#f173ff size=100 effect=antiocr",
		},
	},
	"Level_7": {
		Label:       "Kotodama (言霊)",
		Description: "JPDB 30K",
		Value:       "Level_7",
		RoleID:      "1392066430467440742", // Replace with actual role ID
		Commands: []string{     
			"k!quiz jpdbtop30k+haado 50 nd hardcore dauq=1 font=5 atl=16 mmq=9 color=#f173ff size=100 effect=antiocr",
		},
	},
}
