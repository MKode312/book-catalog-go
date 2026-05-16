package convert

import (
	"regexp"
	"strings"
	"unicode"
)

func FirstLetterToUpperCase(s string) string {
	runes := []rune(s)
	runes[0] = unicode.ToUpper(runes[0])
	return string(runes)
}

func ToSnakeCase(s string) string {
	s = strings.TrimSpace(s)
	re := regexp.MustCompile(`\s+`)
	return re.ReplaceAllString(s, "_")
}

func ToSpaceCase(s string) string {
	s = strings.ReplaceAll(s, "_", " ")
	return s
}