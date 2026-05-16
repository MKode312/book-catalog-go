package MWJwt

import (
	"book_catalog/internal/http-server/middleware/authredirect"
	jwtValidation "book_catalog/internal/lib/jwt"
	"book_catalog/internal/lib/logger/sl"
	"log/slog"
	"net/http"
)

func New(log *slog.Logger) func(next http.Handler) http.Handler {
	log = log.With(
		slog.String("component", "middleware/jwt"),
	)

	log.Info("jwt validation middleware enabled")
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			cookie, err := r.Cookie("auth_token")
			if err != nil {
				log.Error("cookie not found")
				authredirect.ToLogin(w, r)
				return
			}

			token := cookie.Value

			if err := jwtValidation.ValidateToken(token); err != nil {
				log.Error("validation jwt error", sl.Err(err))
				authredirect.ToLogin(w, r)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
