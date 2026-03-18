package registerasadmin

import (
	resp "book_catalog/internal/lib/api/response"
	"book_catalog/internal/lib/logger/sl"
	"book_catalog/internal/storage"
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"

	"github.com/go-chi/chi/middleware"
	"github.com/go-chi/render"
	"github.com/go-playground/validator"
	"golang.org/x/crypto/bcrypt"
)

type AdminSaver interface {
	SaveAdmin(ctx context.Context, email string, passHash []byte) (uid string, err error)
}

type Request struct {
	Email string `json:"email" validate:"required"`
	Password string `json:"password" validate:"required"`
	AdminSecret string `json:"admin_secret" validate:"required"`
}

type Response struct {
	resp.Response
	ID string `json:"id"`
}

func New(ctx context.Context, log *slog.Logger, adminSaver AdminSaver) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		const op = "handlers.User.RegisterAsAdmin"

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

		email := req.Email
		password := req.Password
		adminSecret := req.AdminSecret

		adminPswd := os.Getenv("APP_SECRET")
		if adminPswd == "" {
			log.Error("failed to find admin secret key")
			w.WriteHeader(http.StatusInternalServerError)
			render.JSON(w, r, resp.Error("Unknown error"))
			return
		}

		if adminSecret != adminPswd {
			log.Error("wrong admin secret")
			w.WriteHeader(http.StatusForbidden)
			render.JSON(w, r, resp.Error("Wrong admin secret"))
			return
		}

		log.Info("registering admin...")

		passHash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err != nil {
			log.Error("failed to generate pass hash", sl.Err(err))
			w.WriteHeader(http.StatusInternalServerError)
			render.JSON(w, r, resp.Error("Unknown error"))
			return
		}

		id, err := adminSaver.SaveAdmin(ctx, email, passHash)
		if err != nil {
			if errors.Is(err, storage.ErrUserExists) {
				log.Error("user already exists")
				w.WriteHeader(http.StatusConflict)
				render.JSON(w, r, resp.Error("User with this email already exists"))
				return
			}

			log.Error("internal error", sl.Err(err))
			w.WriteHeader(http.StatusInternalServerError)
			render.JSON(w, r, resp.Error("Unknown error"))
			return
		}

		log.Info("user registered")
		w.WriteHeader(http.StatusCreated)
		render.JSON(w, r, Response{
			Response: resp.OK(),
			ID: id,
		})
	}
}