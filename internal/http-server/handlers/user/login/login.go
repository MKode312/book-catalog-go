package login

import (
	"book_catalog/internal/domain/models"
	resp "book_catalog/internal/lib/api/response"
	jwtValidation "book_catalog/internal/lib/jwt"
	"book_catalog/internal/lib/logger/sl"
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/render"
	"github.com/go-playground/validator"
	"golang.org/x/crypto/bcrypt"
)

type UserProvider interface {
	User(ctx context.Context, email string) (user models.User, err error)
}

type Request struct {
	Email string `json:"email" validate:"required"`
	Password string `json:"password" validate:"required"`
}

type Response struct {
	resp.Response
	Token string `json:"token"`
}

func New(ctx context.Context, log *slog.Logger, tokenTTL time.Duration, userProvider UserProvider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		const op = "handlers.User.Login.New"

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

		log.Info("user is logging in...")

		user, err := userProvider.User(ctx, email)
		if err != nil {
			log.Error("user not found")
			w.WriteHeader(http.StatusConflict)
			render.JSON(w, r, resp.Error("Invalid credentials"))
			return
		}

		if err := bcrypt.CompareHashAndPassword(user.PassHash, []byte(password)); err != nil {
			log.Error("invalid credentials", sl.Err(err))
			w.WriteHeader(http.StatusConflict)
			render.JSON(w, r, resp.Error("Invalid credentials"))
			return
		}

		log.Info("user logged in successfully")

		token, err := jwtValidation.NewToken(user, tokenTTL)
		if err != nil {
			log.Error("failed to generate token", sl.Err(err))
			w.WriteHeader(http.StatusInternalServerError)
			render.JSON(w, r, resp.Error("Unknown error"))
			return
		}

		http.SetCookie(w, &http.Cookie{
			Name: "auth_token",
			Value: token,
			SameSite: http.SameSiteNoneMode,
			HttpOnly: true,
			Path: "/",
		})

		log.Info("token was created")
		w.WriteHeader(http.StatusOK)
		render.JSON(w, r, Response{
			Response: resp.OK(),
			Token: token,
		})
	}
}