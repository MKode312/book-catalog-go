package deleteuser

import (
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

type UserDelter interface {
	DeleteUserByID(ctx context.Context, userID string) (success bool, err error)
}

type Request struct {
	ID string `json:"id" validate:"required"`
}

type Response struct {
	resp.Response
	Success bool `json:"success"`
}

func New(ctx context.Context, log *slog.Logger, userDeleter UserDelter) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		const op = "handlers.User.Delete.New"

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

		log.Info("deleting user...")

		success, err := userDeleter.DeleteUserByID(ctx, req.ID)
		if err != nil {
			if errors.Is(err, storage.ErrUserNotFound) {
				log.Error("user not found")
				w.WriteHeader(http.StatusConflict)
				render.JSON(w, r, resp.Error("User not found"))
				return
			}

			log.Error("internal error", sl.Err(err))
			w.WriteHeader(http.StatusInternalServerError)
			render.JSON(w, r, resp.Error("Unknown error"))
			return
		}

		if success {
			log.Info("user deleted successfully")
			w.WriteHeader(http.StatusAccepted)
			render.JSON(w, r, Response{
				Response: resp.OK(),
				Success: success,
			})
		} else {
			log.Warn("user was not deleted!!!")
			w.WriteHeader(http.StatusConflict)
			render.JSON(w, r, Response{
				Response: resp.Error("User was not deleted"),
				Success: success,
			})
		}
	}
}