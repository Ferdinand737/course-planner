### Scraping

All course data is scraped from the ubc website directly with the python script found here: `/scraper/scrape.py`

- **Running the script takes over 20 minutes**
- **[Chromedriver](https://googlechromelabs.github.io/chrome-for-testing/#stable) is required**
  - The chromedriver executable must be in the same folder as `scrape.py`
  - Chromedriver **must** be the same version as chrome on your device (probably latest)
- The script will create a file `courses.csv` with current courses
- Running this command will set up the environment and start the scraper
- The script will download chromedriver and set up the virtual environment for you
  ```bash
  # Linux
  # ~/CoursePlannerWebDS/scraper/
  ./scrape.sh
  ```
    ```bash
  # Windows
  # ~/CoursePlannerWebDS/scraper/
  scrape.bat
  ```
  <strong style="color: orange;" >If you are not on UBC campus you will have to login with CWL when chromedriver opens the window</strong>
  - The script has a built in delay of 1 minute to allow you to login before scraping