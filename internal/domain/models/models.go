package models

type Book struct {
	ID     string `json:"id"`
	Genre  string `json:"genre"`
	Title  string `json:"title"`
	Author string `json:"author"`
}

type User struct {
	ID       string `json:"id"`
	Email    string `json:"email"`
	PassHash []byte `json:"-"`
	IsAdmin  bool   `json:"is_admin"`
}
