import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from "https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm";

console.log("✅ meta.js running");

// ---------------------------------------------------------
// Global state
// ---------------------------------------------------------
let commitProgress = 100;
let timeScale;
let commitMaxTime;
let filteredCommits;
let allData;
let colors = d3.scaleOrdinal(d3.schemeTableau10);

// ---------------------------------------------------------
// Load CSV
// ---------------------------------------------------------
async function loadData() {
  return d3.csv('loc.csv', row => ({
    ...row,
    line: +row.line,
    depth: +row.depth,
    length: +row.length,
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime)
  }));
}

// Convert rows to commit objects
function processCommits(data) {
  return d3.groups(data, d => d.commit).map(([commit, lines]) => {
    const f = lines[0];
    return {
      id: commit,
      url: 'https://github.com/YOUR_REPO/commit/' + commit,
      author: f.author,
      datetime: new Date(f.datetime),
      hourFrac: f.datetime.getHours() + f.datetime.getMinutes() / 60,
      totalLines: lines.length,
      lines
    };
  });
}

// ---------------------------------------------------------
// Stats Dashboard
// ---------------------------------------------------------
function renderCommitInfo(data, commits) {
  const container = d3.select('.stats-container');
  container.selectAll('*').remove();

  function add(label, value) {
    container.append("div").html(`<dt>${label}</dt><dd>${value}</dd>`);
  }

  if (!commits.length) {
    add('Total Lines', 0);
    add('Total Commits', 0);
    return;
  }

  add('Total Lines', data.length);
  add('Total Commits', commits.length);
  add('Files', d3.group(data, d => d.file).size);
  add('Authors', d3.group(data, d => d.author).size);
  add('Max Depth', d3.max(data, d => d.depth));
  add('Average Depth', d3.mean(data, d => d.depth).toFixed(2));
}

// ---------------------------------------------------------
// Tooltip (PATCHED)
// ---------------------------------------------------------
function showTooltip() {
  document.getElementById("commit-tooltip").removeAttribute("hidden");
}

function hideTooltip() {
  document.getElementById("commit-tooltip").setAttribute("hidden", "");
}

function moveTooltip(e) {
  const tt = document.getElementById("commit-tooltip");
  tt.style.left = e.pageX + 15 + "px";
  tt.style.top = e.pageY + 15 + "px";
}

function setTooltip(c) {
  document.getElementById("commit-link").href = c.url;
  document.getElementById("commit-link").textContent = c.id;
  document.getElementById("commit-date").textContent = c.datetime.toLocaleDateString();
  document.getElementById("tooltip-time").textContent = c.datetime.toLocaleTimeString();
  document.getElementById("commit-author").textContent = c.author;
  document.getElementById("commit-lines").textContent = c.totalLines;
}

// ---------------------------------------------------------
// Scatterplot
// ---------------------------------------------------------
function renderScatterPlot(commits) {

  d3.select("#chart-sticky").selectAll("*").remove();

  const width = 700;
  const height = 400;
  const margin = { top: 30, right: 30, bottom: 50, left: 60 };

  const svg = d3.select("#chart-sticky")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

    svg.append("text")
    .attr("x", width / 2)
    .attr("y", margin.top - 10)   // slightly above the plot area
    .attr("text-anchor", "middle")
    .attr("class", "chart-title")
    .text("Commit Log Scatterplot");

  // --------------------------
  // SCALES
  // --------------------------
  const xScale = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([margin.left, width - margin.right]);

  const yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([height - margin.bottom, margin.top]);

  const [minLines, maxLines] = d3.extent(commits, d => d.totalLines);
  const rScale = d3.scaleSqrt()
    .domain([minLines, maxLines])
    .range([2, 30]);

  // --------------------------
  // SAVE SCALES TO DOM NODE
  // --------------------------
  const svgNode = svg.node();
  svgNode.__xScale = xScale;
  svgNode.__yScale = yScale;
  svgNode.__rScale = rScale;

  console.log("Saved scales to SVG DOM node:", svgNode.__xScale, svgNode.__yScale, svgNode.__rScale);

  // --------------------------
  // AXES
  // --------------------------
  svg.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(xScale));

    svg.append("g")
    .attr("class", "y-axis")
    .attr("transform", `translate(${margin.left},0)`)
    .call(
      d3.axisLeft(yScale)
        .tickFormat(d => `${String(Math.floor(d)).padStart(2, "0")}:00`)
    );
    svg.append("text")
    .attr("class", "axis-title")
    .attr("x", width / 2)
    .attr("y", height - 10)
    .attr("text-anchor", "middle")
    .text("Commit Date");
    svg.append("text")
  .attr("class", "axis-title")
  .attr("transform", "rotate(-90)")
  .attr("x", -(height / 2))
  .attr("y", 15)
  .attr("text-anchor", "middle")
  .text("Time of Day (24h)");

  

  // --------------------------
  // DOTS
  // --------------------------
  const dots = svg.append("g").attr("class", "dots");

  const sorted = d3.sort(commits, d => -d.totalLines);

  dots.selectAll("circle")
    .data(sorted, d => d.id)
    .join("circle")
    .attr("cx", d => xScale(d.datetime))
    .attr("cy", d => yScale(d.hourFrac))
    .attr("r", d => rScale(d.totalLines))
    .attr("fill", "steelblue")
    .attr("fill-opacity", 0.7)
    .on("mouseenter", (e, c) => {
      setTooltip(c);
      showTooltip();
      moveTooltip(e);
    })
    .on("mousemove", moveTooltip)
    .on("mouseleave", hideTooltip);
}



// Update scatterplot when filtered
function updateScatterPlot(filteredCommits) {
  const svgNode = document.querySelector("#chart svg");
  if (!svgNode) return;

  const xScale = svgNode.__xScale;
  const yScale = svgNode.__yScale;
  const rScale = svgNode.__rScale;

  if (!xScale || !yScale || !rScale) return;

  xScale.domain(d3.extent(filteredCommits, d => d.datetime));

  const svg = d3.select(svgNode);

  // Update axes (keep original behavior)
  svg.select(".x-axis").call(d3.axisBottom(xScale));

  const dotsGroup = svg.select(".dots");
  const sorted = d3.sort(filteredCommits, d => -d.totalLines);

  const dots = dotsGroup
    .selectAll("circle")
    .data(sorted, d => d.id);

  dots.exit().remove();

  dots.enter()
    .append("circle")
    .attr("fill", "steelblue")
    .attr("fill-opacity", 0.7)
    .on("mouseenter", (e, c) => {
      setTooltip(c);
      showTooltip();
      moveTooltip(e);
    })
    .on("mousemove", moveTooltip)
    .on("mouseleave", hideTooltip)
    .merge(dots)
    .attr("cx", d => xScale(d.datetime))
    .attr("cy", d => yScale(d.hourFrac))
    .attr("r", d => rScale(d.totalLines));
}

// ---------------------------------------------------------
// File Unit Visualization
// ---------------------------------------------------------
function updateFileDisplay(filteredCommits) {
  const lines = filteredCommits.flatMap(d => d.lines);

  let files = d3.groups(lines, d => d.file)
    .map(([name, lines]) => ({ name, lines }))
    .sort((a, b) => b.lines.length - a.lines.length);

  const container = d3.select("#files");

  if (container.empty()) {
    console.warn("⚠️ #files container not found");
    return;
  }

  // One row per file
  const rows = container
    .selectAll("div.file-row")
    .data(files, d => d.name)
    .join(enter => {
      const row = enter.append("div").attr("class", "file-row");
      row.append("dt").append("code");
      row.append("dd");
      return row;
    });

  // Update filename + line count
  rows.select("dt code")
    .html(d => `${d.name} <small>${d.lines.length} lines</small>`);

  rows.select("dd")
    .selectAll("div.loc")
    .data(d => d.lines)
    .join("div")
    .attr("class", "loc")
    .attr("style", d => `--color: ${colors(d.type)}`);
}



// ---------------------------------------------------------
// Scrollytelling
// ---------------------------------------------------------
function generateCommitStory(commits) {
  d3.select("#scatter-story")
    .selectAll(".step")
    .data(commits)
    .join("div")
    .attr("class", "step")
    .html(d => `
      <p>
        On <strong>${d.datetime.toLocaleString([], { dateStyle: "full", timeStyle: "short" })}</strong>,
        I made a commit touching <strong>${d.totalLines}</strong> lines
        across <strong>${d3.rollups(d.lines, v => v.length, x => x.file).length}</strong> files.
      </p>
    `);
}

function setupScrollama(commits) {
  const scroller = scrollama();

  scroller.setup({
    container: "#scrolly-1",
    step: "#scatter-story .step",
    offset: 0.55
  })
  .onStepEnter(response => {
    const commit = response.element.__data__;
    const cutoff = commit.datetime;

    const filtered = commits.filter(c => c.datetime <= cutoff);

    updateScatterPlot(filtered);
    updateFileDisplay(filtered);
    renderCommitInfo(allData.filter(d => d.datetime <= cutoff), filtered);
  });
}

// ---------------------------------------------------------
// Main
// ---------------------------------------------------------
async function main() {
  allData = await loadData();
  const commits = processCommits(allData);
  window.allData = allData;
window.commits = commits;
window.filteredCommits = filteredCommits;


  filteredCommits = commits;

  renderCommitInfo(allData, commits);
  renderScatterPlot(commits);
  updateFileDisplay(commits);

  timeScale = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([0, 100]);

  document.getElementById("commit-progress").addEventListener("input", () => {
    commitProgress = +document.getElementById("commit-progress").value;
    commitMaxTime = timeScale.invert(commitProgress);

    filteredCommits = commits.filter(d => d.datetime <= commitMaxTime);

    renderCommitInfo(allData.filter(d => d.datetime <= commitMaxTime), filteredCommits);
    updateScatterPlot(filteredCommits);
    updateFileDisplay(filteredCommits);
  });

  generateCommitStory(commits);
  setupScrollama(commits);
}
function onTimeSliderChange() {
  const slider = document.getElementById("commit-progress");
  const label = document.getElementById("commit-time");
  const svgNode = document.querySelector("#chart svg");

  if (!timeScale || !commits) {
    console.warn("⛔ timeScale or commits missing.");
    return;
  }

  // Convert slider position → actual datetime
  const t = +slider.value;
  const currentTime = timeScale.invert(t);

  // Update text label
  if (label) {
    label.textContent = currentTime.toLocaleString();
  }

  // Compute filtered commits
  const filtered = commits.filter(d => d.datetime <= currentTime);

  // Update scatterplot
  updateScatterPlot(filtered);

  // Update file visualization (if you added Step 2)
  if (typeof updateFileDisplay === "function") {
    updateFileDisplay(filtered);
  }
}


main();
