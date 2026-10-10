# 12 — Deployment to the VPS

What has to exist outside this repository before the first deploy can succeed, in the order to do it. The mechanics (Docker Hub image, GitHub Actions, `docker compose` on the VPS, nginx + certbot in front, Ofelia for cron) follow `vps_hosting`; this page only lists the bzim-specific values and steps.

Hostnames:

| What | Hostname | Container |
|---|---|---|
| Web app | `bijzijnismeemaken.milovanderpas.nl` | `bzim-web` (port 3000) |
| English alias | `bethereorbesquare.milovanderpas.nl` | none: a permanent redirect to the web app, in the proxy |
| API | `bijzijnismeemaken-api.milovanderpas.nl` | `bzim-api` (port 3000) |

One app, one origin. The English name only redirects: the app is built around a single origin (CORS, the origin check, the Google sign-in return, invite links and emails, the installed PWA), and serving it on two hostnames would mean two sessions and two icons on a phone.

The two are siblings under `milovanderpas.nl`, not parent and child. That is why `COOKIE_DOMAIN` stays empty: the session cookies are host-only on the API hostname, and a same-site request from the app carries them under `SameSite=Lax`. Setting `Domain=.milovanderpas.nl` would hand the cookies to every other app on the domain.

## 1. DNS

Three A records at the registrar, all to the VPS (`159.195.28.227`):

```
bijzijnismeemaken.milovanderpas.nl      A   159.195.28.227
bethereorbesquare.milovanderpas.nl      A   159.195.28.227
bijzijnismeemaken-api.milovanderpas.nl  A   159.195.28.227
```

Check before going on, certbot needs them live:

```bash
dig +short bijzijnismeemaken.milovanderpas.nl
dig +short bethereorbesquare.milovanderpas.nl
dig +short bijzijnismeemaken-api.milovanderpas.nl
```

## 2. Database

Nothing on the VPS runs MySQL. Use the same external MySQL the other APIs use:

1. Create a database `bzim` (utf8mb4).
2. Create a user with rights on that database only.
3. Allow connections from the VPS IP if the provider restricts hosts.
4. Note host, port, user, password and name for the secrets below.

Migrations run from the API container on every deploy, so the database only needs to exist and be empty.

## 3. Docker Hub

The workflows push `milovdpas8/bzim-api` and `milovdpas8/bzim-web`. Docker Hub creates a repository on first push, as **public**. If you want them private, create both repositories in the Docker Hub UI first and set them private before the first deploy.

## 4. GitHub: environment, secrets and variables

Both workflows use `environment: production`. Create it under *Settings → Environments* (no protection rules needed), then add the entries below under *Settings → Secrets and variables → Actions*. Repository-level is fine; environment-level also works.

Generate the random values on your machine:

```bash
openssl rand -base64 48                                                               # JWT_SECRET
openssl rand -hex 32                                                                  # WORKER_TOKEN
node -e "console.log('base64:'+require('crypto').randomBytes(32).toString('base64'))" # APP_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"           # CALENDAR_TOKEN_KEY
```

Secrets:

| Name | Value |
|---|---|
| `DOCKERHUB_USERNAME` | `milovdpas8` |
| `DOCKERHUB_TOKEN` | a Docker Hub access token with read/write |
| `VPS_HOST` | `159.195.28.227` |
| `VPS_USER` | `deploy` |
| `VPS_SSH_PRIVATE_KEY` | the CI deploy key from `vps_hosting/keys` |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | from step 2 |
| `JWT_SECRET` | generated above |
| `APP_KEY` | generated above, **including the `base64:` prefix**. Never rotate it afterwards: it encrypts the email column, and a new key makes every existing row unreadable |
| `WORKER_TOKEN` | generated above |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | from step 5 |
| `BREVO_API_KEY` | from step 6 |
| `UNSPLASH_ACCESS_KEY` | the Access Key of a free Unsplash developer app (unsplash.com/developers, demo tier: 50 searches an hour) for the photo search in the activity form. Optional: without it the search answers "not available" and pasting a link still works |
| `CALENDAR_TOKEN_KEY` | generated above. Not read until the calendar milestone, but setting it now means no second round later |

Variables (not secrets):

| Name | Value |
|---|---|
| `APP_URL` | `https://bijzijnismeemaken.milovanderpas.nl` |
| `API_URL` | `https://bijzijnismeemaken-api.milovanderpas.nl` |
| `COOKIE_DOMAIN` | leave empty (see the top of this page) |
| `TRUST_PROXY_HOPS` | `1` (one nginx in front) |
| `MAIL_FROM_EMAIL` | `noreply@milovanderpas.nl` |
| `MAIL_FROM_NAME` | `Bij zijn is meemaken` |

The API workflow refuses to deploy when any of `DB_HOST DB_USER DB_NAME JWT_SECRET APP_KEY WORKER_TOKEN APP_URL API_URL` renders empty, so a typo in a name shows up in the Actions log rather than on the server.

## 5. Google OAuth

In the Google Cloud project that holds the OAuth client already used locally, under the **Web application** client:

- Authorised JavaScript origin: `https://bijzijnismeemaken.milovanderpas.nl`
- Authorised redirect URI: `https://bijzijnismeemaken-api.milovanderpas.nl/api/v1/auth/google/callback`

Keep the localhost entries so local sign-in keeps working. On the OAuth consent screen, set the publishing status to **In production** once the calendar scopes arrive (M2); for sign-in alone, Testing with your friends as test users is enough, but test users' refresh tokens expire after seven days, which will bite the moment calendar sync lands. Easier to publish now.

## 6. Brevo

1. Create an API key (SMTP & API → API keys) and store it as `BREVO_API_KEY`.
2. Authenticate the sender domain `milovanderpas.nl` (Senders & IPs → Domains): add the DKIM and the Brevo verification records at the registrar. Without them the first emails land in spam or are refused.
3. Add `noreply@milovanderpas.nl` as a sender.

Production uses the HTTP API (`MAIL_DRIVER=brevo`, set in `.env.dist`), so no SMTP ports have to be open on the VPS.

## 7. VPS: proxy and certificates

Two conf files in `/opt/apps/proxy/conf.d/`, created as `.conf.disabled` and **left disabled until after the first deploy**. nginx refuses to load a conf whose certificate does not exist yet, and also one whose `proxy_pass` names a container that does not exist yet (`host not found in upstream "bzim-api"`). Certificates can be issued now; the confs are switched on in step 8, once the two containers run.

`bzim-web.conf` (the app, plus the English alias as a redirect; one certificate covers both names):

```nginx
server {
    listen 443 ssl;
    http2 on;
    server_name bijzijnismeemaken.milovanderpas.nl;

    ssl_certificate     /etc/letsencrypt/live/bijzijnismeemaken.milovanderpas.nl/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bijzijnismeemaken.milovanderpas.nl/privkey.pem;

    location / {
        proxy_pass http://bzim-web:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# The English name: same certificate, nothing but a redirect.
server {
    listen 443 ssl;
    http2 on;
    server_name bethereorbesquare.milovanderpas.nl;

    ssl_certificate     /etc/letsencrypt/live/bijzijnismeemaken.milovanderpas.nl/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bijzijnismeemaken.milovanderpas.nl/privkey.pem;

    return 301 https://bijzijnismeemaken.milovanderpas.nl$request_uri;
}
```

`bzim-api.conf`:

```nginx
server {
    listen 443 ssl;
    http2 on;
    server_name bijzijnismeemaken-api.milovanderpas.nl;

    ssl_certificate     /etc/letsencrypt/live/bijzijnismeemaken-api.milovanderpas.nl/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bijzijnismeemaken-api.milovanderpas.nl/privkey.pem;

    location / {
        proxy_pass http://bzim-api:3000;
        proxy_set_header Host $host;
        # The rate limiters key on the real client address.
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

No `client_max_body_size`: the largest request is an activity form, far below the 1m default.

Then, on the VPS:

```bash
cd /opt/apps/proxy
docker compose up -d

# Both web names on ONE certificate; the first -d names the /etc/letsencrypt/live/ directory.
docker compose run --rm --entrypoint certbot certbot certonly --webroot -w /var/www/certbot \
  -d bijzijnismeemaken.milovanderpas.nl -d bethereorbesquare.milovanderpas.nl \
  --email vanderpasmilo@gmail.com --agree-tos --no-eff-email

docker compose run --rm --entrypoint certbot certbot certonly --webroot -w /var/www/certbot \
  -d bijzijnismeemaken-api.milovanderpas.nl \
  --email vanderpasmilo@gmail.com --agree-tos --no-eff-email

```

Leave both files as `.conf.disabled` for now. Enabling them before the containers exist fails the whole nginx config test, which would also block reloads for every other app on the proxy.

## 8. First deploy

The workflows are committed (first deploy done 2026-10-10), so **every push to `main` that touches `apps/api`, `apps/web` or `packages` deploys**. For a fresh environment the order matters:

1. **API first.** `deploy-api.yml` renders `/opt/apps/bzim/.env` from `apps/api/.env.dist`; the web deploy reads the same file for the image name and refuses to run without it. Push, or trigger it under *Actions → Deploy API to VPS → Run workflow*.
2. **Then web.** Trigger `deploy-web.yml` the same way. The two `NEXT_PUBLIC_` URLs are baked into the image at build time from the variables above, so a hostname change later means a rebuild, not an `.env` edit.

The API workflow runs the migrations inside the container after it is healthy, restarts the Ofelia scheduler so the cron labels register, and verifies the health endpoint reports the database as reachable.

3. **Then switch the proxy on.** Both containers exist now, so nginx can resolve them:

```bash
cd /opt/apps/proxy
mv conf.d/bzim-web.conf.disabled conf.d/bzim-web.conf
mv conf.d/bzim-api.conf.disabled conf.d/bzim-api.conf
docker exec proxy nginx -t && docker exec proxy nginx -s reload
```

If `nginx -t` still complains about an upstream, `docker ps` must show `bzim-api` and `bzim-web` on the `web` network before this can pass.

## 9. Verify

```bash
curl -s https://bijzijnismeemaken-api.milovanderpas.nl/api/v1/health
# {"status":"ok","database":true,...}

curl -I https://bijzijnismeemaken.milovanderpas.nl
# HTTP/2 200

curl -I https://bethereorbesquare.milovanderpas.nl
# HTTP/2 301, location: https://bijzijnismeemaken.milovanderpas.nl/

docker logs scheduler 2>&1 | grep 'job registered'
# two bzim lines: bzim-cleanup and bzim-calendar-sync
```

Then the real test: sign in with Google on the production app, finish onboarding, create a group, invite a second account by handle and check the invitation email arrives from Brevo.

## 10. Known gaps before go-live

- **Generated avatars (parked 2026-10-10).** The sixteen icon tiles stay for now. When wanted: DiceBear inside the app (no API, no key; several public-domain styles, so no attribution), a style plus a seed per person, a picker with shuffle. Not Unsplash: a photo credit cannot sit on a 32-pixel avatar, and a stranger's portrait as a friend's face is odd. About one session; slot it beside the M3 polish tasks.

- **Unsplash production tier.** The photo search runs on a demo key (50 searches an hour, app id 1098263). Apply for production (1,000 an hour) once that limit is felt. Their checklist: hotlinking (done), the download ping (done), no Unsplash branding in the app name (done), an accurate name and description in their form, and the "Photo by Name on Unsplash" credit with both links wherever a photo is shown, with screenshots. The picker credits already; the activity page credit lands with task 21, which stores the photographer beside the image URL.

- **Worker runner.** The compose labels call `node dist/tools/worker.js`, which lands with task 32 together with the cleanup job. Until then the two scheduled jobs are registered but fail at run time, which is harmless: the API itself does not depend on them. Task 32 also double-checks the migration command the workflow uses against the compiled image.
- **Calendar sync** is M2. `CALENDAR_TOKEN_KEY` can already be set; nothing reads it yet.
- **Add to the VPS inventory.** After the first green deploy, add both hostnames to the table in `vps_hosting/03-architecture.md` and the proxy conf list in `02-reverse-proxy-and-tls.md`, as the checklist there asks.
