# bash
if [ ! -d "venv" ]; then
  virtualenv venv
fi
# The version in this link must be the same as chrome on your machine
# If this is not working for you sub in the correct link from here https://googlechromelabs.github.io/chrome-for-testing/#stable
curl -L https://storage.googleapis.com/chrome-for-testing-public/123.0.6312.122/linux64/chromedriver-linux64.zip -o chromedriver-linux64.zip && unzip chromedriver-linux64.zip
mv chromedriver-linux64/chromedriver .
rm -r chromedriver-linux64
rm chromedriver-linux64.zip
source venv/bin/activate
pip install -r requirements.txt
python scrape.py
deactivate
