import os
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import matplotlib.dates as mdates

BASE_DIR = os.path.dirname(__file__)
DATA_DIR = os.path.join(BASE_DIR, "..", "data")
INPUT_FILE = os.path.join(DATA_DIR, "monthly_share.csv")
OUTPUT_FILE = os.path.join(DATA_DIR, "chart_trends.png")
TOP_N_TECHS = 5

LINE_COLORS = ["#E74C3C", "#3498DB", "#2ECC71", "#F39C12", "#9B59B6"]


def create_trends_line_chart():
    if not os.path.exists(INPUT_FILE):
        print("monthly_share.csv not found.")
        return

    df = pd.read_csv(INPUT_FILE)
    df["thread_month"] = pd.to_datetime(df["thread_month"])
    df = df.sort_values("thread_month")

    latest_month = df["thread_month"].max()
    top_techs = (
        df[df["thread_month"] == latest_month]
        .sort_values("posting_share_pct", ascending=False)
        .head(TOP_N_TECHS)["tech"]
        .tolist()
    )

    df_top = df[df["tech"].isin(top_techs)]
    pivot = df_top.pivot_table(
        index="thread_month",
        columns="tech",
        values="posting_share_pct",
        aggfunc="mean"
    )

    fig, ax = plt.subplots(figsize=(12, 6))

    for i, tech in enumerate(top_techs):
        if tech not in pivot.columns:
            continue
        ax.plot(
            pivot.index,
            pivot[tech],
            label=tech,
            color=LINE_COLORS[i % len(LINE_COLORS)],
            linewidth=2,
            marker="o",
            markersize=5
        )

    ax.set_title(f"Technology Trends Over Time (Top {TOP_N_TECHS})")
    ax.set_xlabel("Month")
    ax.set_ylabel("Posting Share (%)")

    ax.xaxis.set_major_formatter(mdates.DateFormatter("%b %Y"))
    plt.xticks(rotation=45, ha="right")
    ax.yaxis.set_major_formatter(mticker.FormatStrFormatter("%.1f%%"))

    ax.legend(title="Technology", loc="upper left")
    ax.grid(True, linestyle="--", alpha=0.5)
    ax.set_axisbelow(True)

    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)

    plt.tight_layout()
    plt.savefig(OUTPUT_FILE, dpi=150, bbox_inches="tight")
    plt.close()

    print(f"Saved trends chart to {OUTPUT_FILE}")


def main():
    create_trends_line_chart()


if __name__ == "__main__":
    main()
