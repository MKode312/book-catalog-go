package config

import (
	"flag"
	"fmt"
	"os"
	"time"

	"github.com/ilyakaznacheev/cleanenv"
)

type Config struct {
	Env string `yaml:"env" env-default:"local"`
	TokenTTL time.Duration `yaml:"token_ttl" env-default:"20m"`
	HTTPServer `yaml:"http_server"`
	Postgres `yaml:"postgres"`
	Redis `yaml:"redis"`
}

type HTTPServer struct {
	Address string `yaml:"address" env-default:"0.0.0.0:8080"`
	Timeout time.Duration `yaml:"timeout" env-default:"4s"`
	IdleTimeout time.Duration `yaml:"idle_timeout" env-default:"60s"`
}

type Postgres struct {
	Port     int    `yaml:"port" env-required:"true"`
	Name     string `yaml:"name" env-required:"true"`
	User     string `yaml:"user" env-required:"true"`
	Password string `yaml:"password" env-required:"true"`
	Host     string `yaml:"host" env-required:"true"`
	DBurl    string
}

type Redis struct {
	Address string `yaml:"address" env-default:"0.0.0.0:6379"`
	TTL time.Duration `yaml:"ttl" env-default:"5m"`
}

func MustLoad() *Config {
	path := fetchConfigPath()

	if path == "" {
		panic("config path is empty")
	}

	cfg := MustLoadByPath(path)

	cfg.Postgres.DBurl = fmt.Sprintf("postgres://%s:%s@%s:%d/%s?sslmode=disable", cfg.Postgres.User, cfg.Postgres.Password, cfg.Postgres.Host, cfg.Postgres.Port, cfg.Postgres.Name)

	return cfg
}

func MustLoadByPath(configPath string) *Config {
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		panic("config file does not exist: " + configPath)
	}

	var cfg Config

	if err := cleanenv.ReadConfig(configPath, &cfg); err != nil {
		panic("cannot read config: " + err.Error())
	}

	return &cfg
}

func fetchConfigPath() string {
	var res string

	flag.StringVar(&res, "config", "", "path to config file")
	flag.Parse()

	if res == "" {
		res = os.Getenv("CONFIG_PATH")
	}

	return res
}


