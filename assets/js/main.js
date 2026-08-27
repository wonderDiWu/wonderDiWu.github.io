const DATA_FILES = {
  profile: "data/profile.yaml",
  research: "data/research.yaml",
  funding: "data/funding.yaml",
  publications: "data/publications.yaml",
  awards: "data/awards.yaml",
  service: "data/service.yaml",
  teaching: "data/teaching.yaml",
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatPublicationAuthors(authors) {
  return String(authors)
    .split(",")
    .map((author) => {
      const name = author.trim();
      return name === "Di Wu" ? `<strong>${escapeHtml(name)}</strong>` : escapeHtml(name);
    })
    .join(", ");
}

const ICON_PATHS = {
  target: '<circle cx="12" cy="12" r="9"></circle><circle cx="12" cy="12" r="5"></circle><circle cx="12" cy="12" r="1"></circle>',
  fileText: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6"></path><path d="M8 13h8"></path><path d="M8 17h8"></path>',
  trophy: '<path d="M8 21h8"></path><path d="M12 17v4"></path><path d="M7 4h10v5a5 5 0 0 1-10 0z"></path><path d="M7 6H4v2a4 4 0 0 0 4 4"></path><path d="M17 6h3v2a4 4 0 0 1-4 4"></path>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>',
  bookOpen: '<path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z"></path><path d="M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z"></path>',
  microphone: '<rect x="9" y="2" width="6" height="12" rx="3"></rect><path d="M5 10a7 7 0 0 0 14 0"></path><path d="M12 17v5"></path><path d="M8 22h8"></path>',
  star: '<path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"></path>',
};

function renderIcon(name, className = "") {
  const paths = ICON_PATHS[name];
  return paths
    ? `<svg class="icon ${escapeHtml(className)}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`
    : "";
}

function parseScalar(raw) {
  const value = raw.trim();

  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1).replace(/\\"/g, '"').replace(/\\'/g, "'");
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  if (value === "null" || value === "~") {
    return null;
  }

  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }

  return value;
}

// Minimal YAML parser for the small, indentation-based schema used in /data.
function parseYaml(text) {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  let index = 0;

  const indentOf = (line) => line.match(/^\s*/)[0].length;
  const isBlank = (line) => !line || !line.trim();

  const skipBlank = () => {
    while (index < lines.length && isBlank(lines[index])) {
      index += 1;
    }
  };

  const parseNode = (indent) => {
    skipBlank();
    if (index >= lines.length) {
      return null;
    }

    const line = lines[index];
    const lineIndent = indentOf(line);

    if (lineIndent < indent) {
      return null;
    }

    if (line.trim().startsWith("- ")) {
      return parseSequence(indent);
    }

    return parseMapping(indent);
  };

  const parseMapping = (indent) => {
    const object = {};

    while (index < lines.length) {
      skipBlank();
      if (index >= lines.length) {
        break;
      }

      const line = lines[index];
      const lineIndent = indentOf(line);

      if (lineIndent < indent) {
        break;
      }

      if (lineIndent > indent) {
        break;
      }

      const trimmed = line.trim();

      if (trimmed.startsWith("- ")) {
        break;
      }

      const colonIndex = trimmed.indexOf(":");
      if (colonIndex === -1) {
        index += 1;
        continue;
      }

      const key = trimmed.slice(0, colonIndex).trim();
      const rawValue = trimmed.slice(colonIndex + 1).trim();
      index += 1;

      if (rawValue) {
        object[key] = parseScalar(rawValue);
        continue;
      }

      skipBlank();
      if (index < lines.length && indentOf(lines[index]) > lineIndent) {
        object[key] = parseNode(lineIndent + 2);
      } else {
        object[key] = "";
      }
    }

    return object;
  };

  const parseSequence = (indent) => {
    const items = [];

    while (index < lines.length) {
      skipBlank();
      if (index >= lines.length) {
        break;
      }

      const line = lines[index];
      const lineIndent = indentOf(line);

      if (lineIndent < indent) {
        break;
      }

      const trimmed = line.trim();
      if (!trimmed.startsWith("- ")) {
        break;
      }

      const rest = trimmed.slice(2).trim();
      index += 1;

      if (!rest) {
        skipBlank();
        if (index < lines.length && indentOf(lines[index]) > lineIndent) {
          items.push(parseNode(lineIndent + 2));
        }
        continue;
      }

      const colonIndex = rest.indexOf(":");
      if (colonIndex === -1) {
        items.push(parseScalar(rest));
        continue;
      }

      const item = {};
      const key = rest.slice(0, colonIndex).trim();
      const rawValue = rest.slice(colonIndex + 1).trim();
      item[key] = rawValue ? parseScalar(rawValue) : "";

      skipBlank();
      if (index < lines.length && indentOf(lines[index]) > lineIndent) {
        const child = parseNode(lineIndent + 2);
        if (child && typeof child === "object" && !Array.isArray(child)) {
          Object.assign(item, child);
        } else if (child !== null) {
          item.value = child;
        }
      }

      items.push(item);
    }

    return items;
  };

  return parseNode(0) || {};
}

async function loadYamlFile(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }

  return parseYaml(await response.text());
}

async function loadSiteData() {
  const [profile, research, funding, publications, awards, service, teaching] = await Promise.all([
    loadYamlFile(DATA_FILES.profile),
    loadYamlFile(DATA_FILES.research),
    loadYamlFile(DATA_FILES.funding),
    loadYamlFile(DATA_FILES.publications),
    loadYamlFile(DATA_FILES.awards),
    loadYamlFile(DATA_FILES.service),
    loadYamlFile(DATA_FILES.teaching),
  ]);

  return { profile, research, funding, publications, awards, service, teaching };
}

function renderProfile(container, profile) {
  const links = Array.isArray(profile.links) ? profile.links : [];
  const photo = profile.hero.photo || "images/avatar.jpg";
  const photoAlt = profile.hero.photoAlt || `${profile.hero.name} portrait`;

  container.innerHTML = `
    <div class="hero-copy">
      <h1 id="hero-title">${escapeHtml(profile.hero.name)}</h1>
      <p class="role">${escapeHtml(profile.hero.role)}<br>${escapeHtml(profile.hero.institution)}</p>
      <p class="bio">${escapeHtml(profile.hero.bio)}</p>
      <ul class="quick-links" aria-label="Profile links">
        ${links
          .map(
            (link) => `
              <li><a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a></li>
            `
          )
          .join("")}
      </ul>
    </div>
    <figure class="hero-photo">
      <img src="${escapeHtml(photo)}" alt="${escapeHtml(photoAlt)}" width="220" height="275" loading="eager" fetchpriority="high" decoding="async">
    </figure>
  `;
}

function renderSectionTitles(profile) {
  const titles = profile.sections || {};
  const icons = {
    research: "target",
    publications: "fileText",
    awards: "trophy",
    activities: "users",
    teaching: "bookOpen",
  };

  document.querySelectorAll("[data-section-title]").forEach((node) => {
    const key = node.dataset.sectionTitle;
    if (titles[key]) {
      node.innerHTML = `${renderIcon(icons[key], "section-icon")}<span>${escapeHtml(titles[key])}</span>`;
    }
  });

  if (profile.pageTitle) {
    document.title = profile.pageTitle;
  }
}

function renderResearch(container, research) {
  container.innerHTML = `
    <p class="section-intro">${escapeHtml(research.intro)}</p>
  `;
}

function renderFunding(container, items) {
  container.innerHTML = `
    <div class="funding-list">
      ${(items || [])
        .map(
          (item) => `
            <article class="funding-item">
              <div class="funding-heading">
                <h3>${escapeHtml(item.title)}</h3>
                <span class="funding-amount">${escapeHtml(item.amount)}</span>
              </div>
              <p class="funding-meta">${[item.role, item.agency, item.duration]
                .filter(Boolean)
                .map((part) => escapeHtml(part))
                .join(' <span aria-hidden="true">·</span> ')}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderPublicationTabs(container, groups) {
  container.innerHTML = `
    <div class="publication-tabs" data-publication-tabs>
      <div class="tab-list" role="tablist" aria-label="Publication research themes">
        ${groups
          .map(
            (group, index) => `
              <button type="button" id="tab-${escapeHtml(group.id)}" class="tab-button" role="tab" aria-selected="false" aria-controls="panel-${escapeHtml(
              group.id
            )}" data-tab-target="${escapeHtml(group.id)}" tabindex="${index === 0 ? "0" : "-1"}">${escapeHtml(
              group.title
            )}</button>
            `
          )
          .join("")}
      </div>
      <div class="publication-panels">
        ${groups
          .map(
            (group) => `
              <article id="panel-${escapeHtml(group.id)}" class="publication-panel" role="tabpanel" aria-labelledby="tab-${escapeHtml(
              group.id
            )}" data-tab-panel="${escapeHtml(group.id)}" hidden>
                <ol class="publication-list">
                  ${(group.items || [])
                    .map(
                      (item) => `
                        <li>
                          <div class="publication-details">
                            <div class="publication-heading">
                              <p class="entry-title">${
                                item.url
                                  ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a>`
                                  : escapeHtml(item.title)
                              }</p>
                              <span class="venue-badge venue-${escapeHtml(item.venueTone || "default")}" title="${escapeHtml(
                                item.venue
                              )}">${escapeHtml(item.venueShort || item.venue)} '${escapeHtml(String(item.year).slice(-2))}</span>
                            </div>
                            ${
                              item.highlight
                                ? `<p class="publication-highlight" title="${escapeHtml(item.highlight)}">${escapeHtml(item.highlight)}</p>`
                                : ""
                            }
                            ${item.authors ? `<p class="entry-authors">${formatPublicationAuthors(item.authors)}</p>` : ""}
                          </div>
                        </li>
                      `
                    )
                    .join("")}
                </ol>
              </article>
            `
          )
          .join("")}
      </div>
    </div>
  `;

  const tabRoot = container.querySelector("[data-publication-tabs]");
  if (!tabRoot) {
    return;
  }

  const tabs = [...tabRoot.querySelectorAll("[role='tab']")];
  const panels = [...tabRoot.querySelectorAll("[role='tabpanel']")];

  const activateTab = (tab) => {
    const target = tab.dataset.tabTarget;

    tabs.forEach((item) => {
      const isActive = item === tab;
      item.classList.toggle("is-active", isActive);
      item.setAttribute("aria-selected", String(isActive));
      item.tabIndex = isActive ? 0 : -1;
    });

    panels.forEach((panel) => {
      const isActive = panel.dataset.tabPanel === target;
      panel.classList.toggle("is-active", isActive);
      panel.hidden = !isActive;
    });
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activateTab(tab));
    tab.addEventListener("keydown", (event) => {
      const previous = event.key === "ArrowLeft";
      const next = event.key === "ArrowRight";

      if (!previous && !next) {
        return;
      }

      event.preventDefault();
      const direction = next ? 1 : -1;
      const nextIndex = (index + direction + tabs.length) % tabs.length;
      tabs[nextIndex].focus();
      activateTab(tabs[nextIndex]);
    });
  });

  if (tabs[0]) {
    activateTab(tabs[0]);
  }
}

function formatCompactLine(item) {
  const pieces = [];
  const label = item.year || item.label || item.date;

  if (label) {
    pieces.push(`<span class="compact-meta">${escapeHtml(label)}</span>`);
  }

  pieces.push(escapeHtml(item.title || ""));

  if (item.detail) {
    pieces.push(escapeHtml(item.detail));
  }

  return pieces.join(" <span class=\"compact-separator\">—</span> ");
}

function renderCompactList(container, items) {
  container.innerHTML = `
    <ul class="compact-list">
      ${(items || [])
        .map(
          (item) => `
            <li><span class="compact-item">${formatCompactLine(item)}</span></li>
          `
        )
        .join("")}
    </ul>
  `;
}

function renderGroupedCompactLists(container, groups) {
  const groupIcons = {
    Talks: "microphone",
    "Other Activities": "star",
  };

  container.innerHTML = `
    <div class="compact-groups">
      ${(groups || [])
        .map(
          (group) => `
            <section class="compact-group">
              <h3>${renderIcon(groupIcons[group.heading], "subsection-icon")}${escapeHtml(group.heading)}</h3>
              ${group.items && group.items.length ? `<ul class="compact-list">
                ${(group.items || [])
                  .map(
                    (item) => `
                      <li><span class="compact-item">${formatCompactLine(item)}</span></li>
                    `
                  )
                  .join("")}
              </ul>` : ""}
            </section>
          `
        )
        .join("")}
    </div>
  `;
}

function renderTeaching(container, teaching) {
  container.innerHTML = `
    <div class="teaching-sections">
      ${(teaching.sections || [])
        .map(
          (section) => `
            <section class="teaching-section">
              <h3>${escapeHtml(section.heading)}</h3>
              <div class="teaching-groups">
                ${(section.groups || [])
                  .map(
                    (group) => `
                      <section class="teaching-group">
                        <h4>${escapeHtml(group.heading)}</h4>
                        <ul class="compact-list">
                          ${(group.items || [])
                            .map(
                              (item) => `
                                <li><span class="compact-item"><strong>${escapeHtml(item.title)}</strong>${
                                  item.detail
                                    ? ` <span class="compact-separator">—</span> ${escapeHtml(item.detail)}`
                                    : ""
                                }</span></li>
                              `
                            )
                            .join("")}
                        </ul>
                      </section>
                    `
                  )
                  .join("")}
              </div>
            </section>
          `
        )
        .join("")}
    </div>
  `;
}

function setMeta(name, content, attribute = "name") {
  const selector = `meta[${attribute}="${name}"]`;
  const node = document.querySelector(selector);
  if (node && content) {
    node.setAttribute("content", content);
  }
}

function updateMetadata(profile) {
  if (profile.pageTitle) {
    document.title = profile.pageTitle;
  }

  if (profile.pageDescription) {
    setMeta("description", profile.pageDescription);
    setMeta("og:description", profile.pageDescription, "property");
    setMeta("twitter:description", profile.pageDescription, "name");
  }

  if (profile.pageTitle) {
    setMeta("og:title", profile.pageTitle, "property");
    setMeta("twitter:title", profile.pageTitle, "name");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const data = await loadSiteData();
    const profileContainer = document.querySelector("[data-render='profile']");
    const researchContainer = document.querySelector("[data-render='research']");
    const fundingContainer = document.querySelector("[data-render='funding']");
    const publicationsContainer = document.querySelector("[data-render='publications']");
    const awardsContainer = document.querySelector("[data-render='awards']");
    const activitiesContainer = document.querySelector("[data-render='activities']");
    const teachingContainer = document.querySelector("[data-render='teaching']");

    if (profileContainer) {
      renderProfile(profileContainer, data.profile);
    }

    renderSectionTitles(data.profile);
    updateMetadata(data.profile);

    if (researchContainer) {
      renderResearch(researchContainer, data.research);
    }

    if (fundingContainer) {
      renderFunding(fundingContainer, data.funding.items || []);
    }

    if (publicationsContainer) {
      renderPublicationTabs(publicationsContainer, data.publications.groups || []);
    }

    if (awardsContainer) {
      renderCompactList(awardsContainer, data.awards.items || []);
    }

    if (activitiesContainer) {
      renderGroupedCompactLists(activitiesContainer, data.service.groups || []);
    }

    if (teachingContainer) {
      renderTeaching(teachingContainer, data.teaching);
    }

  } catch (error) {
    console.error(error);
  }
});
