### Scraping

All course data is scraped from the ubc website directly with the python script found here: `/scraper/scrape.py`

- **Running the script takes over 20 minutes**
- The script will create a file `courses.csv` with current courses

<br>
<strong style="color: orange;" >If you are not on UBC campus you will have to login with CWL when chromedriver opens the window</strong>
  
  - The script has a built in delay of 1 minute to allow you to login before scraping


### Automatic Script
  ```bash
  # Linux
  # ~/CoursePlannerWebDS/scraper/
  ./scrape.sh
  ```

  ```bash
  # Windows (untested)
  # ~/CoursePlannerWebDS/scraper/
  scrape.bat
  ```

### Manual
**If you have any issues with the automatic script follow these steps**
1. **Chromedriver**
    - Chromedriver can be downloaded [here](https://googlechromelabs.github.io/chrome-for-testing/#stable)
    - Chromedriver **must** be the same version as chrome on your device (probably latest)
    - Extract the zip file and place chromedriver executable in `scraper` folder

2. **Virtual Environment**
    - Install [virtualenv](https://pypi.org/project/virtualenv/)
      ```
      pip install virtualenv
      ```
    - Create virtual environment in `/scraper/` and install dependancies

      Linux/MacOS
      ```bash
      # ~/CoursePlannerWebDS/scraper/
      source venv/bin/activate
      pip install -r requirements.txt
      ```
      Windows
      ```bash
      # ~/CoursePlannerWebDS/scraper/
      virtualenv venv
      . venv\Scripts\activate
      pip install -r requirements.txt
      ```
3. **Run Scraper**
    ```
    python scrape.py
    ```