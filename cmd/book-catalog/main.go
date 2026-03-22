package main

import (
	"book_catalog/internal/config"
	deletebyid "book_catalog/internal/http-server/handlers/books/delete"
	getall "book_catalog/internal/http-server/handlers/books/getAll"
	getbyauthor "book_catalog/internal/http-server/handlers/books/getByAuthor"
	getbygenre "book_catalog/internal/http-server/handlers/books/getByGenre"
	getbyid "book_catalog/internal/http-server/handlers/books/getByID"
	getbytitle "book_catalog/internal/http-server/handlers/books/getByTitle"
	"book_catalog/internal/http-server/handlers/books/save"
	deleteuser "book_catalog/internal/http-server/handlers/user/delete"
	"book_catalog/internal/http-server/handlers/user/login"
	"book_catalog/internal/http-server/handlers/user/register"
	registerasadmin "book_catalog/internal/http-server/handlers/user/registerAsAdmin"
	MWIsadmin "book_catalog/internal/http-server/middleware/isAdmin"
	MWJwt "book_catalog/internal/http-server/middleware/jwt"
	MWLogger "book_catalog/internal/http-server/middleware/logger"
	"book_catalog/internal/lib/logger/handlers/slogpretty"
	"book_catalog/internal/lib/logger/sl"
	"book_catalog/internal/storage/postgres"
	rediscache "book_catalog/internal/storage/redis"
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/middleware"
	"github.com/go-chi/chi/v5"
)

const (
	envLocal = "local"
	envDev = "dev"
	envProd = "prod"
)

func main() {
	cfg := config.MustLoad()

	log := setupLogger(cfg.Env)

	log.Info("starting book-catalog", slog.String("env", cfg.Env))

	storage, err := postgrestorage.New(context.Background(), cfg.Postgres.DBurl)
	if err != nil {
		log.Error("failed to init storage", sl.Err(err))
		os.Exit(1)
	}

	cache, err := rediscache.New(context.Background(), cfg.Redis.Address, cfg.Redis.TTL)
	if err != nil {
		log.Error("failed to init cache", sl.Err(err))
		os.Exit(1)
	}

	router := chi.NewRouter()

	router.Use(middleware.RequestID)
	router.Use(middleware.Logger)
	router.Use(MWLogger.New(log))
	router.Use(middleware.Recoverer)
	router.Use(middleware.URLFormat)

	jwtMiddleware := MWJwt.New(log)
	isAdminMiddleware := MWIsadmin.New(log)

	router.Post("/api/register", register.New(context.Background(), log, storage))
	router.Post("/api/login", login.New(context.Background(), log, cfg.TokenTTL, storage))
	router.Post("/api/register/admin", registerasadmin.New(context.Background(), log, storage))

	router.Group(func(r chi.Router) {
		r.Use(jwtMiddleware)

		r.Delete("/api/deleteUser", deleteuser.New(context.Background(), log, storage))
		
		r.Get("/api/bookById/{bookID}", getbyid.New(context.Background(), log, storage, cache, cache))
		r.Get("/api/book", getbytitle.New(context.Background(), log, storage, cache, cache))
		r.Get("/api/books/all", getall.New(context.Background(), log, storage))
	    r.Get("/api/books/genre", getbygenre.New(context.Background(), log, storage))
		r.Get("/api/books/author", getbyauthor.New(context.Background(), log, storage))
		
		r.Group(func(rout chi.Router) {
			rout.Use(isAdminMiddleware)
			
			rout.Post("/api/book/save", save.New(context.Background(), log, storage, cache))
			rout.Delete("/api/book/{bookID}", deletebyid.New(context.Background(), log, storage))
		})
	})


	log.Info("starting server...", slog.String("address", cfg.HTTPServer.Address))

	done := make(chan os.Signal, 1)
	signal.Notify(done, os.Interrupt, syscall.SIGINT, syscall.SIGTERM)

	srv := &http.Server{
		Addr:         cfg.HTTPServer.Address,
		Handler:      router,
		ReadTimeout:  cfg.HTTPServer.Timeout,
		WriteTimeout: cfg.HTTPServer.Timeout,
		IdleTimeout:  cfg.HTTPServer.IdleTimeout,
	}

	go func() {
		if err := srv.ListenAndServe(); err != nil {
			log.Error("failed to start server")
		}
	}()

	log.Info("server started")

	<-done
	log.Info("stopping server...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Error("failed to stop server", sl.Err(err))
		return
	}

	log.Info("server stopped")
}

func setupLogger(env string) *slog.Logger {
	var log *slog.Logger

	switch env {
	case envLocal:
		log = setupPrettySlog()
	case envDev:
		log = slog.New(
			slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}),
		)
	case envProd:
		log = slog.New(
			slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}),
		)
	}

	return log
}

func setupPrettySlog() *slog.Logger {
	opts := slogpretty.PrettyHandlerOptions{
		SlogOpts: &slog.HandlerOptions{
			Level: slog.LevelDebug,
		},
	}

	handler := opts.NewPrettyHandler(os.Stdout)

	return slog.New(handler)
}