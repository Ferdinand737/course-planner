@echo off
REM Check if the virtual environment directory exists
IF NOT EXIST "venv" (
    virtualenv venv
)
REM The version in this link must be the same as chrome on your machine
REM If this is not working for you sub in the correct link from here https://googlechromelabs.github.io/chrome-for-testing/#stable
REM Downloading the chromedriver
curl -L https://storage.googleapis.com/chrome-for-testing-public/123.0.6312.122/win64/chromedriver-win64.zip -o chromedriver-win64.zip

REM Extracting the chromedriver
powershell -command "Expand-Archive -Path chromedriver-win64.zip -DestinationPath ."

REM Move chromedriver.exe to the current directory and cleanup
move chromedriver-win64\chromedriver.exe .
rmdir /s /q chromedriver-win64
del chromedriver-win64.zip

REM Activate the virtual environment
call venv\Scripts\activate

REM Install required Python packages
pip install -r requirements.txt

REM Run the Python script
python scrape.py

REM Deactivate the virtual environment and end the batch file execution
call venv\Scripts\deactivate