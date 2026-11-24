import json
import os
import pandas as pd

BASE_DIR = os.path.dirname(__file__)
DATA_DIR = os.path.join(BASE_DIR, "..", "data")
POSTINGS_FILE = os.path.join(DATA_DIR, "postings.csv")
POSTING_TECH_FILE = os.path.join(DATA_DIR, "posting_tech.csv")
OUTPUT_CSV = os.path.join(DATA_DIR, "monthly_share.csv")
OUTPUT_JSON = os.path.join(DATA_DIR, "monthly_share.json")


def calculate_monthly_share(postings_df, posting_tech_df):
    matches = posting_tech_df.drop_duplicates(["item_id", "tech"])
    matches = matches.merge(
        postings_df[["item_id", "thread_month"]],
        on="item_id",
        how="inner"
    )

    # Count postings per month and tech
    counts = (
        matches.groupby(["thread_month", "tech"])["item_id"]
        .nunique()
        .reset_index(name="postings_with_tech")
    )

    # Count total postings per month
    totals = (
        postings_df.groupby("thread_month")["item_id"]
        .nunique()
        .reset_index(name="valid_postings")
    )

    monthly = counts.merge(totals, on="thread_month")

    # Calculate percentage shares
    monthly["posting_share_pct"] = (
        monthly["postings_with_tech"] / monthly["valid_postings"] * 100
    ).round(2)

    monthly["total_tech_matches"] = (
        monthly.groupby("thread_month")["postings_with_tech"].transform("sum")
    )
    monthly["mention_share_pct"] = (
        monthly["postings_with_tech"] / monthly["total_tech_matches"] * 100
    ).round(2)
    monthly = monthly.drop(columns="total_tech_matches")

    # Rank by posting_share_pct descending
    monthly = monthly.sort_values(
        ["thread_month", "posting_share_pct", "tech"],
        ascending=[True, False, True]
    )
    monthly["rank"] = monthly.groupby("thread_month").cumcount() + 1

    return monthly


def main():
    if not os.path.exists(POSTINGS_FILE) or not os.path.exists(POSTING_TECH_FILE):
        print("Required input files not found. Run previous steps first.")
        return

    postings_df = pd.read_csv(POSTINGS_FILE)
    posting_tech_df = pd.read_csv(POSTING_TECH_FILE)

    monthly = calculate_monthly_share(postings_df, posting_tech_df)

    monthly.to_csv(OUTPUT_CSV, index=False)
    monthly.to_json(OUTPUT_JSON, orient="records", indent=2)

    print(f"Calculated metrics for {len(monthly)} rows -> saved to monthly_share.csv and monthly_share.json")


if __name__ == "__main__":
    main()
