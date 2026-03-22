package rediscache

import (
	"book_catalog/internal/domain/models"
	"book_catalog/internal/storage"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

type Cache struct {
	client *redis.Client
	ttl time.Duration
}

func New(ctx context.Context, addr string, cacheTTL time.Duration) (*Cache, error) {
	const op = "storage.redis.New"

	client := redis.NewClient(&redis.Options{
		Addr: addr,
	})

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}

	return &Cache{
		client: client,
		ttl: cacheTTL,
	}, nil
}

func (c *Cache) SaveBook(ctx context.Context, book models.Book) (err error) {
	const op = "storage.redis.SetBook"

	data, err := json.Marshal(book)
	if err != nil {
		return fmt.Errorf("%s: marshal: %w", op, err)
	}

	pipe := c.client.Pipeline()

	pipe.Set(ctx, fmt.Sprintf("book:id:%s", book.ID), data, c.ttl)

	pipe.Set(ctx, fmt.Sprintf("book:title:%s", book.Title), data, c.ttl)

	_, err = pipe.Exec(ctx)
	if err != nil {
		return fmt.Errorf("%s: %w", op, err)
	}

	return nil
}

func (c *Cache) GetBookByID(ctx context.Context, id string) (book models.Book, err error) {
	const op = "storage.redis.GetBook"

	val, err := c.client.Get(ctx, fmt.Sprintf("book:id:%s", id)).Result()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			return models.Book{}, fmt.Errorf("%s: %w", op, storage.ErrBookNotFound)
		}
		return models.Book{}, fmt.Errorf("%s: %w", op, err)
	}

	if err := json.Unmarshal([]byte(val), &book); err != nil {
		return models.Book{}, fmt.Errorf("%s: unmarshal: %w", op, err)
	}
	
	return book, nil
}

func (c *Cache) GetBookByTitle(ctx context.Context, title string) (book models.Book, err error) {
	const op = "storage.redis.GetBookByTitle"

	key := fmt.Sprintf("book:title:%s", title)

	val, err := c.client.Get(ctx, key).Result()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			return models.Book{}, fmt.Errorf("%s: %w", op, storage.ErrBookNotFound)
		}
		return models.Book{}, fmt.Errorf("%s: %w", op, err)
	}

	if err := json.Unmarshal([]byte(val), &book); err != nil {
		return models.Book{}, fmt.Errorf("%s: unmarshal: %w", op, err)
	}

	return book, nil
}

func (c *Cache) DeleteBookByID(ctx context.Context, id string) (success bool, err error) {
	const op = "storage.redis.DeleteBookByID"

	if err = c.client.Del(ctx, fmt.Sprintf("book:%s", id)).Err(); err != nil {
		return false, fmt.Errorf("%s: %w", op, err)
	}

	return true, nil
}

