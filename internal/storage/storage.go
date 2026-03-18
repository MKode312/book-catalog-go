package storage

import "errors"

var (
	ErrBookExists = errors.New("book exists")
	ErrBookNotFound = errors.New("book not found")
	ErrNoBooksWithThisAuthor = errors.New("no books with this author")
	ErrNoBooksWithThisGenre = errors.New("no books with this genre")
	ErrNoBooksInTheStore = errors.New("no books in the store")
	ErrUserExists = errors.New("user already exists")
	ErrUserNotFound = errors.New("user not found")
)