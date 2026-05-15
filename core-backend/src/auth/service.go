package auth

import (
	"context"
	"errors"
	"os"
	"time"

	"gin-auth-supabase/src/db"
	"gin-auth-supabase/src/utils"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrEmailNotFound = errors.New("email not found")
	ErrTokenNotFound = errors.New("invalid token")
	ErrTokenExpired  = errors.New("token expired")
	ErrTokenUsed     = errors.New("token used")
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

func (s *Service) VerifyForgotPasswordToken(ctx context.Context, token string) error {
	tokenUUID := uuid.MustParse(token)
	tokenStat, err := s.q.GetForgotPasswordToken(ctx, tokenUUID)
	if err != nil {
		return ErrTokenNotFound
	}
	if tokenStat.Used {
		return ErrTokenUsed
	}
	if tokenStat.Expired.Time.After(time.Now()) {
		return ErrTokenExpired
	}
	return nil
}

func (s *Service) ForgotPassword(ctx context.Context, req ForgotPasswordRequest) error {
	user, err := s.q.GetUserByEmailUsername(ctx, req.Email)
	if err != nil {
		return ErrEmailNotFound
	}

	token, err := s.q.CreateForgotPasswordToken(ctx, user.ID)
	if err != nil {
		return errors.New("failed to create token")
	}

	err = utils.SendEmail(user.Email, token.Token.String())
	if err != nil {
		return errors.New("failed to send token")
	}

	return nil
}
