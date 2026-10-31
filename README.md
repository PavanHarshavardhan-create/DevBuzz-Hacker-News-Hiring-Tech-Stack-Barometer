# DevBuzz-Hacker-News-Hiring-Tech-Stack-Barometer
DevBuzz turns a small, recent sample of Hacker News “Who is hiring?” posts into a transparent view of technology mentions over time. It is an educational data analytics project for learners and reviewers.

*Status:* In development 

## What it does

- Collects the three most recent monthly hiring threads.
- Cleans top-level job comments and tags a configured set of technologies.
- Computes monthly posting shares in Python.
- Displays the generated data in a static dashboard with a month selector.
- Explains the methodology and sampling limitations.

## Technology

Python 3.11+, Hacker News Firebase API, SQLite, pandas, HTML/CSS/JavaScript, Chart.js, GitHub Pages.

## Getting started

Prerequisites: Git, Python 3.11+, and a modern browser. The repository URL and exact script commands are not recorded in this draft. After confirming the repository, follow the SETUP & INITIALISATION page for environment creation, dependency installation, collection, analysis, and local dashboard review.

## Data and interpretation

“Posting share” means the fraction of eligible top-level comments in a month that mention a canonical technology. It is not unique-company share, job count, hiring probability, salary evidence, or a representative labor-market measure. Hacker News users and employers create a biased sample. Technology matching is rule-based and must be interpreted with the measured validation results.

## Project structure

The proposed layout includes pipeline scripts for collect, clean, alias matching, extraction, and analysis; notebooks for exploration; tests and a labeled sample; docs for static assets and generated JSON; and a local-only data directory for SQLite. Confirm actual paths in the repository.

## Contributing

Use focused branches, review changes with the other teammate, add regression tests, and keep generated output traceable. Do not commit credentials or the local database.

## Acknowledgments

Data source: Hacker News public hiring threads. Link the exact official API documentation and project repository after they are confirmed.
