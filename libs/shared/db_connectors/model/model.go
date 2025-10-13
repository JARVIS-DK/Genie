package model

import "time"

type User struct {
	Id                  int                    `json:"id" bson:"_id"`
	FirstName           string                 `json:"first_name" bson:"first_name"`
	LastName            string                 `json:"last_name" bson:"last_name"`
	Email               string                 `json:"email" bson:"email"`
	Phone               string                 `json:"phone" bson:"phone"`
	Password            string                 `json:"password" bson:"password"`
	IsUserBlocked       bool                   `json:"is_user_blocked" bson:"is_user_blocked"`
	BlockedTill         time.Time              `json:"blocked_till" bson:"blocked_till"`
	SubscriptionType    string                 `json:"subscription_type" bson:"subscription_type"`
	Wallet              map[string]interface{} `json:"wallet" bson:"wallet"`
	IsPasswordAvailable bool                   `json:"is_password_available" bson:"is_password_available"`
}
