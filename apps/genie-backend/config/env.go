package config

var GlobalEnv = map[string]interface{}{
	"PORT": "4000",
	"MONGO_CREDENTIAL": map[string]interface{}{
		"MONGO_DB_HOST":     "localhost",
		"MONGO_DB_PORT":     "27017",
		"MONGO_DB_USER":     "admin",
		"MONGO_DB_PASSWORD": "admin",
		"MONGO_DB_NAME":     "genie",
	},
}
