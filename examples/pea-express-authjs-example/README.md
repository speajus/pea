
# Pea Express Auth Example

This is an example project demonstrating how to use [@speajus/pea](https://github.com/speajus/pea) with Express and [@auth/express](https://www.npmjs.com/package/@auth/express) for GitHub OAuth authentication.

⚠️ **Note**: This is experimental code and not intended for production use. The API and implementation details may change significantly.

## Prerequisites

- Node.js >= 18
- pnpm
- A GitHub account
- SQLite

## Setup

1. Clone the repository and install dependencies:
```bash
pnpm install
```

2. Create a GitHub OAuth App:
   - Go to [GitHub Developer Settings](https://github.com/settings/developers)
   - Click "New OAuth App"
   - Fill in the following:
     - Application name: `Pea Express Example` (or your preferred name)
     - Homepage URL: `http://localhost:3000`
     - Authorization callback URL: `http://localhost:3000/auth/callback/github`
   - Click "Register application"
   - Copy your Client ID and generate a Client Secret

3. Create a `.env.local` file in the project root:
```env
DATABASE_URL=file:local.db
DATABASE_AUTH_TOKEN=""
AUTH_SECRET=your_random_secret_here
AUTH_GITHUB_ID=your_github_client_id
AUTH_GITHUB_SECRET=your_github_client_secret
```

4. Start the development server:
```bash
tsx src/index.ts
```

5. Visit `http://localhost:3000` in your browser

## Features

- GitHub OAuth authentication
- Session management
- SQLite database with Drizzle ORM
- TypeScript support

## Project Structure

- `src/`
  - `index.ts` - Express server setup
  - `auth.config.ts` - Auth configuration
  - `auth.route.ts` - Auth routes
  - `db/` - Database schema and configuration
- `views/` - EJS templates
- `drizzle.config.ts` - Drizzle ORM configuration

## Contributing

This is an example project demonstrating [@speajus/pea](https://github.com/speajus/pea) features. If you find bugs or have suggestions, please open an issue in the main repository.

## License

ISC
