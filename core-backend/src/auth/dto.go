package auth

type AuthRegister struct {
	FirstName string `json:"first_name" binding:"required"`
	LastName  string `json:"last_name" binding:"required"`
	Username  string `json:"username" binding:"required"`
	Email     string `json:"email" binding:"required,email"`
	Password  string `json:"password" binding:"required,min=8"`
}

type AuthRequest struct {
	EmailUsername string `json:"email_username" binding:"required"`
	Password      string `json:"password" binding:"required,min=8"`
}

type AuthUpdate struct {
	FirstName string `json:"first_name" binding:"required"`
	LastName  string `json:"last_name" binding:"required"`
	Username  string `json:"username" binding:"required"`
	Email     string `json:"email" binding:"required,email"`
}

type AuthResponse struct {
	Token string `json:"token"`
	User  any    `json:"user"`
}
