# Genie Backend

A simple Go web server built with Nx.

## Development

Start the development server:

```bash
nx serve genie-backend
```

## Build

Build the application:

```bash
nx build genie-backend
```

## Test

Run the tests:

```bash
nx test genie-backend
```

## API Endpoints

- `GET /health` - Health check endpoint
- `GET /api/*` - API endpoints

## Environment Variables

- `PORT` - Server port (default: 8080)
