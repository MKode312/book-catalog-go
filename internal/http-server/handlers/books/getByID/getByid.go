package getbyid

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
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/render"
)

type BookGetterByID interface {
	GetBookByID(ctx context.Context, id string) (book models.Book, err error)
}

type BookSaverCache interface {
	SaveBook(ctx context.Context, book models.Book) (err error)
}

type Response struct {
	resp.Response
	Book models.Book `json:"book"`
}

func New(ctx context.Context, log *slog.Logger, bookGetterByIDStorage BookGetterByID, bookGetterByIDCache BookGetterByID, bookSaverCache BookSaverCache) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		const op = "handlers.Book.GetByID.New"

		log = log.With(
			slog.String("op", op),
			slog.String("request_id", middleware.GetReqID(r.Context())),
		)

		id := chi.URLParam(r, "bookID")

		log.Info("getting book by id from the cache...")

		book, err := bookGetterByIDCache.GetBookByID(ctx, id)
		if err != nil {
			if errors.Is(err, storage.ErrBookNotFound) {
				log.Error("book not found, trying to find it in the store...")
				book, err = bookGetterByIDStorage.GetBookByID(ctx, id)
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
					Book:     book,
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
			Book:     book,
		})
	}
}
