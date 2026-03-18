package postgres

import (
	"book_catalog/internal/domain/models"
	"book_catalog/internal/lib/convert"
	"book_catalog/internal/storage"
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type Storage struct {
	db *pgx.Conn
}

// Opens connection to postgresql DB
func New(ctx context.Context, dsn string) (*Storage, error) {
	const op = "storage.postgres.New"

	db, err := pgx.Connect(ctx, dsn)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}

	return &Storage{db: db}, nil
}

func (s *Storage) SaveBook(ctx context.Context, author string, title string, genre string) (id string, err error) {
	const op = "storage.postgres.SaveBook"

	id = uuid.New().String()

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return "", fmt.Errorf("%s: %w", op, err)
	}

	defer func() {
		if err != nil {
			_ = tx.Rollback(ctx)
			return
		}

		commitErr := tx.Commit(ctx)
		if commitErr != nil {
			err = fmt.Errorf("%s: %w", op, commitErr)
		}
	}()

	author = convert.FirstLetterToUpperCase(author)
	title = convert.ToSnakeCase(convert.FirstLetterToUpperCase(title))
	genre = convert.FirstLetterToUpperCase(genre)

	_, err = tx.Exec(ctx, "INSERT INTO books(id, genre, title, author) VALUES($1, $2, $3, $4)", id, genre, title, author)
	if err != nil {
		if strings.Contains(err.Error(), "duplicate key value violates unique constraint") {
			return "", fmt.Errorf("%s: %w", op, storage.ErrBookExists)
		}
		return "", fmt.Errorf("%s: %w", op, err)
	}

	return id, nil
}

func (s *Storage) GetBookByID(ctx context.Context, id string) (book models.Book, err error) {
	const op = "storage.postgres.GetBookByID"

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return models.Book{}, fmt.Errorf("%s: %w", op, err)
	}

	defer func() {
		if err != nil {
			_ = tx.Rollback(ctx)
			return
		}

		commitErr := tx.Commit(ctx)
		if commitErr != nil {
			err = fmt.Errorf("%s: %w", op, commitErr)
		}
	}()

	err = tx.QueryRow(ctx, "SELECT id, genre, title, author FROM books WHERE id = $1", id).Scan(&book.ID, &book.Genre, &book.Title, &book.Author)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.Book{}, fmt.Errorf("%s: %w", op, storage.ErrBookNotFound)
		}
		return models.Book{}, fmt.Errorf("%s: %w", op, err)
	}

	
	return book, nil
}

func (s *Storage) GetBookByTitle(ctx context.Context, title string) (book models.Book, err error) {
	const op = "storage.postgres.GetBookByTitle"

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return models.Book{}, fmt.Errorf("%s: %w", op, err)
	}

	defer func() {
		if err != nil {
			_ = tx.Rollback(ctx)
			return
		}

		commitErr := tx.Commit(ctx)
		if commitErr != nil {
			err = fmt.Errorf("%s: %w", op, commitErr)
		}
	}()

	err = tx.QueryRow(ctx, "SELECT id, genre, title, author FROM books WHERE title = $1", title	).Scan(&book.ID, &book.Genre, &book.Title, &book.Author)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.Book{}, fmt.Errorf("%s: %w", op, storage.ErrBookNotFound)
		}
		return models.Book{}, fmt.Errorf("%s: %w", op, err)
	}

	
	return book, nil
}

func (s *Storage) GetBooksByAuthor(ctx context.Context, author string) (books []models.Book, err error) {
	const op = "storage.postgres.GetBooksByAuthor"

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}

	defer func() {
		if err != nil {
			_ = tx.Rollback(ctx)
			return
		}

		commitErr := tx.Commit(ctx)
		if commitErr != nil {
			err = fmt.Errorf("%s: %w", op, commitErr)
		}
	}()

	author = convert.FirstLetterToUpperCase(author)

	rows, err := tx.Query(ctx, "SELECT id, genre, title, author FROM books WHERE author = $1", author)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}

	for rows.Next() {
		var book models.Book
		if err := rows.Scan(&book.ID, &book.Genre, &book.Title, &book.Author); err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, fmt.Errorf("%s: %w", op, storage.ErrNoBooksWithThisAuthor)
			}
			return nil, fmt.Errorf("%s: %w", op, err)
		}
		books = append(books, book)
	}

	return books, nil
}

func (s *Storage) GetBooksByGenre(ctx context.Context, genre string) (books []models.Book, err error) {
	const op = "storage.postgres.GetBooksByGenre"

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}

	defer func() {
		if err != nil {
			_ = tx.Rollback(ctx)
			return
		}

		commitErr := tx.Commit(ctx)
		if commitErr != nil {
			err = fmt.Errorf("%s: %w", op, commitErr)
		}
	}()

	genre = convert.FirstLetterToUpperCase(genre)

	rows, err := tx.Query(ctx, "SELECT id, genre, title, author FROM books WHERE genre = $1", genre)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	defer rows.Close()

	for rows.Next() {
		var book models.Book
		if err := rows.Scan(&book.ID, &book.Genre, &book.Title, &book.Author); err != nil {
			return nil, fmt.Errorf("%s: %w", op, err)
		}
		books = append(books, book)
	}

    if err = rows.Err(); err != nil {
        return nil, fmt.Errorf("%s: %w", op, err)
    }

    if len(books) == 0 {
        return nil, fmt.Errorf("%s: %w", op, storage.ErrNoBooksWithThisGenre)
    }

	return books, nil
}

func (s *Storage) GetAllBooks(ctx context.Context) ([]models.Book, error) {
    const op = "storage.postgres.GetAllBooks"

    tx, err := s.db.Begin(ctx)
    if err != nil {
        return nil, fmt.Errorf("%s: %w", op, err)
    }

    var finalErr error
    defer func() {
        if finalErr != nil {
            _ = tx.Rollback(ctx)
        } else {
            if commitErr := tx.Commit(ctx); commitErr != nil {
                finalErr = fmt.Errorf("%s: %w", op, commitErr)
            }
        }
    }()

    rows, err := tx.Query(ctx, "SELECT id, genre, title, author FROM books")
    if err != nil {
        finalErr = err
        return nil, fmt.Errorf("%s: %w", op, err)
    }
    defer rows.Close()

    var books []models.Book
    for rows.Next() {
        var book models.Book
        if err := rows.Scan(&book.ID, &book.Genre, &book.Title, &book.Author); err != nil {
            finalErr = err
            return nil, fmt.Errorf("%s: %w", op, err)
        }
        books = append(books, book)
    }

    if err := rows.Err(); err != nil {
        finalErr = err
        return nil, fmt.Errorf("%s: %w", op, err)
    }

    if len(books) == 0 {
        finalErr = storage.ErrNoBooksInTheStore
        return nil, fmt.Errorf("%s: %w", op, storage.ErrNoBooksInTheStore)
    }

    return books, nil
}


func (s *Storage) DeleteBookByID(ctx context.Context, id string) (success bool, err error) {
	const op = "storage.postgres.DeleteBookByID"

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return false, fmt.Errorf("%s: %w", op, err)
	}

	defer func() {
		if err != nil {
			_ = tx.Rollback(ctx)
			return
		}

		commitErr := tx.Commit(ctx)
		if commitErr != nil {
			err = fmt.Errorf("%s: %w", op, commitErr)
		}
	}()

	var exists bool
	err = tx.QueryRow(ctx, "SELECT EXISTS(SELECT FROM books WHERE id = $1)", id).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("%s: %w", op, err)
	}
	if !exists {
		return false, fmt.Errorf("%s: %w", op, storage.ErrBookNotFound)
	}

	_, err = tx.Exec(ctx, "DELETE FROM books WHERE id = $1", id)
	if err != nil {
		return false, fmt.Errorf("%s: %w", op, err)
	}

	return true, nil
}

func (s *Storage) SaveUser(ctx context.Context, email string, passHash []byte) (userID string, err error) {
	const op = "storage.postgres.SaveUser"

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return "", fmt.Errorf("%s: %w", op, err)
	}

	defer func() {
		if err != nil {
			_ = tx.Rollback(ctx)
			return
		}

		commitErr := tx.Commit(ctx)
		if commitErr != nil {
			err = fmt.Errorf("%s: %w", op, commitErr)
		}
	}()

	id := uuid.New().String()

	_, err = tx.Exec(ctx, "INSERT INTO users(id, email, pass_hash) VALUES($1, $2, $3)", id, email, passHash)
	if err != nil {
		if strings.Contains(err.Error(), "duplicate key value violates unique constraint") {
			return "", fmt.Errorf("%s: %w", op, storage.ErrUserExists)
		}
		return "", fmt.Errorf("%s: %w", op, err)
	}

	return id, nil
}

// User returns user by email.
func (s *Storage) User(ctx context.Context, email string) (user models.User, err error) {
	const op = "storage.postgres.User"

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return models.User{}, fmt.Errorf("%s: %w", op, err)
	}

	defer func() {
		if err != nil {
			_ = tx.Rollback(ctx)
			return
		}

		commitErr := tx.Commit(ctx)
		if commitErr != nil {
			err = fmt.Errorf("%s: %w", op, commitErr)
		}
	}()

	rows, err := tx.Query(ctx, "SELECT id, email, pass_hash, is_admin FROM users WHERE email = $1", email)
	if err != nil {
		return models.User{}, fmt.Errorf("%s: %w", op, err)
	}

	for rows.Next() {
		if err := rows.Scan(&user.ID, &user.Email, &user.PassHash, &user.IsAdmin); err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return models.User{}, fmt.Errorf("%s: %w", op, storage.ErrUserNotFound)
			}
			return models.User{}, fmt.Errorf("%s: %w", op, err)
		}

	}

	return user, nil
}

func (s *Storage) DeleteUserByID(ctx context.Context, userID string) (success bool, err error) {
	const op = "storage.postgres.DeleteUserByID"

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return false, fmt.Errorf("%s: %w", op, err)
	}

	defer func() {
		if err != nil {
			_ = tx.Rollback(ctx)
			return
		}

		commitErr := tx.Commit(ctx)
		if commitErr != nil {
			err = fmt.Errorf("%s: %w", op, commitErr)
		}
	}()

	var exists bool
	err = tx.QueryRow(ctx, "SELECT EXISTS(SELECT FROM users WHERE id = $1)", userID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("%s: %w", op, err)
	}
	if !exists {
		return false, fmt.Errorf("%s: %w", op, storage.ErrUserNotFound)
	}

	_, err = tx.Exec(ctx, "DELETE FROM users WHERE id = $1", userID)
	if err != nil {
		return false, fmt.Errorf("%s: %w", op, err)
	}

	return true, nil
}

func (s *Storage) SaveAdmin(ctx context.Context, email string, passHash []byte) (uid string, err error) {
	const op = "storage.postgres.SaveAdmin"

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return "", fmt.Errorf("%s: %w", op, err)
	}

	defer func() {
		if err != nil {
			_ = tx.Rollback(ctx)
			return
		}

		commitErr := tx.Commit(ctx)
		if commitErr != nil {
			err = fmt.Errorf("%s: %w", op, commitErr)
		}
	}()

	id := uuid.New().String()

	_, err = tx.Exec(ctx, "INSERT INTO users(id, email, pass_hash, is_admin) VALUES($1, $2, $3, $4)", id, email, passHash, true)
	if err != nil {
		if strings.Contains(err.Error(), "duplicate key value violates unique constraint") {
			return "", fmt.Errorf("%s: %w", op, storage.ErrUserExists)
		}
		return "", fmt.Errorf("%s: %w", op, err)
	}

	return id, nil
}