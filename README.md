# BigQuery Release Notes Dashboard

A clean, premium web application that monitors Google BigQuery release notes in real-time, allowing users to search, filter, and share specific platform updates directly to X (Twitter) with automated link-sensitive character count limits.

## Quick Start

Get the application running locally in three steps:

1. **Set up virtual environment & dependencies:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install flask requests beautifulsoup4
   ```

2. **Run the Flask server:**
   ```bash
   python app.py
   ```

3. **Verify in your browser:**
   Open [http://localhost:5001](http://localhost:5001) to explore the dashboard.

## Technical Details

| Component | Responsibility / Design Choice |
| :--- | :--- |
| **Backend (`app.py`)** | Flask proxy that fetches Google's Atom feed, avoiding CORS. Uses BeautifulSoup to segment compound daily entries by `<h3>` tags into individual items. |
| **Caching** | 5-minute memory cache (`CACHE_DURATION_SECONDS = 300`) to prevent redundant external network requests and stay within rate limits. |
| **Frontend (`index.html` / `app.js`)** | Glassmorphic dark-mode dashboard with instantaneous in-memory filter chips (Features, Changes, Deprecations, Announcements) and keyword search. |
| **X/Twitter Modal** | Handles custom tweet compilation. Employs regex to substitute URLs with a fixed 23-character count (matching standard `t.co` wrapper weight) for precise constraint validation. |

## Verification Checklist

- [ ] Fetch releases dynamically from Google Cloud's BigQuery feed.
- [ ] Render skeletons while data is loading.
- [ ] Filter updates in real-time by search queries and category buttons.
- [ ] Open the X/Twitter share modal with pre-formatted summaries.
- [ ] Block sharing and display error warning if character count exceeds 280 (with links normalized).

## License

This project is licensed under the Apache-2.0 License.
