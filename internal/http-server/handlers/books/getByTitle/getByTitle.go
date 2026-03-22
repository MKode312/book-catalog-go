package getbytitle

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

type BookGetterByTitle interface {
	GetBookByTitle(ctx context.Context, title string) (book models.Book, err error)
}

type BookSaverCache interface {
	SaveBook(ctx context.Context, book models.Book) (err error) 
}

type Request struct {
	Title string `json:"title" validate:"required"`
}

type Response struct {
	resp.Response
	Book models.Book `json:"book"`
}

func New(ctx context.Context, log *slog.Logger, bookGetterByTtileStorage BookGetterByTitle, bookGetterByTitleCache BookGetterByTitle, bookSaverCache BookSaverCache) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		const op = "handlers.Book.GetByTitle.New"

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

		log.Info("getting book by title from the cache...")

		book, err := bookGetterByTitleCache.GetBookByTitle(ctx, req.Title)
		if err != nil {
			if errors.Is(err, storage.ErrBookNotFound) {
				log.Error("book not found, trying to find it in the store...")
				book, err = bookGetterByTtileStorage.GetBookByTitle(ctx, req.Title)
		        if err != nil {
					if errors.Is(err, storage.ErrBookNotFound) {
					log.Error("book not found")
					w.WriteHeader(http.StatusConflict)
					render.JSON(w, r, resp.Error("Book not found"))
					return
				}

					log.Error("internal error", sl.Err(err))
					w.WriteHeader(http.StatusInternalServerError)
					render.JSON(w, r, resp.Error("Unknown error"))
					return
			    }
				log.Info("book was received from the store, adding it to the cache...")
				if err = bookSaverCache.SaveBook(ctx, book); err != nil {
					log.Error("failed to save book to the cache", sl.Err(err))
				}
				log.Info("book was added to the cache")
				w.WriteHeader(http.StatusOK)
				render.JSON(w, r, Response{
				Response: resp.OK(),
				Book: book,
				})
				return
			}
			log.Error("internal error", sl.Err(err))
			w.WriteHeader(http.StatusInternalServerError)
			render.JSON(w, r, resp.Error("Unknown error"))
			return
		}

		log.Info("book was received from the cache")
		w.WriteHeader(http.StatusOK)
		render.JSON(w, r, Response{
			Response: resp.OK(),
			Book: book,
		})
	}
}