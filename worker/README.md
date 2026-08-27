# Private visitor logging with Workers KV

The Worker runs on `diwu.uk/*`, returns the existing GitHub Pages origin
response unchanged, and asynchronously logs successful top-level HTML GET
requests. CSS, JavaScript, images, fonts, favicons, PDFs, robots/sitemap files,
other asset responses, and failed requests are not logged.

Each visit is one private KV entry:

```text
visits/YYYY-MM-DD/<timestamp>-<random-id>
```

Every write uses an `expirationTtl` of 2,592,000 seconds (30 days), so no cleanup
cron or database is needed. Stored values contain UTC timestamp, IP address,
Cloudflare country/region/city, path without query string, referrer origin
without path/query, and a coarse browser/OS label. There are no cookies,
advertising IDs, coordinates, full user-agent strings, or fingerprints.

## Cloudflare deployment

Wrangler creates the namespace and updates `wrangler.toml` with its ID:

```sh
cd worker
npx wrangler login
npx wrangler kv namespace create diwu-visitor-logs --binding VISITOR_LOGS --update-config
npx wrangler deploy
```

The namespace has no public endpoint. The Worker route is `diwu.uk/*`; add
`www.diwu.uk/*` only if that hostname exists and is proxied by Cloudflare.

## Local access

Wrangler uses the same authenticated account to read KV. From the repository
root run:

```sh
./sync-visitors.sh
```

This creates `visitor-logs/latest.jsonl`, newest first. For a compact table:

```sh
./recent-visitors.sh
```

The scripts use shell and Python's standard library only. Visitor logs, `.env`,
`.dev.vars`, credentials, Python cache files, and Wrangler state are ignored by
Git.

Raw IP and approximate location are personal data. This is not a legal
compliance certification: restrict Cloudflare account access, keep the 30-day
TTL, document the lawful basis, maintain a privacy contact, and periodically
review whether IP, region, and city remain necessary.
