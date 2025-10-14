package user

type UserRegisterRequestDto struct {
	FirstName string `json:"first_name" bson:"first_name" validate:"required,min=2,max=50"`
	LastName  string `json:"last_name" bson:"last_name" validate:"required,min=2,max=50"`
	Email     string `json:"email" bson:"email" validate:"required,email"`
	Phone     string `json:"phone" bson:"phone" validate:"required,min=10,max=15"`
	Password  string `json:"password" bson:"password" validate:"required,min=6,max=100"`
}

type UserLoginRequestDto struct {
	Email    string `json:"email" bson:"email" validate:"required,email"`
	Password string `json:"password" bson:"password" validate:"required,min=6,max=100"`
}

type UserGenerateAccessTokenRequestDto struct {
	Email        string `json:"email" bson:"email" validate:"required,email"`
	RefreshToken string `json:"refresh_token" bson:"refresh_token" validate:"required"`
}
