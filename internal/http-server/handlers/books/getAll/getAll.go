package getall

import (
	"book_catalog/internal/domain/models"
	resp "book_catalog/internal/lib/api/response"
	"book_catalog/internal/lib/logger/sl"
	"book_catalog/internal/storage"
	"context"
	"errors"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/middleware"
	"github.com/go-chi/render"
)

type BookGetter interface {
	GetAllBooks(ctx context.Context) (books []models.Book, err error)
}

type Response struct {
	resp.Response
	Books []models.Book `json:"books"`
}

func New(ctx context.Context, log *slog.Logger, bookGetter BookGetter) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		const op = "handlers.Book.GetAll.New"

		log = log.With(
			slog.String("op", op),
			slog.String("request_id", middleware.GetReqID(r.Context())),
		)

		log.Info("getting all books from the store...")

		books, err := bookGetter.GetAllBooks(ctx)
		if err != nil {
			if errors.Is(err, storage.ErrNoBooksInTheStore) {
				log.Error("no books in the store")
				w.WriteHeader(http.StatusOK)
				render.JSON(w, r, Response{
					Response: resp.OK(),
					Books:    []models.Book{},
				})
				return
			}

			log.Error("internal error", sl.Err(err))
			w.WriteHeader(http.StatusInternalServerError)
			render.JSON(w, r, resp.Error("Unknown error"))
			return
		}

		log.Info("books were received")
		w.WriteHeader(http.StatusOK)
		render.JSON(w, r, Response{
			Response: resp.OK(),
			Books:    books,
		})
	}
}
