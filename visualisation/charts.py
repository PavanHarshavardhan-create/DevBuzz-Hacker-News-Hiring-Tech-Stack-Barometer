import os
import pandas as pd
import matplotlib.pyplot as plt

BASE_DIR = os.path.dirname(__file__)
DATA_DIR = os.path.join(BASE_DIR, "..", "data")
INPUT_FILE = os.path.join(DATA_DIR, "monthly_share.csv")
OUTPUT_FILE = os.path.join(DATA_DIR, "chart_top_techs.png")
TOP_N = 10


def create_top_techs_bar_chart():
    if not os.path.exists(INPUT_FILE):
        print("monthly_share.csv not found.")
        return

    df = pd.read_csv(INPUT_FILE)
    latest_month = df["thread_month"].max()

    df_latest = df[df["thread_month"] == latest_month]
    df_top = df_latest.sort_values("posting_share_pct", ascending=False).head(TOP_N)
    df_top = df_top.sort_values("posting_share_pct", ascending=True)

    technologies = df_top["tech"].tolist()
    shares = df_top["posting_share_pct"].tolist()

    fig, ax = plt.subplots(figsize=(10, 6))

    bars = ax.barh(technologies, shares, color="#4A90E2", edgecolor="#2C5F8A")

    for bar, value in zip(bars, shares):
        ax.text(
            value + 0.3,
            bar.get_y() + bar.get_height() / 2,
            f"{value:.1f}%",
            va="center",
            fontsize=9
        )

    ax.set_xlabel("Posting Share (%)")
    ax.set_ylabel("Technology")
    ax.set_title(f"Top {TOP_N} Technologies - {latest_month}")
    ax.xaxis.grid(True, linestyle="--", alpha=0.5)
    ax.set_axisbelow(True)

    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)

    plt.tight_layout()
    plt.savefig(OUTPUT_FILE, dpi=150, bbox_inches="tight")
    plt.close()

    print(f"Saved bar chart to {OUTPUT_FILE}")


def main():
    create_top_techs_bar_chart()


if __name__ == "__main__":
    main()
