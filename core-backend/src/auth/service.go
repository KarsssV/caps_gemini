package auth

import (
	"context"
	"errors"
	"os"
	"time"

	"gin-auth-supabase/src/db"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type Service struct {
	q *db.Queries
}

func NewService(q *db.Queries) *Service {
	return &Service{q: q}
}

func (s *Service) Register(ctx context.Context, req AuthRegister) (*db.User, error) {
	hashed, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)

	user, err := s.q.CreateUser(ctx, db.CreateUserParams{
		Username:  req.Username,
		Email:     req.Email,
		Password:  string(hashed),
		FirstName: req.FirstName,
		LastName:  req.LastName,
	})
	return &user, err
}

func (s *Service) Login(ctx context.Context, req AuthRequest) (string, *db.User, error) {
	user, err := s.q.GetUserByEmailUsername(ctx, req.EmailUsername)
	if err != nil {
		return "", nil, errors.New("user not found")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		return "", nil, errors.New("invalid credentials")
	}

	// Sign JWT
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":      user.ID,
		"username": user.Username,
		"exp":      time.Now().Add(time.Hour * 24).Unix(),
	})

	tokenString, _ := token.SignedString([]byte(os.Getenv("JWT_SECRET")))
	return tokenString, &user, nil
}

func (s *Service) Update(ctx context.Context, req AuthUpdate, userId uuid.UUID) (*db.User, error) {

	user, err := s.q.UpdateUser(ctx, db.UpdateUserParams{
		ID:        userId,
		FirstName: req.FirstName,
		LastName:  req.LastName,
		Username:  req.Username,
		Email:     req.Email,
	})
	return &user, err
}

func (s *Service) Request(ctx context.Context, userId uuid.UUID) (*db.User, error) {
	user, err := s.q.GetUserById(ctx, userId)
	if err != nil {
		return nil, errors.New("user not found")
	}

	return &user, nil
}
