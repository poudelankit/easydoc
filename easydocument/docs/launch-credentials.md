# Launch Credentials

Create these credentials in the staging and production secret manager before launch. Do not commit real values.

## Backend Runtime

- `DATABASE_URL`: PostgreSQL/PostGIS URL.
- `REDIS_URL`: Redis URL.
- `JWT_SECRET`: strong random signing secret.
- `CORS_ORIGIN`: comma-separated explicit origins.
- `MINIO_ENDPOINT`: object storage endpoint.
- `MINIO_ACCESS_KEY`: object storage access key.
- `MINIO_SECRET_KEY`: object storage secret key.
- `MINIO_BUCKET_KYC`: KYC bucket.
- `MINIO_BUCKET_CHAT`: chat attachment bucket.
- `MINIO_BUCKET_EXPORTS`: export bucket.

## SMS Provider

- `SMS_PROVIDER`: provider name, not `local-mock`.
- `SMS_PROVIDER_API_KEY`: provider API key.
- `SMS_PROVIDER_SENDER_ID`: approved sender ID.
- `SMS_PROVIDER_ENDPOINT`: provider API endpoint when required.

The code has a provider placeholder adapter. Real provider credentials must be injected by the secret manager, not committed.

## Firebase Push

- `PUSH_PROVIDER`: must be `firebase` for staging/production.
- `FIREBASE_PROJECT_ID`: Firebase project ID.
- `FIREBASE_SERVICE_ACCOUNT_SECRET_NAME`: secret-manager path or reference.
- `FIREBASE_SERVICE_ACCOUNT_JSON`: optional injected JSON value from the secret manager.

Do not commit the Firebase service account JSON file or JSON content.

## Maps And Clients

- `GOOGLE_MAPS_API_KEY`: restricted Maps key.
- `ADMIN_API_URL`: API base URL for admin smoke checks.
- `MOBILE_API_URL`: API base URL for mobile release configuration.
- `SOCKET_URL`: Socket.IO base URL.

## GitHub Environments

Use separate GitHub Environments:

- `staging`: `STAGING_*` secrets.
- `production`: unprefixed production secrets.

Require reviewers for production.

