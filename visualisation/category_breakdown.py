import os
import pandas as pd
import matplotlib.pyplot as plt

BASE_DIR = os.path.dirname(__file__)
DATA_DIR = os.path.join(BASE_DIR, "..", "data")
SHARE_FILE = os.path.join(DATA_DIR, "monthly_share.csv")
DICT_FILE = os.path.join(DATA_DIR, "tech_dictionary.csv")
OUTPUT_FILE = os.path.join(DATA_DIR, "chart_categories.png")

CATEGORY_COLORS = {
    "language": "#3498DB",
    "framework": "#2ECC71",
    "database": "#E74C3C",
    "cloud": "#F39C12",
    "tool": "#9B59B6",
}


def create_category_donut_chart():
    if not os.path.exists(SHARE_FILE) or not os.path.exists(DICT_FILE):
        print("Required input files not found.")
        return

    share_df = pd.read_csv(SHARE_FILE)
    dict_df = pd.read_csv(DICT_FILE)

    latest_month = share_df["thread_month"].max()
    df_latest = share_df[share_df["thread_month"] == latest_month]

    merged = df_latest.merge(
        dict_df[["tech", "category"]],
        on="tech",
        how="left"
    )
    merged["category"] = merged["category"].fillna("other")

    category_totals = (
        merged.groupby("category")["postings_with_tech"]
        .sum()
        .reset_index()
    )
    category_totals = category_totals.sort_values("postings_with_tech", ascending=False)

    labels = category_totals["category"].str.capitalize().tolist()
    sizes = category_totals["postings_with_tech"].tolist()
    colors = [
        CATEGORY_COLORS.get(cat, "#95A5A6")
        for cat in category_totals["category"].tolist()
    ]

    fig, ax = plt.subplots(figsize=(8, 7))

    wedges, texts, autotexts = ax.pie(
        sizes,
        labels=labels,
        colors=colors,
        autopct="%1.1f%%",
        startangle=90,
        wedgeprops={"width": 0.5, "edgecolor": "white", "linewidth": 2},
        pctdistance=0.75,
    )

    for autotext in autotexts:
        autotext.set_fontsize(10)
        autotext.set_color("white")

    ax.text(0, 0, f"{latest_month}", ha="center", va="center", fontsize=11, fontweight="bold")
    ax.set_title(f"Postings by Category - {latest_month}")

    plt.tight_layout()
    plt.savefig(OUTPUT_FILE, dpi=150, bbox_inches="tight")
    plt.close()

    print(f"Saved category chart to {OUTPUT_FILE}")


def main():
    create_category_donut_chart()


if __name__ == "__main__":
    main()
