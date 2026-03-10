package components

import (
	"context"
	"fmt"
	"io"
	"net/http"

	authcredentials "cloud.google.com/go/auth/credentials"
	"cloud.google.com/go/storage"
	"google.golang.org/api/option"
)

func UploadToGCS(serviceAccountURL string, bucketName string, fileReader io.Reader, contentType string, destinationName string) (string, int64, error) {

	ctx := context.Background()

	resp, err := http.Get(serviceAccountURL)
	if err != nil {
		return "", 0, fmt.Errorf("failed to download service account json: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", 0, fmt.Errorf("service account json download failed: %d", resp.StatusCode)
	}

	serviceAccountJSON, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", 0, fmt.Errorf("failed to read service account json: %w", err)
	}

	creds, err := authcredentials.DetectDefault(&authcredentials.DetectOptions{
		Scopes:          []string{"https://www.googleapis.com/auth/devstorage.read_write"},
		CredentialsJSON: serviceAccountJSON,
	})
	if err != nil {
		return "", 0, fmt.Errorf("failed to create gcs credentials: %w", err)
	}

	client, err := storage.NewClient(ctx, option.WithAuthCredentials(creds))
	if err != nil {
		return "", 0, fmt.Errorf("failed to create gcs client: %w", err)
	}
	defer client.Close()

	wc := client.Bucket(bucketName).Object(destinationName).NewWriter(ctx)

	if contentType != "" {
		wc.ContentType = contentType
	}

	size, err := io.Copy(wc, fileReader)
	if err != nil {
		_ = wc.Close()
		return "", 0, fmt.Errorf("failed to upload to gcs: %w", err)
	}

	if err := wc.Close(); err != nil {
		return "", 0, fmt.Errorf("failed to close gcs writer: %w", err)
	}

	blobURL := fmt.Sprintf("https://storage.googleapis.com/%s/%s", bucketName, destinationName)

	return blobURL, size, nil
}
