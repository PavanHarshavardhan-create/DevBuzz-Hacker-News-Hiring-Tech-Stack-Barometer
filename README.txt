====================================================================
  DevBuzz Backend — Hacker News Tech Stack Barometer
  Beginner's Guide
====================================================================

WHAT THIS PROJECT DOES
-----------------------
This backend collects, cleans, and visualises data from the official
Hacker News "Ask HN: Who is Hiring?" monthly threads.

It answers these questions from the PRD:
  - Which programming languages and frameworks appear most in job postings?
  - How has demand for each technology changed over the months?
  - What proportion of job postings ask for each category of skill?

Data comes from the official Hacker News Firebase API (free, no key needed).


FOLDER STRUCTURE
-----------------
devbuzz_backend/
│
├── run_pipeline.py               ← Run everything at once
│
├── data_collection/
│   ├── collect_threads.py        ← Step 1: Find monthly hiring threads
│   └── collect_comments.py       ← Step 2: Download job posting comments
│
├── data_cleaning/
│   ├── clean_postings.py         ← Step 3: Clean text, build postings.csv
│   ├── detect_technologies.py    ← Step 4: Find tech mentions → posting_tech.csv
│   └── calculate_metrics.py      ← Step 5: Calculate share % and ranks → monthly_share.csv
│
├── visualisation/
│   ├── charts.py                 ← Step 6a: Bar chart of top technologies
│   ├── trends.py                 ← Step 6b: Line chart of trends over time
│   └── category_breakdown.py     ← Step 6c: Donut chart by category
│
└── data/                         ← All output files go here (auto-created)
    ├── tech_dictionary.csv        ← List of technologies to detect
    ├── thread_ids.json            ← Created by Step 1
    ├── raw_comments_*.json        ← Created by Step 2
    ├── cache/                     ← Cached API responses (speeds up reruns)
    ├── postings.csv               ← Created by Step 3
    ├── posting_tech.csv           ← Created by Step 4
    ├── monthly_share.csv          ← Created by Step 5
    ├── monthly_share.json         ← Created by Step 5 (for dashboard)
    ├── chart_top_techs.png        ← Created by Step 6a
    ├── chart_trends.png           ← Created by Step 6b
    └── chart_categories.png       ← Created by Step 6c


INSTALL REQUIRED PACKAGES (do this once)
-----------------------------------------
Open VS Code terminal (View → Terminal) and run:

  pip install requests pandas matplotlib

  requests  → lets Python talk to the Hacker News API over the internet
  pandas    → lets us work with data tables (like Excel in Python)
  matplotlib→ lets us create charts and graphs


HOW TO RUN
-----------
Option A — Run everything at once:
  python run_pipeline.py

Option B — Run one step at a time (better for learning):
  python data_collection/collect_threads.py
  python data_collection/collect_comments.py
  python data_cleaning/clean_postings.py
  python data_cleaning/detect_technologies.py
  python data_cleaning/calculate_metrics.py
  python visualisation/charts.py
  python visualisation/trends.py
  python visualisation/category_breakdown.py


DATA FLOW DIAGRAM
------------------
Hacker News API
    |
    ↓ collect_threads.py
  thread_ids.json  (list of monthly thread IDs)
    |
    ↓ collect_comments.py
  raw_comments_YYYY-MM.json  (one file per month)
    |
    ↓ clean_postings.py
  postings.csv  (one row per cleaned job posting)
    |
    ↓ detect_technologies.py (uses tech_dictionary.csv)
  posting_tech.csv  (one row per tech found in a posting)
    |
    ↓ calculate_metrics.py
  monthly_share.csv  +  monthly_share.json
    |
    ↓ charts.py / trends.py / category_breakdown.py
  chart_top_techs.png  +  chart_trends.png  +  chart_categories.png


WHAT EACH CSV FILE LOOKS LIKE
-------------------------------
postings.csv
  item_id | thread_id | thread_month | posted_at | text_clean | char_len

posting_tech.csv
  item_id | tech
  (one row per technology found in each job posting)

monthly_share.csv
  thread_month | tech | postings_with_tech | valid_postings
               | posting_share_pct | mention_share_pct | rank


TIPS FOR BEGINNERS
-------------------
- Read the comments in each .py file — they explain WHY each line exists.
- If a step fails, read the red error message carefully — it usually tells you
  exactly what went wrong (most common: package not installed, or previous
  step not run yet).
- The 'cache' folder saves downloaded API responses so re-runs are much faster.
  Do NOT delete this folder while developing.
- Step 2 (downloading comments) can take several minutes the first time
  because there are many months of data to download.
- posting_share_pct can add up to more than 100% across technologies
  because one job post can mention many technologies at the same time.

====================================================================
