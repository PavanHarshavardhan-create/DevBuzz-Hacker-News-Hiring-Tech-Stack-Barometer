# DevBuzz — beginner guide

DevBuzz is a small, responsive Hacker News hiring dashboard built with plain HTML, CSS, and JavaScript. Chart.js draws its charts. There is no bundler or front-end framework to learn first.

## Open the website

The page can open as a file:

1. Open Devv_Buzz.html in a browser.
2. The sample report will appear immediately.

To let the dashboard also look for a generated backend report, serve the project folder over a local web server. In VS Code, open a terminal at the project folder and run:

    python -m http.server 8000

Then open http://localhost:8000/Frontend/Devv_Buzz.html.

Chart.js is loaded from jsDelivr, so an internet connection is needed for the charts. The rest of the dashboard and the demo data are local.

## Files at a glance

| File | What it does |
| --- | --- |
| Devv_Buzz.html | Page structure, accessible controls, chart canvases, and page sections. |
| styles.css | DevBuzz's graphite, ember, and brass visual system, layout, and responsive breakpoints. |
| app.js | Imports data, calculates the visible metrics, draws Chart.js charts, and wires up the controls. |
| data.js | Small example dataset used when no real report has been imported. |
| assets/lucide-icons.js | Lucide SVG icons from the local icon plugin. |
| assets/LUCIDE-LICENSE.txt | License for the bundled Lucide icons. |

The interface uses a graphite base with ember and brass accents, compact report labels, a narrow navigation rail, and a restrained serif headline. Its visual identity and report controls are specific to DevBuzz.

## Connect the backend folder

The dashboard looks for the backend files in the project folder named **devbuzz_backend only 2026**:

- data/monthly_share.json or data/monthly_share.csv for charts and rankings.
- data/postings.csv for the source text in the hiring feed.
- data/posting_tech.csv for the technology tags on each post.
- data/tech_dictionary.csv for technology categories.

The report outputs are created by the Python pipeline. Open a second terminal at the project root and run:

    cd "devbuzz_backend only 2026"
    python run_pipeline.py

When the pipeline finishes, return to the dashboard and click **Refresh data**. The page will fetch the output files from the backend folder, update the charts and leaderboard, and show imported job posts. If you open the page as a file, use **Import data** to select the generated report files instead; browsers restrict file-to-file reads.

The backend does not provide structured company, role, salary, or work-mode fields. Hiring-feed headings infer company and role labels from recognizable post headers or role phrases; if no role is clear, the heading uses detected technologies or a general opportunity label. These are display labels inferred from public post text, not backend fields. When `postings.csv` includes post text, the dashboard estimates remote, on-site, hybrid, and unspecified shares from phrases in that text. These are heuristic estimates, not backend classifications; reports with monthly metrics only and no post text cannot show them. The collector currently filters out threads older than 2026.

### Current 2026 report

The generated report currently covers the January through November 2026 Hacker News “Who is Hiring” threads. November is a partial month because the current-month thread is still active. This snapshot contains 3,137 cleaned hiring posts and 6,894 technology matches. The dashboard selects the latest available month and opens its trend chart in the 1Y range, so all available 2026 months appear together.

## How the numbers work

For a technology such as Python:

    post share = distinct job posts that mention Python
                 ÷ all valid job posts in that month
                 × 100

If Python is in 288 of 842 posts, its post share is 288 ÷ 842 × 100 = 34.2%. A post can mention Python, PostgreSQL, and AWS together. That is why technology percentages can add up to more than 100%.

The month-over-month change is the difference between two post-share percentages. If Rust rises from 13.8% to 18.6%, that is an increase of 4.8 percentage points (pp).

## How to explain the project

> “DevBuzz is a small market-research dashboard for public Hacker News hiring posts. A Python pipeline collects and cleans the posts, matches technology names from a dictionary, and writes monthly CSV and JSON summaries. The front end reads that report, lets a user compare months and technology categories, and uses Chart.js to show trends. I separated the page structure, styles, sample data, and behavior so I can update one part without rewriting the whole page.”

## Main JavaScript pieces

- renderAll() refreshes the visible dashboard after the month or data changes.
- updateKpis() shows the most-mentioned and second-ranked technologies by selected-month post share.
- drawTrendChart() and drawMixChart() create or update the Chart.js charts.
- renderWorkMode() groups imported post text into phrase-based work-mode estimates for the selected month.
- The report context strip shows the selected month, valid-post count, data source, and local load time.
- The separate Stack Comparison block below the Technology Matrix shows only technologies the reader adds, sorted by selected-month post share.
- The chart uses the currently loaded report metrics, including backend data refreshed from the generated report files. Adding a technology updates that block without filtering the matrix or hiring feed.
- renderTable() filters and paginates the technology list.
- parseCSV() reads quoted CSV fields, including commas inside post text.
- importSelectedFiles() recognizes the backend’s report and intermediate CSV files.

The sample figures are examples, not live market statistics. The website reads the backend's generated files directly; no extra server or database is needed beyond serving the project folder so the browser can read those files.
