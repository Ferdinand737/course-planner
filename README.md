# Course Planner Web App


## Initial Setup

[Node Version Manager (nvm)](https://github.com/nvm-sh/nvm) is recomended

- Start the Postgres Database in [Docker](https://www.docker.com/get-started):

  ```sh
  npm run docker
  ```

  > **Note:** The npm script will complete while Docker sets up the container in the background. Ensure that Docker has finished and your container is running before proceeding.

- Initial setup:

  ```sh
  npm run setup
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

## Data-Aquisition

### NOT REQUIRED
- **All data required to run the application is included in `courses.csv` in this repository.**
- **Scraping and Parsing is only necessary if we loose the data or want to update course information.**

### Scraping

All course data is scraped from the ubc website directly with the python script found here: `/data-aquisition/scrape.py`

- **Running the script takes over 20 minutes**
- **[Chromedriver](https://googlechromelabs.github.io/chrome-for-testing/#stable) is required**
  - The chromedriver executable must be in the smae folder as `scrape.py`
  - Chromedriver **must** be the same version as chrome on your device (probably latest)
- The script will update `courses.csv` with current courses
- Running this command will set up the environment and start the scraper
  ```bash
  # ~/CoursePlannerWebDS/data-aquisition/
  ./scrape.sh
  ```
  <strong style="color: orange;" >If you are not on UBC campus you will have to login with CWL when chromedriver opens the window</strong>
  - The script has a built in delay of 1 minute to allow you to login before scraping

### Parse Pre-Requisites
OpenAi is used to parse the pre-requisite string using `/data-aquisition/parsePreRequisites.js`

- **Running the script takes over 20 minutes**
- Update `.env` with your OpenAi api key
  - See `.env.example` in the repository
- Running this command will update the `pre_req_json` for each row in `courses.csv`
  ```bash
  # ~/CoursePlannerWebDS/data-aquisition/
  node parsePreRequisites.js
  ```



