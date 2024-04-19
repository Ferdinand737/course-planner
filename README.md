# Course Planner Web App


## Initial Setup

[Node Version Manager (nvm)](https://github.com/nvm-sh/nvm) is recomended.

**Node 21** was used for project creation and development

- Start the mysql Database in [Docker](https://www.docker.com/get-started):

  ```sh
  npm run docker
  ```

  > **Note:** The npm script will complete while Docker sets up the container in the background. Ensure that Docker has finished and your container is running before proceeding.

- Initial setup:

  ```sh
  npm run setup
  ```

- Install packages:

  ```sh
  npm i
  ```

- Run the first build:

  ```sh
  npm run build
  ```

- Start dev server:

  ```sh
  npm run dev
  ```

This starts your app in development mode, rebuilding assets on file changes.

The database seed script creates a new user with some data you can use to get started:

- Email: `user@email.com`
- Password: `password`

## Migrations and Seeding

### Migrations
Whenever you update the `schema.prisma` file you **must** create a migration.

Create and apply a migration with:
  ```bash
  npx prisma migrate dev --name your-migration-name
  ```
### Seeding

Seeder script can be found in `/prisma/seed.ts`.

You can re-seed the database at any time with:
```bash
# Resets database with example data.
npm run seed
```
### [Scraping Guide](scraping.md)
