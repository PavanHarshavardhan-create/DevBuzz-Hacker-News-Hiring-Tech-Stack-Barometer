import os
import subprocess
import sys

os.chdir(os.path.dirname(os.path.abspath(__file__)))

STEPS = [
    ("Step 1: Find hiring threads", "data_collection/collect_threads.py"),
    ("Step 2: Download comments", "data_collection/collect_comments.py"),
    ("Step 3: Clean postings", "data_cleaning/clean_postings.py"),
    ("Step 4: Detect technologies", "data_cleaning/detect_technologies.py"),
    ("Step 5: Calculate metrics", "data_cleaning/calculate_metrics.py"),
    ("Step 6a: Bar chart", "visualisation/charts.py"),
    ("Step 6b: Trend chart", "visualisation/trends.py"),
    ("Step 6c: Category chart", "visualisation/category_breakdown.py"),
]


def run_step(label, script_path):
    print(f"\n--- {label} ---")
    result = subprocess.run([sys.executable, script_path], check=False)

    if result.returncode != 0:
        print(f"Error in {script_path} (exit code {result.returncode})")
        sys.exit(1)


def main():
    print("Starting DevBuzz pipeline...")
    for label, script_path in STEPS:
        run_step(label, script_path)
    print("\nPipeline completed successfully.")


if __name__ == "__main__":
    main()
