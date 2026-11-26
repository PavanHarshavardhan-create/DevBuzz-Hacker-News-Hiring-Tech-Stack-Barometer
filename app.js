/*
 * DevBuzz dashboard behaviour.
 *
 * Beginner guide: this file reads report data, responds to clicks and typing,
 * and updates the HTML. Each function handles one job so features are easier to find.
 * New words: DOM means the browser's live version of the HTML; state is the current
 * set of selections and data; event listener is code waiting for a click or change.
 * async/await lets file and network work finish before the next step. A Promise is
 * the browser's “result will arrive later” value. Map/Set store keyed or unique items.
 * Feature map: 01 sidebar, 03 tech filter, 04 KPI bars, 05 trend chart,
 * 06 backend loading.
 * Each FEATURE block targets its named Devv_Buzz.html controls only.
 */
(function () {
  "use strict";

  // SETUP — Load the sample data and fixed display choices shared by the dashboard.
  // const names a value that will not be reassigned; arrays hold ordered lists.
  const DEMO = window.DEVBUZZ_DEMO_DATA;
  const CATEGORY_INFO = window.DEVBUZZ_CATEGORIES || [];
  const PAGE_SIZE = 10;
  const POST_PAGE_SIZE = 4;
  const LINE_COLORS = ["#f5a05b", "#efcb78", "#df7956", "#93b79b", "#c59b78", "#a8b1a5"];

  // STATE — One place for values that change when the reader filters or imports data.
  // Updating this object lets the render functions redraw several sections consistently.
  const state = {
    metrics: DEMO.monthlyShare.slice(),
    posts: DEMO.examplePosts.slice(),
    selectedMonth: DEMO.selectedMonth,
    trendCategory: "language",
    rangeMonths: 12,
    tableCategory: "all",
    tableSearch: "",
    globalSearch: "",
    tablePage: 1,
    preferredTechnologies: [],
    postSort: "newest",
    postsLimit: POST_PAGE_SIZE,
    isDemo: true,
    backendConnected: false,
    remoteStatsByMonth: null,
    lastLoadedAt: new Date(),
    categoryByTech: Object.assign({}, DEMO.categoryByTechnology),
    lineChart: null,
    mixChart: null,
    toastTimer: null
  };

  // HTML LOOKUP — Keep references to the controls and empty containers that JavaScript fills.
  // document.getElementById finds the element with that unique HTML id.
  const elements = {
    monthSelect: document.getElementById("monthSelect"),
    techStackForm: document.getElementById("techStackForm"),
    techStackSearch: document.getElementById("techStackSearch"),
    techStackOptions: document.getElementById("techStackOptions"),
    refreshBackendButton: document.getElementById("refreshBackendButton"),
    trendCategory: document.getElementById("trendCategory"),
    tableBody: document.getElementById("techTableBody"),
    stackBarChart: document.getElementById("stackBarChart"),
    stackChartEmpty: document.getElementById("stackChartEmpty"),
    stackChartSummary: document.getElementById("stackChartSummary"),
    tableEmpty: document.getElementById("tableEmpty"),
    tableSummary: document.getElementById("tableSummary"),
    pageIndicator: document.getElementById("pageIndicator"),
    previousPage: document.getElementById("previousPage"),
    nextPage: document.getElementById("nextPage"),
    jobGrid: document.getElementById("jobGrid"),
    feedEmpty: document.getElementById("feedEmpty"),
    loadMore: document.getElementById("loadMore"),
    globalSearch: document.getElementById("globalSearch"),
    tableSearch: document.getElementById("tableSearch"),
    postSort: document.getElementById("postSort"),
    importDialog: document.getElementById("importDialog"),
    dataFiles: document.getElementById("dataFiles"),
    selectedFiles: document.getElementById("selectedFiles"),
    toast: document.getElementById("toast"),
    dataBadge: document.getElementById("dataBadge"),
    dataBadgeText: document.getElementById("dataBadgeText")
  };

  // ICON HELPERS — Replace data-icon placeholders with bundled SVG drawings.
  // SVG is a small text format for sharp vector images; the icon is decorative for screen readers.
  function icon(name, extraClass) {
    const library = window.DEVBUZZ_LUCIDE_ICONS || {};
    const svg = library[name] || (name === "map-pin"
      ? '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>'
      : "");
    if (!svg) return "";
    const className = extraClass ? "icon " + extraClass : "icon";
    return svg.replace("<svg", '<svg class="' + className + '" aria-hidden="true" focusable="false"');
  }

  function renderIconPlaceholders(root) {
    const scope = root || document;
    scope.querySelectorAll("[data-icon]").forEach(function (node) {
      node.innerHTML = icon(node.getAttribute("data-icon"));
    });
  }

  // TEXT AND NUMBER HELPERS — Keep imported text safe and format values for people.
  // Escaping changes HTML-significant characters into plain text so imported data cannot become markup.
  function escapeHTML(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function numberValue(value) {
    const number = Number(String(value == null ? "" : value).replace(/,/g, ""));
    return Number.isFinite(number) ? number : 0;
  }

  function formatNumber(value) {
    return Math.round(numberValue(value)).toLocaleString();
  }

  function formatPercent(value, digits) {
    return numberValue(value).toFixed(digits == null ? 1 : digits) + "%";
  }

  function monthLabel(monthKey) {
    const parts = String(monthKey || "").split("-");
    if (parts.length < 2) return monthKey || "Unknown month";
    const date = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
    return date.toLocaleDateString("en", { month: "long", year: "numeric" });
  }

  // DATA HELPERS — Find months, rows, and categories in one consistent way.
  // Normalizing means converting different source spellings into one standard label.
  function monthsInData() {
    return Array.from(new Set(state.metrics.map(function (row) { return row.thread_month; })))
      .filter(Boolean)
      .sort();
  }

  function currentMonthRows() {
    return state.metrics.filter(function (row) { return row.thread_month === state.selectedMonth; });
  }

  function getCategory(technology, rowCategory) {
    return normalizeCategory(rowCategory || state.categoryByTech[technology]);
  }

  function normalizeCategory(value) {
    const label = String(value || "").toLowerCase();
    if (label.indexOf("language") >= 0) return "language";
    if (label.indexOf("framework") >= 0) return "framework";
    if (label.indexOf("database") >= 0 || label.indexOf("storage") >= 0) return "database";
    if (label.indexOf("ai") >= 0 || label.indexOf("machine") >= 0 || label === "ml") return "ai";
    if (label.indexOf("cloud") >= 0 || label.indexOf("infra") >= 0 || label.indexOf("devops") >= 0 ||
        label.indexOf("tool") >= 0 || label.indexOf("runtime") >= 0) return "infrastructure";
    return "other";
  }

  function categoryLabel(category) {
    const match = CATEGORY_INFO.find(function (item) { return item.key === category; });
    if (match) return match.label;
    return category.charAt(0).toUpperCase() + category.slice(1);
  }

  function categoryColor(category) {
    const match = CATEGORY_INFO.find(function (item) { return item.key === category; });
    return match ? match.color : "#85868c";
  }

  function themeColor(property, fallback) {
    return getComputedStyle(document.documentElement).getPropertyValue(property).trim() || fallback;
  }

  // MONTH-TO-MONTH COMPARISON — Used by the KPI cards, table, and insight message.
  // A delta is the difference between two values; “pp” means percentage points.
  function previousMonthKey(monthKey) {
    const parts = String(monthKey || "").split("-");
    if (parts.length !== 2) return "";
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return "";
    const previous = new Date(year, month - 2, 1);
    return previous.getFullYear() + "-" + String(previous.getMonth() + 1).padStart(2, "0");
  }

  function metricFor(technology, monthKey) {
    return state.metrics.find(function (row) {
      return row.tech === technology && row.thread_month === monthKey;
    });
  }

  function monthDelta(technology) {
    const previous = previousMonthKey(state.selectedMonth);
    if (!previous || !monthsInData().includes(previous)) return null;
    const current = metricFor(technology, state.selectedMonth);
    const old = metricFor(technology, previous);
    if (!current) return null;
    return numberValue(current.posting_share_pct) - (old ? numberValue(old.posting_share_pct) : 0);
  }

  /* FEATURE 04 — Draw the small history bars in each KPI card.
     Why: a short bar series shows how the selected measure moved across months.
     The HTML data-kpi-bars attribute is a hook (a named connection point) for this code.
     Each <i> is one bar; CSS reads its --bar-height custom property. */
  function renderKpiBars(name, months, values, valueLabel, seriesLabel) {
    const container = document.querySelector('[data-kpi-bars="' + name + '"]');
    if (!container) return;

    const available = values.filter(function (value) { return Number.isFinite(value); });
    const maxValue = Math.max(1, ...available);
    container.innerHTML = months.map(function (month, index) {
      const value = values[index];
      const hasValue = Number.isFinite(value);
      const height = hasValue ? Math.max(3, Math.round((value / maxValue) * 19)) : 2;
      const classes = [hasValue ? "" : "is-empty", index === months.length - 1 ? "is-current" : ""]
        .filter(Boolean).join(" ");
      const label = monthLabel(month) + " · " + (hasValue ? valueLabel(value) : "no monthly data");
      return '<i' + (classes ? ' class="' + classes + '"' : "") +
        ' style="--bar-height:' + height + 'px" title="' + escapeHTML(label) + '" aria-hidden="true"></i>';
    }).join("");
    container.setAttribute("role", "img");
    container.setAttribute("aria-label", seriesLabel + ": " + months.map(function (month, index) {
      return monthLabel(month) + " " + (Number.isFinite(values[index]) ? valueLabel(values[index]) : "no monthly data");
    }).join("; "));
  }

  function totalPostsForMonth(month) {
    const rows = state.metrics.filter(function (row) { return row.thread_month === month; });
    return rows.length ? numberValue(rows[0].valid_postings) : null;
  }

  function colorWithAlpha(hexColor, alpha) {
    const match = /^#([0-9a-f]{6})$/i.exec(hexColor);
    if (!match) return hexColor;
    const value = match[1];
    const red = parseInt(value.slice(0, 2), 16);
    const green = parseInt(value.slice(2, 4), 16);
    const blue = parseInt(value.slice(4, 6), 16);
    return "rgba(" + red + ", " + green + ", " + blue + ", " + alpha + ")";
  }

  function formatDelta(delta) {
    if (delta == null) return "—";
    const sign = delta > 0 ? "+" : "";
    return sign + delta.toFixed(1) + " pp";
  }

  function signalFor(row, delta) {
    if (delta != null && delta >= 3) return { label: "Breakout", className: "is-breakout" };
    if (delta != null && delta >= 1.5) return { label: "Surging", className: "is-surging" };
    if (numberValue(row.posting_share_pct) >= 30) return { label: "Market leader", className: "is-core" };
    if (delta != null && delta > 0.2) return { label: "Growing", className: "" };
    return { label: "Core", className: "is-core" };
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");
    window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(function () {
      elements.toast.classList.remove("is-visible");
    }, 2600);
  }

  function setDataBadge() {
    elements.dataBadgeText.textContent = state.isDemo
      ? "Sample data"
      : state.backendConnected ? "Backend connected" : "Imported report";
    elements.dataBadge.classList.toggle("is-imported", !state.isDemo);
    document.getElementById("dataBadgeTooltip").textContent = elements.dataBadgeText.textContent;
    document.getElementById("reportContext").textContent = state.isDemo
      ? "SAMPLE REPORT"
      : state.backendConnected ? "BACKEND REPORT" : "IMPORTED REPORT";

    document.getElementById("reportSourceLabel").textContent = state.isDemo
      ? "SAMPLE REPORT"
      : state.backendConnected ? "BACKEND SNAPSHOT" : "LOCAL FILE IMPORT";
    document.getElementById("reportSourceNote").textContent = state.isDemo
      ? "Built-in example values · not live market data"
      : state.backendConnected ? "Generated report files · project data folder" : "Loaded locally · files stay in this browser";
    const now = new Date();
    const currentMonth = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
    document.getElementById("reportPeriodValue").textContent = monthLabel(state.selectedMonth) +
      (!state.isDemo && state.selectedMonth === currentMonth ? " · TO DATE" : "");
    const postCount = totalPostsForMonth(state.selectedMonth);
    document.getElementById("reportPostCount").textContent = postCount == null ? "—" : formatNumber(postCount);
    document.getElementById("reportLoadedAt").textContent = state.isDemo
      ? "SAMPLE SET"
      : state.lastLoadedAt.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }

  // The month select and technology suggestion list are built from the loaded report,
  // so they stay in sync when a new report is imported.
  function updateMonthOptions() {
    const months = monthsInData();
    if (!months.length) return;

    if (!months.includes(state.selectedMonth)) state.selectedMonth = months[months.length - 1];
    elements.monthSelect.innerHTML = months.slice().reverse().map(function (month) {
      return '<option value="' + escapeHTML(month) + '">' + escapeHTML(monthLabel(month)) + '</option>';
    }).join("");
    elements.monthSelect.value = state.selectedMonth;
    const technologies = Array.from(new Set(state.metrics.map(function (row) {
      return String(row.tech || "").trim();
    }).filter(Boolean))).sort(function (a, b) { return a.localeCompare(b); });
    elements.techStackOptions.innerHTML = technologies.map(function (technology) {
      return '<option value="' + escapeHTML(technology) + '"></option>';
    }).join("");
  }

  /* FEATURE 04 — Update the summary cards.
     Why: changing the month or report changes the valid-post count, leading technologies,
     and mini bars. KPI means key performance indicator: a summary measure. */
  function updateKpis() {
    const chartMonths = selectedMonths();
    const postCounts = chartMonths.map(totalPostsForMonth).filter(function (count) { return count != null; });
    const totalPosts = postCounts.reduce(function (sum, count) { return sum + count; }, 0);
    const rows = currentMonthRows().slice().sort(function (a, b) {
      return numberValue(b.posting_share_pct) - numberValue(a.posting_share_pct) ||
        numberValue(a.rank) - numberValue(b.rank) || a.tech.localeCompare(b.tech);
    });
    const dominant = rows[0];
    const runnerUp = rows[1];

    document.getElementById("postingsValue").textContent = postCounts.length ? formatNumber(totalPosts) : "—";
    const postsCoverage = postCounts.length === 1
      ? "in " + monthLabel(state.selectedMonth)
      : "across " + postCounts.length + " available months through " + monthLabel(state.selectedMonth);
    document.getElementById("postingsNote").textContent = postCounts.length
      ? (state.isDemo ? "Illustrative valid posts " : "Valid posts considered ") + postsCoverage
      : "No valid-post counts in this range";

    if (dominant) {
      const delta = monthDelta(dominant.tech);
      document.getElementById("dominantValue").textContent = dominant.tech;
      document.getElementById("dominantShare").textContent = formatPercent(dominant.posting_share_pct, 1);
      document.getElementById("dominantNote").textContent = formatNumber(dominant.postings_with_tech) +
        " posts · " + (delta == null ? "no earlier month to compare" : formatDelta(delta) + " MoM");
    } else {
      document.getElementById("dominantValue").textContent = "—";
      document.getElementById("dominantShare").textContent = "—";
      document.getElementById("dominantNote").textContent = "No technology rows in this month";
    }

    if (runnerUp) {
      document.getElementById("runnerUpValue").textContent = runnerUp.tech;
      document.getElementById("runnerUpShare").textContent = formatPercent(runnerUp.posting_share_pct, 1);
      document.getElementById("runnerUpNote").textContent = "2nd by post share · " + formatNumber(runnerUp.postings_with_tech) + " posts";
    } else {
      document.getElementById("runnerUpValue").textContent = "—";
      document.getElementById("runnerUpShare").textContent = "—";
      document.getElementById("runnerUpNote").textContent = rows.length ? "Only one technology in this month" : "No technology rows in this month";
    }

    const remoteStats = state.remoteStatsByMonth && state.remoteStatsByMonth[state.selectedMonth];
    if (state.isDemo) {
      document.getElementById("remoteValue").textContent = formatPercent(DEMO.remoteShare, 1);
      document.getElementById("remoteUnit").textContent = formatNumber(DEMO.remotePosts) + " posts";
      document.getElementById("remoteNote").textContent = "Sample value · not derived from post text";
    } else if (remoteStats && remoteStats.total) {
      document.getElementById("remoteValue").textContent = formatPercent((remoteStats.remoteFriendly / remoteStats.total) * 100, 1);
      document.getElementById("remoteUnit").textContent = formatNumber(remoteStats.remoteFriendly) + " posts";
      document.getElementById("remoteNote").textContent = "Text estimate · " + formatNumber(remoteStats.total) + " posts with readable text scanned";
    } else {
      document.getElementById("remoteValue").textContent = "—";
      document.getElementById("remoteUnit").textContent = "not in export";
      document.getElementById("remoteNote").textContent = "Posting text is not available for remote-status estimates";
    }

    document.getElementById("periodCaption").textContent =
      "Showing " + chartMonths.length + " month" + (chartMonths.length === 1 ? "" : "s") +
      " through " + monthLabel(state.selectedMonth);

    renderKpiBars("postings", chartMonths, chartMonths.map(totalPostsForMonth), function (value) {
      return formatNumber(value) + " posts";
    }, "Valid posts considered");
    renderKpiBars("dominant", chartMonths, chartMonths.map(function (month) {
      if (!dominant) return null;
      const row = metricFor(dominant.tech, month);
      return row ? numberValue(row.posting_share_pct) : null;
    }), function (value) {
      return formatPercent(value, 1);
    }, dominant ? dominant.tech + " posting share" : "Top technology share");
    renderKpiBars("runnerUp", chartMonths, chartMonths.map(function (month) {
      if (!runnerUp) return null;
      const row = metricFor(runnerUp.tech, month);
      return row ? numberValue(row.posting_share_pct) : null;
    }), function (value) {
      return formatPercent(value, 1);
    }, runnerUp ? runnerUp.tech + " posting share, ranked second" : "Second-ranked technology share");
    const remoteValues = chartMonths.map(function (month) {
      if (state.isDemo) return month === state.selectedMonth ? numberValue(DEMO.remoteShare) : null;
      const monthStats = state.remoteStatsByMonth && state.remoteStatsByMonth[month];
      return monthStats && monthStats.total ? (monthStats.remoteFriendly / monthStats.total) * 100 : null;
    });
    renderKpiBars("remote", chartMonths, remoteValues, function (value) {
      return formatPercent(value, 1);
    }, state.isDemo
      ? "Selected month demo remote share; earlier history unavailable"
      : state.remoteStatsByMonth
        ? "Remote/hybrid text estimate by month"
        : "Remote share history unavailable because posting text is not in the imported data");
  }

  /* FEATURE 05 — Choose which calendar months belong in the chart.
     Why: 1M/3M/6M/1Y buttons need the same month list for the line chart and KPI bars.
     JavaScript numbers months from 0 to 11 internally, so the date math converts carefully. */
  function selectedMonths() {
    if (!monthsInData().includes(state.selectedMonth)) return [];
    const parts = state.selectedMonth.split("-");
    const selectedDate = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
    const isYearView = state.rangeMonths >= 12;
    const firstMonth = isYearView ? 0 : selectedDate.getMonth() - state.rangeMonths + 1;
    const monthCount = isYearView ? selectedDate.getMonth() + 1 : state.rangeMonths;
    return Array.from({ length: monthCount }, function (_value, index) {
      const date = new Date(selectedDate.getFullYear(), firstMonth + index, 1);
      return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
    });
  }

  /* FEATURE 05 — Prepare chart data for every technology in the selected category.
     Why: one series (one plotted line) is created for each technology, and rankings are
     recalculated month by month. A dataset is the label, values, and style for one chart line.
     Map stores a value by key; here it quickly links a month or technology to its rank. */
  function createTrendDatasets() {
    const months = selectedMonths();
    const periodRows = state.metrics.filter(function (row) {
      return months.includes(row.thread_month) &&
        getCategory(row.tech, row.category) === state.trendCategory;
    });
    const monthRanks = new Map();
    months.forEach(function (month) {
      const rankedRows = periodRows.filter(function (row) { return row.thread_month === month; })
        .sort(function (a, b) {
          return numberValue(b.postings_with_tech) - numberValue(a.postings_with_tech) || a.tech.localeCompare(b.tech);
        });
      monthRanks.set(month, new Map(rankedRows.map(function (row, index) {
        return [row.tech, index + 1];
      })));
    });
    const currentRanks = monthRanks.get(state.selectedMonth) || new Map();
    const peakShares = new Map();
    periodRows.forEach(function (row) {
      peakShares.set(row.tech, Math.max(peakShares.get(row.tech) || 0, numberValue(row.posting_share_pct)));
    });
    const technologies = Array.from(new Set(periodRows.map(function (row) { return row.tech; }))).sort(function (a, b) {
      const rankA = currentRanks.get(a) || Number.MAX_SAFE_INTEGER;
      const rankB = currentRanks.get(b) || Number.MAX_SAFE_INTEGER;
      if (rankA !== rankB) return rankA - rankB;
      return (peakShares.get(b) || 0) - (peakShares.get(a) || 0) || a.localeCompare(b);
    });

    const lineColors = LINE_COLORS;
    const datasets = technologies.map(function (technology, index) {
      const color = lineColors[index % lineColors.length];
      return {
        label: technology,
        rank: currentRanks.get(technology) || null,
        monthlyRanks: months.map(function (month) {
          return monthRanks.get(month).get(technology) || null;
        }),
        data: months.map(function (month) {
          const match = metricFor(technology, month);
          return match ? numberValue(match.posting_share_pct) : null;
        }),
        borderColor: index > 5 ? colorWithAlpha(color, 0.38) : index > 0 ? colorWithAlpha(color, 0.78) : color,
        backgroundColor: index === 0 ? function (context) {
          const chart = context.chart;
          const chartArea = chart.chartArea;
          if (!chartArea) return colorWithAlpha(color, 0.16);
          const gradient = chart.ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, colorWithAlpha(color, 0.25));
          gradient.addColorStop(1, colorWithAlpha(color, 0));
          return gradient;
        } : "transparent",
        fill: index === 0 ? "origin" : false,
        borderWidth: index === 0 ? 2.8 : index < 5 ? 1.25 : 0.9,
        borderCapStyle: "round",
        borderJoinStyle: "round",
        pointRadius: months.length === 1 ? 3 : 0,
        pointHoverRadius: 4,
        pointHitRadius: 8,
        pointBorderWidth: 2,
        pointBackgroundColor: themeColor("--surface", "#17140f"),
        pointBorderColor: color,
        tension: 0.42,
        cubicInterpolationMode: "monotone",
        spanGaps: false
      };
    });
    return { labels: months.map(monthLabelShort), datasets: datasets };
  }

  function monthLabelShort(monthKey) {
    const parts = String(monthKey || "").split("-");
    if (parts.length < 2) return monthKey;
    return new Date(Number(parts[0]), Number(parts[1]) - 1, 1)
      .toLocaleDateString("en", { month: "short", year: "2-digit" });
  }

  /* FEATURE 05 — Draw or refresh the Chart.js trend line.
     Why: the graph compares technology share across every month in the chosen period.
     Chart options control labels and tooltips; a tooltip is the small popup shown on hover. */
  function drawTrendChart() {
    const chartMessage = document.getElementById("trendChartMessage");
    if (typeof window.Chart === "undefined") {
      chartMessage.hidden = false;
      return;
    }
    chartMessage.hidden = true;
    const chartData = createTrendDatasets();
    const canvas = document.getElementById("trendChart");
    const options = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "nearest", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: themeColor("--chart-tooltip-bg", "#211b14"),
          borderColor: themeColor("--line-strong", "rgba(224,226,235,.2)"),
          borderWidth: 1,
          titleColor: themeColor("--text", "#f4eee4"),
          bodyColor: themeColor("--muted", "#a49a89"),
          padding: 10,
          displayColors: true,
          callbacks: { label: function (context) {
            const rank = context.dataset.monthlyRanks[context.dataIndex];
            const rankLabel = rank ? "#" + rank + " " : "";
            return " " + rankLabel + context.dataset.label + ": " + formatPercent(context.parsed.y, 1);
          } }
        }
      },
      scales: {
        x: {
          grid: { color: themeColor("--chart-grid", "rgba(224,226,235,.08)"), drawTicks: false },
          border: { display: false },
          ticks: { color: themeColor("--muted", "#a49a89"), padding: 9, font: { family: "DM Mono, monospace", size: 9 } }
        },
        y: {
          beginAtZero: true,
          suggestedMax: Math.max(20, ...chartData.datasets.flatMap(function (set) { return set.data.filter(Number.isFinite); })) + 5,
          grid: { color: themeColor("--chart-grid", "rgba(224,226,235,.08)"), drawTicks: false },
          border: { display: false },
          ticks: {
            color: themeColor("--muted", "#a49a89"),
            padding: 8,
            font: { family: "DM Mono, monospace", size: 8 },
            callback: function (value) { return value + "%"; }
          }
        }
      }
    };

    if (!state.lineChart) {
      state.lineChart = new window.Chart(canvas, { type: "line", data: chartData, options: options });
    } else {
      state.lineChart.data = chartData;
      state.lineChart.options = options;
      chartData.datasets.forEach(function (_dataset, index) {
        state.lineChart.getDatasetMeta(index).hidden = null;
      });
      state.lineChart.update();
    }
    renderTrendLegend(state.lineChart);
  }

  /* FEATURE 05 — Make one clickable legend button per chart line.
     Why: readers can hide a technology line to compare the remaining lines more clearly. */
  function renderTrendLegend(chart) {
    const legend = document.getElementById("trendLegend");
    legend.innerHTML = chart.data.datasets.map(function (dataset, index) {
      const visible = chart.isDatasetVisible(index);
      const rank = dataset.rank ? "#" + dataset.rank + " " : "";
      return '<button type="button" class="trend-legend-item' + (visible ? "" : " is-hidden") +
        '" data-trend-series="' + index + '" aria-pressed="' + visible + '" title="Toggle ' +
        escapeHTML(dataset.label) + '"><i style="--series-color:' + escapeHTML(dataset.borderColor) +
        '" aria-hidden="true"></i><span>' + rank + escapeHTML(dataset.label) + "</span></button>";
    }).join("");
    legend.hidden = chart.data.datasets.length === 0;
  }

  function categoryTotals() {
    const totals = new Map();
    currentMonthRows().forEach(function (row) {
      const category = getCategory(row.tech, row.category);
      totals.set(category, (totals.get(category) || 0) + numberValue(row.postings_with_tech));
    });
    return Array.from(totals.entries()).map(function (entry) {
      return { key: entry[0], value: entry[1] };
    }).sort(function (a, b) { return b.value - a.value; });
  }

  /* FEATURE 05 — Draw the doughnut chart and its matching text legend.
     Why: category totals show where all mentions are concentrated in the selected month. */
  function drawMixChart() {
    const entries = categoryTotals();
    const labels = entries.map(function (entry) { return categoryLabel(entry.key); });
    const values = entries.map(function (entry) { return entry.value; });
    const colors = entries.map(function (entry) { return categoryColor(entry.key); });
    const total = values.reduce(function (sum, value) { return sum + value; }, 0);
    document.getElementById("mixTotal").textContent = formatNumber(total);
    document.getElementById("mixLegend").innerHTML = entries.map(function (entry) {
      const share = total ? (entry.value / total) * 100 : 0;
      return '<div class="mix-legend-row"><span class="mix-legend-name"><i class="mix-swatch" style="background:' +
        categoryColor(entry.key) + '"></i>' + escapeHTML(categoryLabel(entry.key)) +
        '</span><span class="mix-legend-value">' + share.toFixed(0) + "%</span></div>";
    }).join("");

    if (typeof window.Chart === "undefined") return;
    const canvas = document.getElementById("mixChart");
    const data = {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderWidth: 0,
        hoverOffset: 5,
        spacing: 3,
        borderRadius: 4
      }]
    };
    const options = {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "76%",
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: themeColor("--chart-tooltip-bg", "#211b14"),
          borderColor: themeColor("--line-strong", "rgba(224,226,235,.2)"),
          borderWidth: 1,
          titleColor: themeColor("--text", "#f4eee4"),
          bodyColor: themeColor("--muted", "#a49a89"),
          padding: 9,
          callbacks: { label: function (context) {
            const share = total ? (context.parsed / total) * 100 : 0;
            return " " + context.label + ": " + share.toFixed(1) + "% of mentions";
          } }
        }
      }
    };
    if (!state.mixChart) {
      state.mixChart = new window.Chart(canvas, { type: "doughnut", data: data, options: options });
    } else {
      state.mixChart.data = data;
      state.mixChart.options = options;
      state.mixChart.update();
    }
  }

  /* STACK COMPARISON — Render selected technologies as a backend-backed bar chart.
     The width uses monthly post share; higher shares sort to the top. */
  function renderStackChart() {
    elements.stackChartSummary.textContent = state.preferredTechnologies.length + " added · " + (state.backendConnected
      ? "Backend report"
      : state.isDemo ? "Sample data" : "Imported report") + " · " + monthLabel(state.selectedMonth);

    if (!state.preferredTechnologies.length) {
      elements.stackChartEmpty.hidden = false;
      elements.stackBarChart.hidden = true;
      elements.stackBarChart.innerHTML = "";
      return;
    }

    const knownTechnologies = new Set(state.metrics.map(function (row) {
      return String(row.tech || "").toLowerCase();
    }));
    const chartRows = state.preferredTechnologies.map(function (technology, selectionIndex) {
      const key = technology.toLowerCase();
      return {
        tech: technology,
        row: metricFor(technology, state.selectedMonth) || null,
        selectionIndex: selectionIndex,
        found: knownTechnologies.has(key)
      };
    }).sort(function (a, b) {
      const shareA = a.row ? numberValue(a.row.posting_share_pct) : -1;
      const shareB = b.row ? numberValue(b.row.posting_share_pct) : -1;
      return shareB - shareA || a.tech.localeCompare(b.tech);
    });

    elements.stackChartEmpty.hidden = true;
    elements.stackBarChart.hidden = false;
    elements.stackBarChart.innerHTML = '<div class="stack-bar-axis" aria-hidden="true"><span></span><div><span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span></div><span></span></div>' +
      chartRows.map(function (item) {
      const row = item.row;
      const share = row ? numberValue(row.posting_share_pct) : null;
      const barWidth = share == null ? 0 : Math.max(0, Math.min(100, share));
      const category = row ? getCategory(item.tech, row.category) : getCategory(item.tech);
      const color = categoryColor(category);
      const detail = row
        ? formatNumber(row.postings_with_tech) + " of " + formatNumber(row.valid_postings) + " posts"
        : item.found ? "No matching posts in this month" : "Not found in the loaded report";
      return '<div class="stack-bar-row is-selected" role="listitem">' +
        '<div class="stack-bar-label"><span>' + escapeHTML(item.tech) + '</span><button class="stack-remove" type="button" data-remove-stack-index="' + item.selectionIndex + '" aria-label="Remove selected technology from comparison" title="Remove technology">×</button></div>' +
        '<div class="stack-bar-body"><div class="stack-bar-track" aria-hidden="true"><span style="width:' + barWidth.toFixed(1) + '%;--stack-bar-color:' + escapeHTML(color) + '"></span></div><span class="stack-bar-detail">' + escapeHTML(detail) + '</span></div>' +
        '<strong class="stack-bar-value">' + (share == null ? "—" : formatPercent(share, 1)) + '</strong></div>';
      }).join("");
  }

  /* FEATURE 05 — Write a plain-language note about the strongest upward change. */
  function updateMacroObservation() {
    const changes = currentMonthRows().map(function (row) {
      return { row: row, delta: monthDelta(row.tech) };
    }).filter(function (item) { return item.delta != null; }).sort(function (a, b) {
      return b.delta - a.delta;
    });
    const rising = changes.find(function (item) { return item.delta > 0; });
    const note = document.getElementById("macroObservation");
    if (!rising) {
      note.textContent = state.isDemo
        ? "This example highlights Rust's strong climb over the six-month window."
        : "No positive month-over-month change is present in this report.";
      return;
    }
    note.textContent = rising.row.tech + " gained " + rising.delta.toFixed(1) +
      " percentage points this month and appears in " + formatNumber(rising.row.postings_with_tech) + " posts.";
  }

  /* TECHNOLOGY MATRIX — Filter, rank, paginate, and draw the table rows.
     Paginate means split a long list into pages; slice selects only the current page. */
  function renderTable() {
    let rows = currentMonthRows().slice().sort(function (a, b) {
      return numberValue(a.rank) - numberValue(b.rank) ||
        numberValue(b.posting_share_pct) - numberValue(a.posting_share_pct);
    });
    if (state.tableCategory !== "all") {
      rows = rows.filter(function (row) {
        return getCategory(row.tech, row.category) === state.tableCategory;
      });
    }

    const search = (state.tableSearch + " " + state.globalSearch).trim().toLowerCase();
    if (search) {
      rows = rows.filter(function (row) {
        return (row.tech + " " + categoryLabel(getCategory(row.tech, row.category))).toLowerCase().includes(search);
      });
    }

    const totalRows = rows.length;
    const pageCount = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
    state.tablePage = Math.min(state.tablePage, pageCount);
    const first = (state.tablePage - 1) * PAGE_SIZE;
    const pageRows = rows.slice(first, first + PAGE_SIZE);

    elements.tableBody.innerHTML = pageRows.map(function (row) {
      const delta = monthDelta(row.tech);
      const signal = signalFor(row, delta);
      const category = getCategory(row.tech, row.category);
      const initials = row.tech.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase();
      const deltaClass = delta == null || delta === 0 ? "" : delta > 0 ? "positive" : "negative";
      return '<tr>' +
        '<td class="tech-name-cell"><span class="tech-monogram">' + escapeHTML(initials) + "</span>" + escapeHTML(row.tech) + "</td>" +
        '<td><span class="category-badge">' + escapeHTML(categoryLabel(category)) + "</span></td>" +
        '<td class="mentions-cell"><strong>' + formatPercent(row.posting_share_pct, 1) + "</strong><span>" +
        formatNumber(row.postings_with_tech) + " posts</span></td>" +
        '<td class="delta-cell ' + deltaClass + '">' + formatDelta(delta) + "</td>" +
        '<td><span class="signal-pill ' + signal.className + '">' + signal.label + "</span></td></tr>";
    }).join("");

    elements.tableEmpty.hidden = totalRows > 0;
    elements.tableBody.parentElement.hidden = totalRows === 0;
    elements.tableSummary.textContent = totalRows
      ? "Showing " + (first + 1) + "–" + Math.min(first + PAGE_SIZE, totalRows) + " of " + totalRows + " technologies"
      : "No matching technologies";
    elements.pageIndicator.textContent = "Page " + state.tablePage + " of " + pageCount;
    elements.previousPage.disabled = state.tablePage <= 1;
    elements.nextPage.disabled = state.tablePage >= pageCount;
  }

  // JOB FEED HELPERS — Accept dates from either Unix timestamps or readable date strings.
  function safeDate(value) {
    if (value == null || value === "") return null;
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) {
      return new Date(numeric < 100000000000 ? numeric * 1000 : numeric);
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function relativeDate(value) {
    const date = safeDate(value);
    if (!date) return "Date not included";
    return date.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
  }

  /* HIRING FEED — Find matching posts, apply the chosen sort order, and create their cards. */
  function matchingPosts() {
    const query = state.globalSearch.trim().toLowerCase();
    let posts = state.posts.filter(function (post) {
      return !post.thread_month || post.thread_month === state.selectedMonth;
    });
    if (query) {
      posts = posts.filter(function (post) {
        return (post.company + " " + post.role + " " + post.summary + " " +
          (post.technologies || []).join(" ")).toLowerCase().includes(query);
      });
    }

    posts.sort(function (a, b) {
      if (state.postSort === "oldest") return (safeDate(a.date) || 0) - (safeDate(b.date) || 0);
      if (state.postSort === "technologies") return (b.technologies || []).length - (a.technologies || []).length;
      if (state.postSort === "company") return a.company.localeCompare(b.company);
      return (safeDate(b.date) || 0) - (safeDate(a.date) || 0);
    });
    return posts;
  }

  function renderFeed() {
    const posts = matchingPosts();
    const shown = posts.slice(0, state.postsLimit);
    elements.jobGrid.innerHTML = shown.map(function (post) {
      const tags = (post.technologies || []).slice(0, 7).map(function (technology) {
        return '<button class="tech-tag tech-tag-clickable" type="button" data-tech-filter="' +
          escapeHTML(technology) + '">' + escapeHTML(technology) + "</button>";
      }).join("");
      const sourceLink = post.sourceUrl
        ? '<a class="job-link" href="' + escapeHTML(post.sourceUrl) + '" target="_blank" rel="noreferrer" title="Open original Hacker News post ' + escapeHTML(post.itemId || "") + '">Open source post ' + icon("arrow-up-right") + "</a>"
        : '<span class="job-link">' + (state.isDemo ? "Illustrative post" : "Imported HN post") + "</span>";
      const role = post.role || "Hacker News job post";
      const company = post.company || "Hacker News community";
      return '<article class="job-card">' +
        '<div><div class="job-card-top"><div><h3 class="job-role">' + escapeHTML(role) + "</h3>" +
        '<p class="job-company">' + escapeHTML(company) + "</p></div>" +
        '<span class="job-kind">' + escapeHTML(post.kind || "HN post") + "</span></div>" +
        '<div class="job-meta"><span>' + icon("map-pin") + escapeHTML(post.location || "Location not extracted") + "</span>" +
        '<span>' + icon("calendar-days") + escapeHTML(relativeDate(post.date)) + "</span></div>" +
        '<p class="job-summary">' + escapeHTML(post.summary || "The source export did not include a description.") + "</p></div>" +
        '<div class="job-card-footer"><div class="tech-tags">' +
        (tags || '<span class="tech-tag">No detected technologies</span>') + "</div>" + sourceLink + "</div></article>";
    }).join("");

    elements.feedEmpty.hidden = posts.length > 0;
    elements.jobGrid.hidden = posts.length === 0;
    elements.loadMore.hidden = posts.length <= shown.length;
    elements.loadMore.innerHTML = "Load more posts " + icon("chevron-down");
  }

  function renderAll() {
    // Redraw every data-backed section together after the selected month or report changes.
    updateMonthOptions();
    setDataBadge();
    updateKpis();
    renderWorkMode();
    drawTrendChart();
    drawMixChart();
    updateMacroObservation();
    renderTable();
    renderStackChart();
    renderFeed();
  }

  /* IMPORT HELPERS — Turn CSV/JSON file contents into the row format used by this page.
     CSV is a comma-separated table; JSON is a structured text format. Parsing means reading
     that text and turning it into JavaScript values. This CSV reader also handles quoted commas. */
  function parseCSV(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let inQuotes = false;
    const source = String(text || "").replace(/^\uFEFF/, "");

    for (let i = 0; i < source.length; i += 1) {
      const character = source[i];
      const next = source[i + 1];
      if (character === '"' && inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else if (character === '"') {
        inQuotes = !inQuotes;
      } else if (character === "," && !inQuotes) {
        row.push(cell);
        cell = "";
      } else if ((character === "\n" || character === "\r") && !inQuotes) {
        if (character === "\r" && next === "\n") i += 1;
        row.push(cell);
        if (row.some(function (value) { return value !== ""; })) rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += character;
      }
    }
    row.push(cell);
    if (row.some(function (value) { return value !== ""; })) rows.push(row);
    if (!rows.length) return [];

    const headers = rows[0].map(function (header) { return header.trim().toLowerCase(); });
    return rows.slice(1).map(function (values) {
      const record = {};
      headers.forEach(function (header, index) { record[header] = values[index] == null ? "" : values[index]; });
      return record;
    });
  }

  function metricRowsFromJSON(data) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.monthly_share)) return data.monthly_share;
    if (data && Array.isArray(data.records)) return data.records;
    if (data && Array.isArray(data.rows)) return data.rows;
    return [];
  }

  // Normalize different column names into one standard report shape for the dashboard.
  function normalizeMetricRows(rows) {
    return rows.map(function (row) {
      const normalized = {
        thread_month: String(row.thread_month || row.month || "").slice(0, 7),
        tech: String(row.tech || row.technology || "").trim(),
        postings_with_tech: numberValue(row.postings_with_tech || row.posts_with_tech || row.count),
        valid_postings: numberValue(row.valid_postings || row.total_posts || row.total),
        posting_share_pct: numberValue(row.posting_share_pct || row.post_share_pct || row.share_pct),
        mention_share_pct: numberValue(row.mention_share_pct),
        rank: numberValue(row.rank),
        category: String(row.category || "")
      };
      return normalized;
    }).filter(function (row) { return row.thread_month && row.tech; });
  }

  // Recognize which pipeline file was selected by looking at its column names (headers).
  function recordsFromCSV(rows, fileName, imported) {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]).map(function (value) { return value.toLowerCase(); });
    const has = function (name) { return headers.includes(name); };

    if (has("thread_month") && has("tech") && (has("posting_share_pct") || has("postings_with_tech"))) {
      imported.metrics = normalizeMetricRows(rows);
      return;
    }
    if (has("tech") && has("category") && !has("item_id")) {
      rows.forEach(function (row) {
        state.categoryByTech[String(row.tech || "").trim()] = normalizeCategory(row.category);
      });
      imported.dictionaryLoaded = true;
      return;
    }
    if (has("item_id") && has("tech") && !has("text_clean")) {
      imported.postingTech = rows;
      return;
    }
    if (has("item_id") && (has("text_clean") || has("text"))) {
      imported.postings = rows;
      return;
    }
    throw new Error("I could not recognize " + fileName + ". Choose a monthly_share report or pipeline CSV.");
  }

  /* POSTING DATA — Join post text to its detected technologies using item_id as the shared key.
     A Set prevents the same technology from appearing twice on one post. */
  function inferPostIdentity(row, text, technologies) {
    const headerParts = String(text || "").slice(0, 700).split(/\s+\|\s+/)
      .map(function (part) { return part.trim(); })
      .filter(Boolean);
    const roleWords = /\b(?:engineers?|developers?|designers?|scientists?|researchers?|architects?|consultants?|analysts?|managers?|administrators?|technicians?|interns?|specialists?|cto|cfo|sre|devops)\b/i;
    const fieldRole = String(row.role || row.job_title || row.position || "").trim();
    const headerRole = headerParts.slice(1, 6).find(function (part) {
      return part.length <= 90 && roleWords.test(part);
    }) || "";
    const bodyRoleMatch = String(text || "").match(/\b((?:(?:senior|staff|principal|lead|junior|founding|backend|front[- ]end|full[- ]stack|data|platform|bioinformatics|low[- ]level|product|site reliability|machine learning|software)\s+){0,3}(?:[\w.+/#-]+\s+){0,2}(?:engineers?|developers?|designers?|scientists?|researchers?|architects?|consultants?|analysts?|managers?|administrators?|technicians?|interns?|specialists?|cto|cfo|sre|devops))\b/i);
    const bodyRole = bodyRoleMatch ? bodyRoleMatch[1].trim() : "";
    const techHint = (technologies || []).slice(0, 2).join(" + ");
    const role = fieldRole || headerRole || bodyRole || (techHint ? "Hiring post · " + techHint : "Engineering opportunity");

    const fieldCompany = String(row.company || row.employer || "").trim();
    const headerCompany = headerParts[0] || "";
    const looksLikeCompany = headerParts.length > 1 && headerCompany.length <= 70 &&
      !/^(?:hi|hello|we(?:'re| are)\b|i(?:'m| am)\b|hiring\b|looking\b|remote\b|onsite\b|hybrid\b)/i.test(headerCompany);
    const company = fieldCompany || (looksLikeCompany ? headerCompany : "") || "Hacker News community";
    return { role: role.charAt(0).toUpperCase() + role.slice(1), company: company };
  }

  function makeFeedPosts(rawPosts, postingTechRows) {
    const technologyByPost = new Map();
    (postingTechRows || []).forEach(function (row) {
      const id = String(row.item_id || "");
      if (!technologyByPost.has(id)) technologyByPost.set(id, new Set());
      technologyByPost.get(id).add(String(row.tech || "").trim());
    });

    return (rawPosts || []).map(function (row) {
      const id = String(row.item_id || row.id || "");
      const text = String(row.text_clean || row.text || row.body || "");
      const firstLine = text.split(/\r?\n/).map(function (line) { return line.trim(); }).find(Boolean) || "";
      const preview = firstLine.length > 140 ? firstLine.slice(0, 137) + "…" : firstLine;
      const explicitTech = String(row.technologies || row.tech || "").split(/[;,|]/).map(function (value) { return value.trim(); }).filter(Boolean);
      const foundTech = technologyByPost.get(id);
      const technologies = Array.from(foundTech || new Set(explicitTech));
      const month = String(row.thread_month || "").slice(0, 7);
      const identity = inferPostIdentity(row, text, technologies);
      return {
        itemId: id,
        thread_month: month,
        company: identity.company,
        role: identity.role,
        location: "Role details are in the original post",
        date: row.posted_at || row.time || month,
        summary: preview || "Open the original community post for details.",
        technologies: technologies,
        kind: "Imported post",
        sourceUrl: /^\d+$/.test(id) ? "https://news.ycombinator.com/item?id=" + encodeURIComponent(id) : ""
      };
    });
  }

  /* FALLBACK CALCULATION — If there is no monthly summary file, calculate shares from posts.
     Each post counts once per technology, then the code calculates percentage and rank. */
  function calculateMetricsFromPosts(rawPosts, postingTechRows) {
    const postMonths = new Map();
    const postTech = new Map();
    (rawPosts || []).forEach(function (row) {
      const id = String(row.item_id || row.id || "");
      const month = String(row.thread_month || "").slice(0, 7);
      if (!id || !month) return;
      if (!postMonths.has(month)) postMonths.set(month, new Set());
      postMonths.get(month).add(id);
    });
    (postingTechRows || []).forEach(function (row) {
      const id = String(row.item_id || "");
      const technology = String(row.tech || "").trim();
      if (!id || !technology) return;
      if (!postTech.has(id)) postTech.set(id, new Set());
      postTech.get(id).add(technology);
    });

    const rows = [];
    postMonths.forEach(function (postIds, month) {
      const byTechnology = new Map();
      postIds.forEach(function (id) {
        (postTech.get(id) || new Set()).forEach(function (technology) {
          if (!byTechnology.has(technology)) byTechnology.set(technology, new Set());
          byTechnology.get(technology).add(id);
        });
      });
      const totalMentions = Array.from(byTechnology.values()).reduce(function (sum, ids) { return sum + ids.size; }, 0);
      const monthRows = Array.from(byTechnology.entries()).map(function (entry) {
        const technology = entry[0];
        const count = entry[1].size;
        return {
          thread_month: month,
          tech: technology,
          postings_with_tech: count,
          valid_postings: postIds.size,
          posting_share_pct: postIds.size ? Number(((count / postIds.size) * 100).toFixed(2)) : 0,
          mention_share_pct: totalMentions ? Number(((count / totalMentions) * 100).toFixed(2)) : 0,
          rank: 0,
          category: state.categoryByTech[technology] || "other"
        };
      }).sort(function (a, b) {
        return b.postings_with_tech - a.postings_with_tech || a.tech.localeCompare(b.tech);
      });
      monthRows.forEach(function (row, index) { row.rank = index + 1; });
      rows.push.apply(rows, monthRows);
    });
    return rows;
  }

  /* REMOTE-FRIENDLY KPI — Estimate remote/hybrid share from post text when the report includes it.
     The backend does not provide a dedicated work-mode field, so this is a keyword estimate. */
  function isRemoteFriendlyPost(row) {
    const explicitFields = [row.remote_status, row.remote_friendly, row.work_mode, row.workplace_type, row.location]
      .map(function (value) { return String(value || ""); })
      .join(" ");
    if (/\b(remote|hybrid)\b/i.test(explicitFields)) return true;

    const text = String(row.text_clean || row.text || row.body || "");
    const opening = text.slice(0, 320);
    const labeledLocation = /(?:^|[|;,·])\s*(?:fully\s+|100%\s+)?(?:remote|hybrid)\b(?:\s*\([^)]{0,80}\))?\s*(?=[|;,·]|$)/i;
    const workArrangement = /\b(?:fully\s+remote|remote[- ]first|remote[- ]friendly|work(?:ing)?\s+(?:fully\s+)?remotely|work(?:ing)?\s+(?:fully\s+)?remote|work\s+from\s+(?:anywhere|home)|work[- ]from[- ]home|telecommut(?:e|ing)|distributed\s+(?:team|workforce)|hybrid\s+(?:work|schedule|arrangement|role|position))\b/i;
    const regionalRemote = /\b(?:remote|hybrid)\s+(?:in|across|within)\s+(?:the\s+)?(?:us|usa|united states|canada|europe|uk|united kingdom|worldwide|anywhere)\b/i;
    return labeledLocation.test(opening) || workArrangement.test(text) || regionalRemote.test(text);
  }

  function classifyWorkMode(row) {
    const explicitFields = [row.remote_status, row.remote_friendly, row.work_mode, row.workplace_type, row.location]
      .map(function (value) { return String(value || ""); })
      .join(" ");
    const text = String(row.text_clean || row.text || row.body || "");
    const signals = (explicitFields + " " + text).trim();
    const explicitMode = /\b(?:remote|hybrid|on[ -]?site|onsite|office(?:[- ]based)?|in[ -]person)\b/i.test(explicitFields);
    if (!text.trim() && !explicitMode) return "";

    const hybrid = /\bhybrid\b/i.test(signals);
    const onSite = /\b(?:on[ -]?site|onsite|in[ -]office|office[ -]based|in person|work(?:ing)? from (?:our |the )?office)\b/i.test(signals);
    const remote = isRemoteFriendlyPost(row);
    if (hybrid || (remote && onSite)) return "hybrid";
    if (onSite) return "onsite";
    if (remote) return "remote";
    return "unspecified";
  }

  function remoteStatsFromPosts(rawPosts) {
    const months = new Map();
    (rawPosts || []).forEach(function (row, index) {
      const month = String(row.thread_month || row.month || "").slice(0, 7);
      if (!month) return;
      const mode = classifyWorkMode(row);
      if (!mode) return;
      if (!months.has(month)) months.set(month, {
        total: 0, remote: 0, remoteFriendly: 0, onsite: 0, hybrid: 0, unspecified: 0, seen: new Set()
      });
      const stats = months.get(month);
      const id = String(row.item_id || row.id || "row-" + index);
      if (stats.seen.has(id)) return;
      stats.seen.add(id);
      stats.total += 1;
      stats[mode] += 1;
      if (mode === "remote" || mode === "hybrid") stats.remoteFriendly += 1;
    });

    const result = {};
    months.forEach(function (stats, month) {
      result[month] = {
        total: stats.total,
        remote: stats.remoteFriendly,
        remoteFriendly: stats.remoteFriendly,
        onsite: stats.onsite,
        hybrid: stats.hybrid,
        unspecified: stats.unspecified
      };
    });
    return result;
  }

  function renderWorkMode() {
    const stats = state.remoteStatsByMonth && state.remoteStatsByMonth[state.selectedMonth];
    const hasTextData = Boolean(stats && stats.total);
    const modes = [
      { key: "remote", label: "Remote" },
      { key: "onsite", label: "On-site" },
      { key: "hybrid", label: "Hybrid" },
      { key: "unspecified", label: "Unspecified" }
    ];

    modes.forEach(function (mode) {
      const count = hasTextData ? stats[mode.key] : null;
      const idSuffix = mode.key.charAt(0).toUpperCase() + mode.key.slice(1);
      document.getElementById("workmode" + idSuffix + "Value").textContent =
        count == null ? "—" : formatPercent((count / stats.total) * 100, 1);
      document.getElementById("workmode" + idSuffix + "Count").textContent =
        count == null ? "No source text" : formatNumber(count) + " posts";
      document.getElementById("workmode" + idSuffix + "Bar").style.width =
        count == null ? "0%" : ((count / stats.total) * 100) + "%";
    });

    document.getElementById("workmodeTrack").setAttribute("aria-label", hasTextData
      ? "Estimated arrangement mix: " + modes.map(function (mode) {
        return mode.label + " " + formatPercent((stats[mode.key] / stats.total) * 100, 1);
      }).join(", ")
      : "Work arrangement estimate unavailable");

    document.getElementById("workmodePeriod").textContent = hasTextData
      ? monthLabel(state.selectedMonth).toUpperCase() + " · " + formatNumber(stats.total) + " TEXTS"
      : "SELECTED MONTH";
    const note = state.isDemo
      ? "The sample report has no source work-mode text. Import postings.csv with readable post text to see this estimate."
      : hasTextData
        ? formatNumber(stats.total) + " posts with readable text or explicit mode labels for " + monthLabel(state.selectedMonth) + ". Phrase matches can miss context or imply a mode that the employer did not state directly."
        : "No readable post text is available for " + monthLabel(state.selectedMonth) + ". Import postings.csv to calculate this estimate.";
    document.getElementById("workmodeNote").textContent = note;
  }

  /* FEATURE 06 — Read a chosen file on this device; FileReader returns its text asynchronously. */
  function readTextFile(file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || "")); };
      reader.onerror = function () { reject(new Error("Could not read " + file.name + ".")); };
      reader.readAsText(file);
    });
  }

  /* FEATURE 06 — Import a report selected in the dialog, validate it, then redraw the dashboard.
     try/catch handles problems gracefully and shows a message instead of stopping the whole page. */
  async function importSelectedFiles() {
    const files = Array.from(elements.dataFiles.files || []);
    if (!files.length) {
      showToast("Choose one or more CSV or JSON files first.");
      return;
    }

    const imported = { metrics: [], postings: [], postingTech: [], dictionaryLoaded: false };
    try {
      for (const file of files) {
        const content = await readTextFile(file);
        if (file.name.toLowerCase().endsWith(".json")) {
          const rows = metricRowsFromJSON(JSON.parse(content));
          if (!rows.length) throw new Error(file.name + " does not contain a monthly report.");
          imported.metrics = normalizeMetricRows(rows);
        } else {
          recordsFromCSV(parseCSV(content), file.name, imported);
        }
      }

      if (imported.metrics.length) {
        state.metrics = imported.metrics;
      } else if (imported.postings.length && imported.postingTech.length) {
        state.metrics = calculateMetricsFromPosts(imported.postings, imported.postingTech);
      } else {
        throw new Error("Import monthly_share.json/.csv, or select both postings.csv and posting_tech.csv.");
      }

      if (!state.metrics.length) throw new Error("The selected files did not contain any monthly technology metrics.");
      state.remoteStatsByMonth = imported.postings.length ? remoteStatsFromPosts(imported.postings) : null;
      state.posts = imported.postings.length ? makeFeedPosts(imported.postings, imported.postingTech) : [];
      state.selectedMonth = monthsInData().slice(-1)[0];
      state.isDemo = false;
      state.backendConnected = false;
      state.lastLoadedAt = new Date();
      state.tablePage = 1;
      state.postsLimit = POST_PAGE_SIZE;
      updateMonthOptions();
      renderAll();
      elements.importDialog.close();
      elements.dataFiles.value = "";
      elements.selectedFiles.textContent = "No files selected";
      showToast("Report loaded. The dashboard is showing your imported data.");
    } catch (error) {
      showToast(error.message || "The selected files could not be loaded.");
    }
  }

  // Restore the built-in example report and clear filters when the reader chooses sample data.
  function resetToDemo() {
    state.metrics = DEMO.monthlyShare.slice();
    state.posts = DEMO.examplePosts.slice();
    state.remoteStatsByMonth = null;
    state.categoryByTech = Object.assign({}, DEMO.categoryByTechnology);
    state.selectedMonth = DEMO.selectedMonth;
    state.isDemo = true;
    state.backendConnected = false;
    state.lastLoadedAt = new Date();
    state.tablePage = 1;
    state.postsLimit = POST_PAGE_SIZE;
    state.globalSearch = "";
    state.tableSearch = "";
    state.preferredTechnologies = [];
    elements.globalSearch.value = "";
    elements.techStackSearch.value = "";
    elements.tableSearch.value = "";
    elements.importDialog.close();
    updateMonthOptions();
    renderAll();
    showToast("Sample report restored.");
  }

  /* EXPORT — Build a CSV from this month and download it through the browser.
     Blob is a browser object for file-like data; a temporary URL lets the download link use it. */
  function downloadCSV() {
    const rows = currentMonthRows().slice().sort(function (a, b) {
      return numberValue(a.rank) - numberValue(b.rank);
    });
    if (!rows.length) {
      showToast("There are no technology rows to export for this month.");
      return;
    }
    const headers = ["thread_month", "tech", "category", "postings_with_tech", "valid_postings", "posting_share_pct", "month_change_pp", "rank"];
    const csvRows = rows.map(function (row) {
      return [
        row.thread_month,
        row.tech,
        categoryLabel(getCategory(row.tech, row.category)),
        row.postings_with_tech,
        row.valid_postings,
        row.posting_share_pct,
        monthDelta(row.tech) == null ? "" : monthDelta(row.tech).toFixed(2),
        row.rank
      ];
    });
    const csvText = [headers].concat(csvRows).map(function (row) {
      return row.map(function (value) { return '"' + String(value == null ? "" : value).replace(/"/g, '""') + '"'; }).join(",");
    }).join("\r\n");
    const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "devbuzz-" + state.selectedMonth + ".csv";
    link.click();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    showToast("CSV report downloaded.");
  }

  /* SHARE — Use the device share panel when available, otherwise copy a link to the clipboard. */
  async function shareReport() {
    const shareUrl = window.location.href.split("#")[0] + "#overview";
    try {
      if (navigator.share) {
        await navigator.share({ title: "DevBuzz Tech Stack Barometer", text: "Developer hiring technology signals", url: shareUrl });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        showToast("Dashboard link copied.");
      } else {
        showToast("Copy this link from the address bar to share the report.");
      }
    } catch (error) {
      if (error && error.name !== "AbortError") showToast("The share action was not available.");
    }
  }

  // Open the browser's built-in modal dialog for selecting a report file.
  function openImportDialog() {
    if (typeof elements.importDialog.showModal === "function") elements.importDialog.showModal();
    else elements.importDialog.setAttribute("open", "");
  }

  /* FEATURE 03 — Add a technology to the separate comparison chart.
     This action leaves matrix and hiring-post filters unchanged. */
  function addTechStackFilter(event) {
    event.preventDefault();
    const enteredTechnology = elements.techStackSearch.value.trim();
    if (!enteredTechnology) {
      elements.techStackSearch.focus();
      showToast("Type a technology to add it to the comparison chart.");
      return;
    }

    const matchingRow = state.metrics.find(function (row) {
      return String(row.tech || "").toLowerCase() === enteredTechnology.toLowerCase();
    });
    const technology = matchingRow ? matchingRow.tech : enteredTechnology;
    if (state.preferredTechnologies.some(function (item) {
      return item.toLowerCase() === technology.toLowerCase();
    })) {
      showToast(technology + " is already in the comparison.");
      return;
    }

    state.preferredTechnologies.push(technology);
    elements.techStackSearch.value = "";
    renderStackChart();
    showToast("Added " + technology + " to the comparison chart.");
    document.getElementById("stackComparison").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* CONTROL WIRING — Connect buttons, fields, and keyboard shortcuts to their feature functions.
     addEventListener means “when this event happens, run this callback function.”
     Event delegation handles clicks on items that JavaScript creates later. */
  function connectControls() {
    elements.techStackForm.addEventListener("submit", addTechStackFilter);
    elements.stackBarChart.addEventListener("click", function (event) {
      const button = event.target.closest("[data-remove-stack-index]");
      if (!button) return;
      const index = Number(button.getAttribute("data-remove-stack-index"));
      if (!Number.isInteger(index) || index < 0 || index >= state.preferredTechnologies.length) return;
      state.preferredTechnologies.splice(index, 1);
      renderStackChart();
    });
    elements.monthSelect.addEventListener("change", function () {
      state.selectedMonth = elements.monthSelect.value;
      state.tablePage = 1;
      renderAll();
    });

    elements.trendCategory.addEventListener("change", function () {
      state.trendCategory = elements.trendCategory.value;
      drawTrendChart();
    });

    document.getElementById("trendLegend").addEventListener("click", function (event) {
      const button = event.target.closest("[data-trend-series]");
      if (!button || !state.lineChart) return;
      const index = Number(button.getAttribute("data-trend-series"));
      if (!Number.isInteger(index) || index < 0 || index >= state.lineChart.data.datasets.length) return;
      state.lineChart.setDatasetVisibility(index, !state.lineChart.isDatasetVisible(index));
      state.lineChart.update();
      renderTrendLegend(state.lineChart);
    });

    document.querySelectorAll("[data-range]").forEach(function (button) {
      button.addEventListener("click", function () {
        state.rangeMonths = Number(button.getAttribute("data-range"));
        document.querySelectorAll("[data-range]").forEach(function (item) { item.classList.remove("is-selected"); });
        button.classList.add("is-selected");
        updateKpis();
        drawTrendChart();
      });
    });

    document.getElementById("categoryFilters").addEventListener("click", function (event) {
      const button = event.target.closest("[data-category]");
      if (!button) return;
      state.tableCategory = button.getAttribute("data-category");
      state.tablePage = 1;
      document.querySelectorAll("#categoryFilters .filter-chip").forEach(function (item) { item.classList.remove("is-selected"); });
      button.classList.add("is-selected");
      renderTable();
    });

    elements.globalSearch.addEventListener("input", function () {
      state.globalSearch = elements.globalSearch.value;
      state.tablePage = 1;
      renderTable();
      renderFeed();
    });
    elements.tableSearch.addEventListener("input", function () {
      state.tableSearch = elements.tableSearch.value;
      state.tablePage = 1;
      renderTable();
    });
    elements.previousPage.addEventListener("click", function () {
      state.tablePage = Math.max(1, state.tablePage - 1);
      renderTable();
    });
    elements.nextPage.addEventListener("click", function () {
      state.tablePage += 1;
      renderTable();
    });
    elements.postSort.addEventListener("change", function () {
      state.postSort = elements.postSort.value;
      renderFeed();
    });
    elements.loadMore.addEventListener("click", function () {
      state.postsLimit += POST_PAGE_SIZE;
      renderFeed();
    });
    elements.jobGrid.addEventListener("click", function (event) {
      const tag = event.target.closest("[data-tech-filter]");
      if (!tag) return;
      const technology = tag.getAttribute("data-tech-filter");
      elements.globalSearch.value = technology;
      state.globalSearch = technology;
      renderTable();
      renderFeed();
      document.getElementById("matrix").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    document.getElementById("exportButton").addEventListener("click", downloadCSV);
    document.getElementById("shareButton").addEventListener("click", shareReport);
    elements.refreshBackendButton.addEventListener("click", function () {
      loadGeneratedReportIfAvailable(true);
    });
    document.querySelectorAll("[data-open-import]").forEach(function (button) { button.addEventListener("click", openImportDialog); });
    document.querySelectorAll("[data-close-import]").forEach(function (button) { button.addEventListener("click", function () { elements.importDialog.close(); }); });
    document.querySelectorAll("[data-reset-demo]").forEach(function (button) { button.addEventListener("click", resetToDemo); });
    document.getElementById("loadFiles").addEventListener("click", importSelectedFiles);
    elements.dataFiles.addEventListener("change", function () {
      const names = Array.from(elements.dataFiles.files || []).map(function (file) { return file.name; });
      elements.selectedFiles.textContent = names.length ? names.join(", ") : "No files selected";
    });
    elements.importDialog.addEventListener("click", function (event) {
      if (event.target === elements.importDialog) elements.importDialog.close();
    });

    /* FEATURE 01 — Expand the sidebar on pointer/focus and let the pin button hold it open.
       Pointer events cover mouse, pen, and touch; focus events keep keyboard users included. */
    const workspaceSidebar = document.getElementById("workspaceSidebar");
    const sidebarPinButton = document.getElementById("sidebarPinButton");
    const touchLayout = window.matchMedia("(max-width: 790px), (hover: none)");
    let sidebarPinned = false;
    let sidebarHoverExpanded = false;
    function setSidebarExpanded() {
      const isExpanded = sidebarPinned || sidebarHoverExpanded;
      workspaceSidebar.classList.toggle("is-open", isExpanded);
      sidebarPinButton.setAttribute("aria-pressed", String(sidebarPinned));
      sidebarPinButton.setAttribute("aria-label", sidebarPinned ? "Unpin sidebar" : "Keep sidebar expanded");
      sidebarPinButton.title = sidebarPinned ? "Unpin sidebar" : "Keep sidebar expanded";
    }
    function setNavigationOpen(isOpen) {
      sidebarPinned = Boolean(isOpen);
      sidebarHoverExpanded = Boolean(isOpen);
      setSidebarExpanded();
    }
    workspaceSidebar.addEventListener("pointermove", function (event) {
      if (touchLayout.matches || event.pointerType === "touch") return;
      const navLink = event.target.closest(".nav-link");
      const control = event.target.closest(".sidebar-pin, .workspace-card");
      if (navLink) {
        const iconRailRight = workspaceSidebar.getBoundingClientRect().left + 74;
        sidebarHoverExpanded = workspaceSidebar.classList.contains("is-open") && event.clientX > iconRailRight;
      } else if (!control) {
        sidebarHoverExpanded = true;
      }
      setSidebarExpanded();
    });
    workspaceSidebar.addEventListener("pointerleave", function () {
      sidebarHoverExpanded = false;
      setSidebarExpanded();
    });
    workspaceSidebar.addEventListener("focusin", function () {
      if (!touchLayout.matches) {
        sidebarHoverExpanded = true;
        setSidebarExpanded();
      }
    });
    workspaceSidebar.addEventListener("focusout", function (event) {
      if (!touchLayout.matches && !workspaceSidebar.contains(event.relatedTarget)) {
        sidebarHoverExpanded = false;
        setSidebarExpanded();
      }
    });
    sidebarPinButton.addEventListener("click", function () {
      sidebarPinned = !sidebarPinned;
      sidebarHoverExpanded = sidebarPinned;
      setSidebarExpanded();
    });
    document.querySelectorAll("#mainNav a").forEach(function (link) {
      link.addEventListener("click", function () {
        document.querySelectorAll("#mainNav a").forEach(function (item) {
          const isActive = item === link;
          item.classList.toggle("is-active", isActive);
          if (isActive) item.setAttribute("aria-current", "page");
          else item.removeAttribute("aria-current");
        });
      });
    });

    document.addEventListener("keydown", function (event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        elements.globalSearch.focus();
      }
      if (event.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) {
        event.preventDefault();
        elements.globalSearch.focus();
      }
      if (event.key === "Escape" && workspaceSidebar.classList.contains("is-open")) setNavigationOpen(false);
    });
  }

  /* FEATURE 06 — Look for generated report files in the sibling backend data folder.
     fetch requests files over HTTP; Promise.all starts independent file requests together.
     This static page can load files from a local web server but is not itself the API server. */
  async function fetchBackendFile(folder, fileName) {
    try {
      const response = await fetch(folder + fileName, { cache: "no-store" });
      return response.ok ? await response.text() : "";
    } catch (error) {
      return "";
    }
  }

  async function loadGeneratedReportIfAvailable(showMissingMessage) {
    // The browser can read these files when the project is opened from a local
    // web server. A direct file:// page keeps the sample and import options.
    if (window.location.protocol === "file:") {
      if (showMissingMessage) showToast("Serve the project folder in a browser, then refresh the backend data.");
      return false;
    }

    const backendFolders = [
      "../devbuzz_backend%20only%202026/data/",
      "../devbuzz_backend%20only%202026%20clean%20backend/data/",
      "../devbuzz_backend/data/"
    ];
    let backendFolderFound = false;
    const refreshButton = elements.refreshBackendButton;
    const refreshLabel = refreshButton.querySelector("span:last-child");
    const originalLabel = refreshLabel.textContent;
    refreshButton.disabled = true;
    refreshLabel.textContent = "Connecting…";

    try {
      for (const folder of backendFolders) {
        const files = await Promise.all([
          fetchBackendFile(folder, "tech_dictionary.csv"),
          fetchBackendFile(folder, "monthly_share.json"),
          fetchBackendFile(folder, "monthly_share.csv"),
          fetchBackendFile(folder, "postings.csv"),
          fetchBackendFile(folder, "posting_tech.csv")
        ]);
        const dictionaryText = files[0];
        const jsonText = files[1];
        const metricsCSV = files[2];
        const postingsCSV = files[3];
        const postingTechCSV = files[4];

        if (dictionaryText || jsonText || metricsCSV || postingsCSV || postingTechCSV) {
          backendFolderFound = true;
        }

        // Read the dictionary first so imported report rows get the right category.
        const imported = { metrics: [], postings: [], postingTech: [], dictionaryLoaded: false };
        if (dictionaryText) {
          recordsFromCSV(parseCSV(dictionaryText), "tech_dictionary.csv", imported);
        }
        if (postingsCSV) {
          recordsFromCSV(parseCSV(postingsCSV), "postings.csv", imported);
        }
        if (postingTechCSV) {
          recordsFromCSV(parseCSV(postingTechCSV), "posting_tech.csv", imported);
        }

        if (jsonText) {
          try {
            const jsonRows = metricRowsFromJSON(JSON.parse(jsonText));
            imported.metrics = normalizeMetricRows(jsonRows);
          } catch (error) {
            imported.metrics = [];
          }
        }
        if (!imported.metrics.length && metricsCSV) {
          try {
            recordsFromCSV(parseCSV(metricsCSV), "monthly_share.csv", imported);
          } catch (error) {
            imported.metrics = [];
          }
        }
        if (!imported.metrics.length && imported.postings.length && imported.postingTech.length) {
          imported.metrics = calculateMetricsFromPosts(imported.postings, imported.postingTech);
        }

        if (!imported.metrics.length) continue;

        state.metrics = imported.metrics;
        state.remoteStatsByMonth = imported.postings.length ? remoteStatsFromPosts(imported.postings) : null;
        state.posts = imported.postings.length
          ? makeFeedPosts(imported.postings, imported.postingTech)
          : [];
        state.selectedMonth = monthsInData().slice(-1)[0];
        state.isDemo = false;
        state.backendConnected = true;
        state.lastLoadedAt = new Date();
        state.tablePage = 1;
        state.postsLimit = POST_PAGE_SIZE;
        renderAll();
        showToast("Connected to the backend. Monthly metrics and available job posts are loaded.");
        return true;
      }

      if (showMissingMessage || backendFolderFound) {
        showToast(backendFolderFound
          ? "Backend folder found, but report files are missing. Run run_pipeline.py, then choose Refresh data."
          : "Backend data was not found. Run the site from the project folder or import the report files.");
      }
      return false;
    } finally {
      refreshButton.disabled = false;
      refreshLabel.textContent = originalLabel;
    }
  }

  // STARTUP — Fill icons, connect controls, show the sample data, then look for backend files.
  renderIconPlaceholders(document);
  connectControls();
  updateMonthOptions();
  renderAll();
  loadGeneratedReportIfAvailable();
}());
