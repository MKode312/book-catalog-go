package MWIsadmin

import (
	resp "book_catalog/internal/lib/api/response"
	jwtValidation "book_catalog/internal/lib/jwt"
	"log/slog"
	"net/http"

	"github.com/go-chi/render"
)

func New(log *slog.Logger) func(next http.Handler) http.Handler {
	log = log.With(
		slog.String("component", "middleware/isAdmin"),
	)

	log.Info("is_admin middleware enabled")
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			//TODO: Redirect user to login page if cookie is not found
			cookie, err := r.Cookie("auth_token")
			if err != nil {
				log.Error("cookie not found")
				w.WriteHeader(http.StatusForbidden)
				render.JSON(w, r, resp.Error("Cookie not found"))
				return
			}

			token := cookie.Value

			isAdmin, err := jwtValidation.IsAdmin(token)
			if err != nil || isAdmin == false {
				log.Error("forbidden to use this endpoint, user is not an admin")
				w.WriteHeader(http.StatusForbidden)
				render.JSON(w, r, resp.Error("User is not an admin"))
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
