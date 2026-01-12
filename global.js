console.log("IT'S ALIVE!");

/* ---------- helpers ---------- */
function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

function isExternal(url) {
  return /^https?:\/\//i.test(url);
}

/* ---------- base path (GitHub Pages vs local) ---------- */
const BASE_PATH = "/";


/* ---------- nav ---------- */
const pages = [
  { url: "", title: "Home" },
  { url: "projects/", title: "Projects" },
  { url: "contact/", title: "Contact" },
  { url: "resume/", title: "Resume" },
  { url: "https://github.com/paige-saeng", title: "GitHub" },
];

const nav = document.createElement("nav");
document.body.prepend(nav);

for (const p of pages) {
  const a = document.createElement("a");

  const href = !p.url.startsWith("http") ? BASE_PATH + p.url : p.url;
  a.href = href;
  a.textContent = p.title;

  // mark current page (only for same host)
  if (a.host === location.host && a.pathname === location.pathname) {
    a.classList.add("current");
  }

  // open external in new tab
  if (a.host !== location.host) {
    a.target = "_blank";
    a.rel = "noopener noreferrer";
  }

  nav.append(a);
}

/* ---------- theme switcher (AUTO/LIGHT/DARK) ---------- */
document.body.insertAdjacentHTML(
  "afterbegin",
  `
  <label class="color-scheme">
    Theme:
    <select aria-label="Theme">
      <option value="auto">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>
  `
);

const themeSelect = document.querySelector(".color-scheme select");
const root = document.documentElement;

function applyTheme(value) {
  if (value === "light") {
    root.dataset.theme = "light";
    root.style.colorScheme = "light";
  } else if (value === "dark") {
    root.dataset.theme = "dark";
    root.style.colorScheme = "dark";
  } else {
    // Automatic: follow system preference
    delete root.dataset.theme;
    root.style.colorScheme = "light dark";
  }
}

themeSelect.addEventListener("change", () => {
  const value = themeSelect.value;
  localStorage.setItem("theme", value);
  applyTheme(value);
});

// load saved preference
const savedTheme = localStorage.getItem("theme") || "auto";
themeSelect.value = savedTheme;
applyTheme(savedTheme);

/* ---------- lab 4: GitHub fetch ---------- */
export async function fetchJSON(url) {
  try {
    const res = await fetch(url, {
      method: "GET",
      mode: "cors",
      cache: "no-store",
      headers: { Accept: "application/vnd.github+json" },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `HTTP ${res.status} ${res.statusText} for ${url}${body ? ` — ${body}` : ""}`
      );
    }
    return await res.json();
  } catch (err) {
    throw new Error(`Fetch error for ${url}: ${err?.message || err}`);
  }
}

export async function fetchGitHubData(username) {
  return fetchJSON(`https://api.github.com/users/${username}`);
}

/* ---------- lab 5: render projects (with Read more →) ---------- */
export function renderProjects(projects, containerElement, headingLevel = "h2") {
  if (!Array.isArray(projects)) {
    console.error("renderProjects: projects is not an array", projects);
    return;
  }
  if (!(containerElement instanceof HTMLElement)) {
    console.error("renderProjects: containerElement is invalid", containerElement);
    return;
  }

  const validHeadings = ["h1", "h2", "h3", "h4", "h5", "h6"];
  if (!validHeadings.includes(headingLevel)) headingLevel = "h2";

  containerElement.innerHTML = "";

  if (projects.length === 0) {
    containerElement.innerHTML = "<p>No projects available at the moment.</p>";
    return;
  }

  projects.forEach((project) => {
    const article = document.createElement("article");

    // Title
    const titleEl = document.createElement(headingLevel);
    titleEl.textContent = project.title || "Untitled Project";
    article.appendChild(titleEl);

    // Image
    if (project.image) {
      const img = document.createElement("img");
      img.src = project.image;
      img.alt = project.title ? `${project.title} preview` : "Project preview";
      img.onerror = () => {
        img.src = `${BASE_PATH}images/placeholder.png`;
        img.onerror = null;
      };
      article.appendChild(img);
    }

    // Info block
    const infoDiv = document.createElement("div");
    infoDiv.classList.add("project-info");

    // Teaser description (CSS clamps this)
    const desc = document.createElement("p");
    desc.classList.add("project-desc");
    desc.textContent = project.description || "No description available.";
    infoDiv.appendChild(desc);

    // Read more link
    if (project.link) {
      const link = document.createElement("a");
      link.classList.add("project-link");
      link.href = project.link;
      link.textContent = "Read more →";

      if (isExternal(project.link)) {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      }

      infoDiv.appendChild(link);
    }

    article.appendChild(infoDiv);

    // Year pinned to bottom
    if (project.year) {
      const year = document.createElement("small");
      year.textContent = project.year;
      article.appendChild(year);
    }

    containerElement.appendChild(article);
  });
}
