package components

import (
	"bytes"
	"context"
	"encoding/base64"
	"fmt"
	"io"
	"strings"
	"time"

	"cloud.google.com/go/storage"
	"google.golang.org/api/option"
)

func Base64ToGoogleBlob(base64String *string, bucketName string) (string, error) {

	ctx := context.Background()
	client, err := storage.NewClient(ctx, option.WithCredentialsFile("config/service_account.json"))
	if err != nil {
		return "", err
	}
	defer client.Close()

	//Decode base64 string
	parts := strings.Split(*base64String, ",")
	dataPart := parts[len(parts)-1]
	// mimeType := parts[0]
	decoded, err := base64.StdEncoding.DecodeString(dataPart)
	if err != nil {
		return "", err
	}

	//Upload to Google Cloud Storage
	objectName := "images/" + time.Now().Format("20060102") + "/" + time.Now().Format("150405") + ".png"
	fmt.Println("before writer")
	wc := client.Bucket(bucketName).Object(objectName).NewWriter(ctx)
	fmt.Println("after writer")

	if _, err := io.Copy(wc, bytes.NewReader(decoded)); err != nil {
		fmt.Println("error in uploading image to google cloud storage", err)
		return "", err
	}
	if err := wc.Close(); err != nil {
		fmt.Println("error in closing writer", err)
		return "", err
	}

	// if err := client.Bucket(bucketName).Object(objectName).ACL().Set(ctx, storage.AllUsers, storage.RoleReader); err != nil {
	// 	return "", err
	// }

	publicUrl := fmt.Sprintf("https://storage.googleapis.com/%s/%s", bucketName, objectName)

	return publicUrl, nil
}
