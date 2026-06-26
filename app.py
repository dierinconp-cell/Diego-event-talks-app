from flask import Flask, render_template, jsonify
import requests
from bs4 import BeautifulSoup
import warnings
from bs4 import XMLParsedAsHTMLWarning
import time

# Ignore the XML warning from BeautifulSoup
warnings.filterwarnings("ignore", category=XMLParsedAsHTMLWarning)

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache to prevent constant fetching and speed up API responses
cache = {
    "data": None,
    "last_fetched": 0
}
CACHE_DURATION_SECONDS = 300  # 5 minutes cache

def fetch_and_parse_releases():
    """Fetches the Google BigQuery release notes Atom feed and parses it.
    Splits each daily entry's content into separate release items grouped by <h3> tags.
    """
    try:
        response = requests.get(FEED_URL, timeout=10)
        response.raise_for_status()
    except Exception as e:
        print(f"Error fetching feed: {e}")
        # If fetch fails but we have cached data, return the cache
        if cache["data"] is not None:
            return cache["data"]
        return []

    soup = BeautifulSoup(response.content, "html.parser")
    entries = soup.find_all("entry")
    
    parsed_items = []
    for entry in entries:
        # Extract the date from the <title> or <updated> tags
        title_tag = entry.find("title")
        date_str = title_tag.text.strip() if title_tag else "Unknown Date"
        
        # Extract the source link
        link_tag = entry.find("link")
        link_url = ""
        if link_tag:
            link_url = link_tag.get("href") or link_tag.get("url") or ""
            
        content_tag = entry.find("content")
        if not content_tag:
            continue
            
        content_html = content_tag.text
        content_soup = BeautifulSoup(content_html, "html.parser")
        
        # Google release notes format: multiple <h3> tags per day
        h3_tags = content_soup.find_all("h3")
        
        if h3_tags:
            for h3 in h3_tags:
                note_type = h3.text.strip()
                
                # Extract all subsequent siblings until the next <h3>
                sibling_html = []
                sibling = h3.find_next_sibling()
                while sibling and sibling.name != "h3":
                    sibling_html.append(str(sibling))
                    sibling = sibling.find_next_sibling()
                
                item_content = "".join(sibling_html)
                
                parsed_items.append({
                    "date": date_str,
                    "link": link_url,
                    "type": note_type,
                    "content": item_content
                })
        else:
            # Fallback when there are no <h3> tags in the content
            parsed_items.append({
                "date": date_str,
                "link": link_url,
                "type": "Announcement",
                "content": content_html
            })
            
    # Update cache
    cache["data"] = parsed_items
    cache["last_fetched"] = time.time()
    return parsed_items

@app.route('/')
def index():
    """Renders the main dashboard index page."""
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    """API endpoint returning the parsed release notes as JSON.
    Uses cached data if it's within the CACHE_DURATION_SECONDS.
    """
    current_time = time.time()
    # Cache hit check
    if cache["data"] is not None and (current_time - cache["last_fetched"] < CACHE_DURATION_SECONDS):
        return jsonify(cache["data"])
        
    releases = fetch_and_parse_releases()
    return jsonify(releases)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
