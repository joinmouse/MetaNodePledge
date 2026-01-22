package common

import (
	"os"
	"pledge-backend/log"
)

var PlgrAdminPrivateKey string

func GetEnv() {

	var ok bool

	PlgrAdminPrivateKey, ok = os.LookupEnv("plgr_admin_private_key")
	if !ok {
		log.Logger.Warn("plgr_admin_private_key environment variable is not set, price setting functions will be disabled")
		PlgrAdminPrivateKey = ""
	}

}
