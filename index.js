import { fetchJSON, renderProjects, fetchGitHubData } from './global.js';

console.log("✅ index.js loaded");

async function displayGitHubStats() {
  const username = "paige-saeng";

  const profileStats = document.querySelector('#profile-stats');
  const githubStats = document.querySelector('.github-stats');

  try {
    if (!profileStats && !githubStats) return;

    const githubData = await fetchGitHubData(username);
    if (!githubData) throw new Error("GitHub data was undefined (fetch failed).");

    // GitHub Profile Stats
    if (profileStats) {
      profileStats.innerHTML = `
        <dl>
          <dt>Public Repos</dt><dd>${githubData.public_repos}</dd>
          <dt>Public Gists</dt><dd>${githubData.public_gists}</dd>
          <dt>Followers</dt><dd>${githubData.followers}</dd>
          <dt>Following</dt><dd>${githubData.following}</dd>
        </dl>
      `;
    }

    // GitHub Stats (basic profile details)
    if (githubStats) {
      githubStats.innerHTML = `
        <dl>
          <dt>Username</dt><dd>${githubData.login}</dd>
          <dt>Name</dt><dd>${githubData.name ?? "(not set)"}</dd>
          <dt>Bio</dt><dd>${githubData.bio ?? "(not set)"}</dd>
          <dt>Created</dt><dd>${new Date(githubData.created_at).toLocaleDateString()}</dd>
        </dl>
      `;
    }
  } catch (error) {
    console.error('Error fetching GitHub stats:', error);

    const fallback = `
      <p><strong>GitHub load failed:</strong> ${error.message}</p>
      <p>
        Try opening this directly:
        <a href="https://api.github.com/users/${username}" target="_blank" rel="noreferrer">
          api.github.com/users/${username}
        </a>
      </p>
    `;

    if (githubStats) githubStats.innerHTML = fallback;
    if (profileStats) profileStats.innerHTML = fallback;
  }
}

displayGitHubStats();

async function displayLatestProjects() {
  try {
    const projects = await fetchJSON('./lib/projects.json');
    if (!projects) return;

    const latestProjects = projects.slice(0, 3);
    const projectsContainer = document.querySelector('.projects');

    if (projectsContainer) {
      renderProjects(latestProjects, projectsContainer, 'h2');
    } else {
      console.warn("No .projects container found on this page.");
    }
  } catch (error) {
    console.error('Error displaying latest projects:', error);
  }
}

displayLatestProjects();
