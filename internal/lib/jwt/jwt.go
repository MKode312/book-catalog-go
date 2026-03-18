package jwtValidation

import (
	"book_catalog/internal/domain/models"
	"errors"
	"fmt"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func ValidateToken(tokenString string) error {
	const op = "middleware.Jwt.ValidateToken"
	app_secret, ok := os.LookupEnv("APP_SECRET")
	if !ok {
		return fmt.Errorf("%s: %s", op, "app secret not found")
	}

	_, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("%s: %s", op, "unexpected signing method")
		}
		return []byte(app_secret), nil
	})
	if err != nil {
		return fmt.Errorf("%s: %w", op, err)
	}

	return nil
}

func IsAdmin(tokenString string) (bool, error) {
	const op = "middleware.Jwt.IsAdmin"
	
	appSecret, ok := os.LookupEnv("APP_SECRET")
	if !ok {
		return false, fmt.Errorf("%s: %s", op, "app secret not found")
	}

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("%s: %s", op, "unexpected signing method")
		}
		return []byte(appSecret), nil
	})

	if err != nil {
		return false, fmt.Errorf("%s: %w", op, err)
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		isAdmin, ok := claims["is_admin"].(bool)
		if !ok {
			return false, nil 
		}
		return isAdmin, nil
	}

	return false, fmt.Errorf("%s: %s", op, "invalid token claims")
}

func NewToken(user models.User, duration time.Duration) (string, error) {
	token := jwt.New(jwt.SigningMethodHS256)

	claims := token.Claims.(jwt.MapClaims)
	claims["uid"] = user.ID
	claims["email"] = user.Email
	claims["is_admin"] = user.IsAdmin
	claims["exp"] = time.Now().Add(duration).Unix()

	app_secret, ok := os.LookupEnv("APP_SECRET")
	if !ok {
		return "", errors.New("app_secret not found")
	}

	tokenString, err := token.SignedString([]byte(app_secret))
	if err != nil {
		return "", err
	}

	return tokenString, nil
}
