// projects/projects.js
import { fetchJSON, renderProjects } from '../global.js';

async function displayAllProjects() {
  try {
    // Fetch project data
    const projects = await fetchJSON('../lib/projects.json');

    const allProjectsContainer = document.querySelector(".projects-all");


    //  Render projects dynamically
renderProjects(latest, projectsContainer, "h2");

if (allProjectsContainer) {
  const allSorted = [...realProjects].sort((a, b) => b.year - a.year);
  renderProjects(allSorted, allProjectsContainer, "h3");
}


    //  Update the title with project count
    const projectsTitle = document.querySelector('.projects-title');
    if (projectsTitle) {
      projectsTitle.textContent = `Projects (${projects.length})`;
    }

    // make accessible in console
    window.projects = projects;

  } catch (error) {
    console.error('Error loading projects:', error);
  }
}

// Run the function
displayAllProjects();

