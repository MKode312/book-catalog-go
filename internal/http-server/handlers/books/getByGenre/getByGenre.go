package getbygenre

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
	"github.com/go-playground/validator"
)

type BookGettreByGenre interface {
	GetBooksByGenre(ctx context.Context, genre string) (books []models.Book, err error)
}

type Request struct {
	Genre string `json:"genre" validate:"required"`
}

type Response struct {
	resp.Response
	Books []models.Book `json:"books"`
}

func New(ctx context.Context, log *slog.Logger, bookGetterByGenre BookGettreByGenre) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		const op = "handlers.Book.GetByGenre.New"

	    log = log.With(
			slog.String("op", op),
			slog.String("request_id", middleware.GetReqID(r.Context())),
		)

		var req Request

		if err := render.DecodeJSON(r.Body, &req); err != nil {
			log.Error("failed to decode request body", sl.Err(err))
			w.WriteHeader(http.StatusInternalServerError)
			render.JSON(w, r, resp.Error("Unknown error"))
			return
		}

		log.Info("request body decoded", slog.Any("request", req))

		if err := validator.New().Struct(req); err != nil {
			validationErr := err.(validator.ValidationErrors)
			log.Error("invalid request", sl.Err(err))
			w.WriteHeader(http.StatusBadRequest)
			render.JSON(w, r, resp.Error("Invalid request"))
			render.JSON(w, r, resp.ValidationError(validationErr))
			return
		}

		log.Info("getting books by genre...")

		books, err := bookGetterByGenre.GetBooksByGenre(ctx, req.Genre) 
		if err != nil {
			if errors.Is(err, storage.ErrNoBooksWithThisGenre) {
				log.Error("no books with this genre found")
				w.WriteHeader(http.StatusConflict)
				render.JSON(w, r, resp.Error("No books with this genre found"))
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
			Books: books,
		})
	}
}

