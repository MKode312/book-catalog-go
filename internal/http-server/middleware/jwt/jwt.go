package MWJwt

import (
	resp "book_catalog/internal/lib/api/response"
	jwtValidation "book_catalog/internal/lib/jwt"
	"book_catalog/internal/lib/logger/sl"
	"log/slog"
	"net/http"
	"strings"

	"github.com/go-chi/render"
)

func New(log *slog.Logger) func(next http.Handler) http.Handler {
	log = log.With(
		slog.String("component", "middleware/jwt"),
	)

	log.Info("jwt validation middleware enabled")
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := bearerToken(r)
			if token == "" {
				cookie, err := r.Cookie("auth_token")
				if err == nil {
					token = cookie.Value
				}
			}

			if token == "" {
				log.Error("token not found")
				w.WriteHeader(http.StatusUnauthorized)
				render.JSON(w, r, resp.Error("Unauthorized"))
				return
			}

			if err := jwtValidation.ValidateToken(token); err != nil {
				log.Error("validation jwt error", sl.Err(err))
				w.WriteHeader(http.StatusUnauthorized)
				render.JSON(w, r, resp.Error("Unauthorized"))
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func bearerToken(r *http.Request) string {
	authHeader := r.Header.Get("Authorization")
	token, ok := strings.CutPrefix(authHeader, "Bearer ")
	if !ok {
		return ""
	}
	return strings.TrimSpace(token)
}
