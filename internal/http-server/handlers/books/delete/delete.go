package deletebyid

import (
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

type BookDeleter interface {
	DeleteBookByID(ctx context.Context, id string) (success bool, err error)
}

type Response struct {
	resp.Response
	Success bool `json:"success"`
}

func New(ctx context.Context, log *slog.Logger, bookDeleter BookDeleter) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		const op = "handlers.Book.Delete.New"
 
		log = log.With(
			slog.String("op", op),
			slog.String("request_id", middleware.GetReqID(r.Context())),
		)

		id := chi.URLParam(r, "bookID")

		log.Info("deleting book...")

		success, err := bookDeleter.DeleteBookByID(ctx, id)
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

		if success {
			log.Info("book was successfully deleted")
			w.WriteHeader(http.StatusAccepted)
			render.JSON(w, r, Response{
				Response: resp.OK(),
				Success: success,
			})
		} else {
			log.Warn("book was not deleted!!!")
			w.WriteHeader(http.StatusConflict)
			render.JSON(w, r, Response{
				Response: resp.Error("Book was not deleted"),
				Success: success,
			})
		}
	}
}