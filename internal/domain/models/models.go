package models

type Book struct {
	ID string
	Genre string 
	Title string 
	Author string
}

type User struct {
	ID string 
	Email string
	PassHash []byte 
	IsAdmin bool
}