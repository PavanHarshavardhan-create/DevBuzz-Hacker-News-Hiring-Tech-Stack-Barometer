/*
 * SAMPLE REPORT DATA — The example numbers shown when the page first opens.
 *
 * The numbers here keep the page useful before a real report is imported.
 * They are clearly labelled as a sample; the dashboard can also read the CSV
 * and JSON files created by the Python pipeline.
 * Beginner words: an array is an ordered list in [square brackets]; an object
 * is a set of named values in {curly braces}. The month order is shared by the arrays below.
 */
(function () {
  // Each array position matches the same position in months: index 0 is May, index 1 is June, etc.
  const months = ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"];
  const validPosts = [776, 798, 804, 815, 816, 842];

  // EXAMPLE COUNTS — Each technology maps to one list of monthly post counts.
  // A count here means “number of posts mentioning this technology” for that month.
  const technologyCounts = {
    "Python": [237, 249, 257, 260, 269, 288],
    "TypeScript": [192, 205, 218, 230, 238, 251],
    "React": [193, 205, 210, 222, 219, 222],
    "PostgreSQL": [160, 172, 182, 190, 182, 203],
    "AWS": [170, 180, 186, 195, 194, 198],
    "Go": [144, 150, 159, 164, 154, 177],
    "Rust": [76, 82, 91, 102, 113, 157],
    "Docker & Kubernetes": [125, 129, 136, 145, 147, 151],
    "PyTorch / LLM stack": [60, 70, 89, 103, 126, 130],
    "Next.js": [88, 96, 105, 111, 112, 125],
    "Node.js": [105, 107, 111, 115, 115, 121],
    "Redis": [83, 85, 90, 94, 100, 113],
    "Django": [90, 91, 92, 93, 90, 95],
    "Kafka": [49, 54, 57, 65, 69, 74],
    "Vue": [78, 79, 82, 84, 80, 83],
    "Java": [98, 99, 101, 104, 105, 110],
    "FastAPI": [51, 60, 67, 79, 86, 94]
  };

  // CATEGORY LOOKUP — Gives each technology a category for filters and chart colors.
  // This object works like a small dictionary: technology name -> category name.
  const categoryByTechnology = {
    "Python": "language",
    "TypeScript": "language",
    "React": "framework",
    "PostgreSQL": "database",
    "AWS": "infrastructure",
    "Go": "language",
    "Rust": "language",
    "Docker & Kubernetes": "infrastructure",
    "PyTorch / LLM stack": "ai",
    "Next.js": "framework",
    "Node.js": "infrastructure",
    "Redis": "database",
    "Django": "framework",
    "Kafka": "infrastructure",
    "Vue": "framework",
    "Java": "language",
    "FastAPI": "framework"
  };

  // These labels and colors are used by the category chart and its legend.
  const categories = [
    { key: "language", label: "Languages", color: "#f5a05b" },
    { key: "framework", label: "Frameworks", color: "#efcb78" },
    { key: "database", label: "Databases", color: "#93b79b" },
    { key: "infrastructure", label: "Infrastructure", color: "#d98259" },
    { key: "ai", label: "AI / ML", color: "#c59b78" },
    { key: "other", label: "Other", color: "#85868c" }
  ];

  // BUILD REPORT ROWS — Convert the easy-to-edit counts above into the same row format
  // as monthly_share.json. A percentage is count divided by valid posts, then times 100.
  const monthlyShare = [];
  months.forEach(function (month, monthIndex) {
    Object.keys(technologyCounts).forEach(function (technology) {
      const count = technologyCounts[technology][monthIndex];
      const share = (count / validPosts[monthIndex]) * 100;
      monthlyShare.push({
        thread_month: month,
        tech: technology,
        postings_with_tech: count,
        valid_postings: validPosts[monthIndex],
        posting_share_pct: Number(share.toFixed(2)),
        mention_share_pct: 0,
        rank: 0,
        category: categoryByTechnology[technology] || "other"
      });
    });
  });

  // RANKS — Sort each month's technologies from most-mentioned to least-mentioned.
  months.forEach(function (month) {
    const rows = monthlyShare
      .filter(function (row) { return row.thread_month === month; })
      .sort(function (a, b) {
        return b.postings_with_tech - a.postings_with_tech || a.tech.localeCompare(b.tech);
      });
    rows.forEach(function (row, index) { row.rank = index + 1; });
  });

  // EXAMPLE POSTS — Clearly fictional sample cards help demonstrate the hiring-post layout.
  const examplePosts = [
    {
      company: "Orbit Database",
      role: "Senior Data Platform Engineer",
      location: "Remote · Worldwide",
      thread_month: "2026-10",
      date: "2026-10-28T10:00:00Z",
      summary: "Help build dependable storage and replication services for teams running large PostgreSQL workloads. The role focuses on reliable systems, clear operational tooling, and careful performance work.",
      technologies: ["Rust", "PostgreSQL", "Go", "Docker & Kubernetes"],
      kind: "Example post"
    },
    {
      company: "Northstar Compute",
      role: "Infrastructure Engineer",
      location: "Remote · US / Canada",
      thread_month: "2026-10",
      date: "2026-10-24T14:00:00Z",
      summary: "Build fast, predictable infrastructure for data and machine-learning workloads. The team works across cloud services, containers, and Python-based developer tools.",
      technologies: ["Python", "Rust", "AWS", "PyTorch / LLM stack"],
      kind: "Example post"
    },
    {
      company: "Canvas Works",
      role: "Product Engineer",
      location: "Remote · US / Europe",
      thread_month: "2026-10",
      date: "2026-10-19T08:00:00Z",
      summary: "Create collaborative product experiences with a strong focus on speed, accessibility, and a polished web interface. Work across browser features and shared backend services.",
      technologies: ["TypeScript", "React", "Node.js", "PostgreSQL"],
      kind: "Example post"
    },
    {
      company: "Signal Analytics",
      role: "Analytics Engineer",
      location: "Remote · Anywhere",
      thread_month: "2026-10",
      date: "2026-10-15T12:00:00Z",
      summary: "Turn high-volume product events into useful analysis tools. You will improve data pipelines and build reporting features with a practical, developer-friendly stack.",
      technologies: ["Python", "Kafka", "PostgreSQL", "FastAPI"],
      kind: "Example post"
    }
  ];

  // SHARE WITH app.js — window stores values that another browser script can read.
  // These names are the bridge between this sample-data file and the dashboard code.
  window.DEVBUZZ_CATEGORIES = categories;
  window.DEVBUZZ_DEMO_DATA = {
    months: months,
    monthlyShare: monthlyShare,
    categoryByTechnology: categoryByTechnology,
    examplePosts: examplePosts,
    remoteShare: 68.4,
    remotePosts: 576,
    selectedMonth: "2026-10"
  };
}());
