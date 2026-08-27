# Di Wu

One-page academic homepage for Di Wu.

This site is intentionally plain static HTML, CSS, and a small amount of
vanilla JavaScript. There is no framework, build step, package manager, or
generated template layer.

All editable content lives in YAML files under `data/`. The HTML only defines
page structure and the JavaScript renderer loads the YAML at runtime.

## Content map

- `data/profile.yaml`: hero copy, hero photo, profile links, section titles, page metadata
- `data/research.yaml`: research vision paragraph and keyword list
- `data/publications.yaml`: publication groups and representative papers
- `data/awards.yaml`: awards and funding history
- `data/service.yaml`: conference PC, journal reviewer, and invited talk entries
- `data/teaching.yaml`: teaching and supervision notes

## Updating content

### Add a publication

Edit `data/publications.yaml` and add a new item under the relevant group:

```yaml
- title: New Paper Title
  venue: Conference Name
  year: 2026
```

### Add a new course

Edit `data/teaching.yaml` and add a new course under the relevant institution:

```yaml
- title: CS7001
  detail: Lab demonstrator
```

### Add a new award

Edit `data/awards.yaml` and append a new award record:

```yaml
- year: 2024
  title: Example Award
  detail: Short explanation of the award and context.
```

### Add a new reviewer role

Edit `data/service.yaml` and add a new item under `Journal Reviewer`:

```yaml
- year: 2025-present
  title: IEEE Internet of Things Journal
  detail: Journal reviewer service.
```

The same file also holds conference program committee service and invited
talks, so those can be updated in the same place.

## Local preview

```sh
python3 -m http.server 4000
```

Then open `http://127.0.0.1:4000/`.

Because the page loads YAML files at runtime, it should be previewed through a
local server rather than by opening `index.html` directly.

## Private visitor logging

The Cloudflare Worker in `worker/` proxies the existing GitHub Pages site and
writes one private Workers KV entry for each successful HTML page navigation.
Run `./sync-visitors.sh` to create `visitor-logs/latest.jsonl` locally. See
`worker/README.md` for setup and operations.

## Local analytics dashboard

Run `./open-dashboard.sh` to sync the latest KV records, start a private server
on `127.0.0.1:8765` (or the next available port), and open the dashboard in the
default browser. Use the on-screen **Refresh data** button to sync again, and
press Ctrl+C in the terminal to stop the server. Generated dashboard files and
visitor data are local and gitignored.
