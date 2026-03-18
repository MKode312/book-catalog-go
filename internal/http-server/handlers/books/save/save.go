package save

import (
	resp "book_catalog/internal/lib/api/response"
	"book_catalog/internal/lib/logger/sl"
	"book_catalog/internal/storage"
	"context"
	"errors"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/render"
	"github.com/go-playground/validator"
)

type BookSaver interface {
	SaveBook(ctx context.Context, author string, title string, genre string) (id string, err error)
}

type Request struct {
	Author string `json:"author" required:"true"`
	Title string `json:"title" required:"true"`
	Genre string `json:"genre" required:"true"`
}

type Response struct {
	resp.Response
	ID string `json:"ID"`
}

func New(ctx context.Context, log *slog.Logger, bookSaver BookSaver) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		const op = "handlers.Book.Save.New"

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


		author := req.Author
		title := req.Title
		genre := req.Genre

		log.Info("saving book...")

		id, err := bookSaver.SaveBook(ctx, author, title, genre)
		if err != nil {
			if errors.Is(err, storage.ErrBookExists) {
				log.Error("book already exists")
				w.WriteHeader(http.StatusConflict) 
				render.JSON(w, r, resp.Error("This book is already in the system"))
				return
			}

			log.Error("internal error")
			w.WriteHeader(http.StatusInternalServerError)
			render.JSON(w, r, resp.Error("Unknown error"))
			return
		}

		log.Info("book was saved")
		w.WriteHeader(http.StatusCreated)
		render.JSON(w, r, Response{
			Response: resp.OK(),
			ID: id,
		})
	}
}