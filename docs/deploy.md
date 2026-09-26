# Putting OfficeYak on a server

Written to be followed once, from a laptop, in about half an hour, by somebody
who has used a terminal before but does not administer servers for a living.
Every command is meant to be pasted as it is. Where a value has to be your own,
it says so.

The shape of it: one small box, Caddy in front for HTTPS, the app behind it on
port 3000, SQLite on the disk, and systemd keeping all of it alive.

---

## Before you start

You need three things:

1. **A server.** Two cores and 4 GB of memory is comfortable for the first few
   consultancies. Ubuntu 24.04.
2. **The domain**, with its DNS under your control.
3. **An SMTP account** for sending mail. Not Gmail: use a sending service
   whose deliverability you can configure, such as Amazon SES, Postmark or
   Brevo. Section 7 explains why this one matters more than it looks.

---

## 1. DNS

Two records, both pointing at the server's address:

| Type | Name | Value |
| ---- | ---- | ----- |
| A | `officeyak.com` | your server's IPv4 address |
| A | `*.officeyak.com` | the same address |

The wildcard is what gives every consultancy their own address. Nothing else
is needed for it: certificates are fetched one at a time, as each subdomain is
first visited, and only for names the app confirms are real.

Check both resolve before going further. From your laptop:

```bash
dig +short officeyak.com
dig +short anything.officeyak.com
```

---

## 2. The box

```bash
ssh root@your-server

# Kathmandu time, so "six in the morning" in the schedules means what it says.
timedatectl set-timezone Asia/Kathmandu

apt update && apt upgrade -y
apt install -y curl git ufw

# Node 22 or newer: the database driver is node:sqlite, which is built in.
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
node -v          # expect v22 or higher

# Only these three ways in.
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw --force enable
```

A user for the app, which owns nothing else on the machine:

```bash
adduser --system --group --home /srv/officeyak officeyak
mkdir -p /srv/officeyak /etc/officeyak /var/log/caddy
chown -R officeyak:officeyak /srv/officeyak
```

---

## 3. The application

```bash
cd /srv
rm -rf officeyak && git clone https://github.com/dmpravinadhikari-lang/stride.np.git officeyak
chown -R officeyak:officeyak /srv/officeyak

sudo -u officeyak bash -lc 'cd /srv/officeyak && npm ci && npm run build'
```

`npm run build` takes a few minutes on a small box. If it runs out of memory,
give it more room for that one command:

```bash
sudo -u officeyak bash -lc 'cd /srv/officeyak && NODE_OPTIONS=--max-old-space-size=2048 npm run build'
```

---

## 4. The settings and the keys

```bash
cp /srv/officeyak/deploy/officeyak.env.example /etc/officeyak/officeyak.env
chown root:root /etc/officeyak/officeyak.env
chmod 600 /etc/officeyak/officeyak.env

# Three separate keys. Run this three times and paste each result once.
openssl rand -base64 32
```

Then edit `/etc/officeyak/officeyak.env` and fill in every line marked `CHANGE ME`.

**Keep a copy of `OFFICEYAK_FILE_KEY` and `OFFICEYAK_BACKUP_KEY` somewhere that is
not this server.** Losing the first loses every uploaded document; losing the
second loses every backup. A password manager is the right place. This is the
one step in this document that cannot be undone later.

Check it before starting anything:

```bash
cd /srv/officeyak
set -a; . /etc/officeyak/officeyak.env; set +a
NODE_ENV=production sudo -u officeyak --preserve-env npm run preflight
```

It prints a line per setting and refuses, with a reason, if anything important
is wrong. Fix what it names and run it again until nothing says FAIL.

---

## 5. Keeping it running

```bash
cp /srv/officeyak/deploy/officeyak.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now officeyak

systemctl status officeyak          # should say active (running)
curl -I http://127.0.0.1:3000/   # should say 200
journalctl -u officeyak -n 50       # what it said while starting
```

The unit runs the preflight before the app every time, so a server that is
misconfigured refuses to start rather than coming up quietly wrong.

---

## 6. HTTPS

```bash
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy

cp /srv/officeyak/deploy/Caddyfile /etc/caddy/Caddyfile
# Change officeyak.com and the email address in it if yours differ.
nano /etc/caddy/Caddyfile

caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
```

Now open `https://officeyak.com` in a browser. The first visit to any
consultancy subdomain takes a second or two longer while its certificate is
fetched.

To prove the on-demand check is working, which is what stops somebody pointing
their own domain here and exhausting our certificate quota:

```bash
curl -i "http://127.0.0.1:3000/api/tls-check?domain=officeyak.com"     # 200
curl -i "http://127.0.0.1:3000/api/tls-check?domain=nonsense.example"  # 404
```

---

## 7. Making email actually arrive

This is the step that decides whether the product works. A student is told at
the counter to expect an email; if it lands in spam, the consultancy concludes
OfficeYak is broken, and they are not wrong.

Three DNS records on the domain you send from. The exact values come from your
sending service:

| Type | Name | Purpose |
| ---- | ---- | ------- |
| TXT | `officeyak.com` | SPF, naming your sending service as allowed |
| TXT | `<selector>._domainkey.officeyak.com` | DKIM, the signing key from that service |
| TXT | `_dmarc.officeyak.com` | DMARC, start with `v=DMARC1; p=none; rua=mailto:you@officeyak.com` |

Then test it properly rather than hoping:

```bash
systemctl start officeyak-cron@flush
journalctl -u officeyak-cron -n 20
```

Sign up a test consultancy at `https://officeyak.com/signup`, add a student
with an address at Gmail, another at Outlook, and a third at a Nepali provider,
and check where each invitation lands. Fix the records until all three reach
the inbox. Do this before the first real customer, not after.

---

## 8. The schedules

```bash
cp /srv/officeyak/deploy/officeyak-cron@.service /etc/systemd/system/
cp /srv/officeyak/deploy/officeyak-cron-*.timer /etc/systemd/system/
cp /srv/officeyak/deploy/officeyak-backup.* /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now officeyak-cron-daily.timer officeyak-cron-weekly.timer officeyak-cron-flush.timer officeyak-backup.timer

systemctl list-timers 'officeyak*'
```

Without these, no automatic email ever leaves the building and there are no
backups. Everything else would look fine, which is what makes it worth
checking now:

```bash
systemctl start officeyak-cron@daily
journalctl -u officeyak-cron -n 30
```

---

## 9. Backups, and proving they work

The nightly timer writes one encrypted archive to
`/srv/officeyak/data/backups`. **An archive on the same disk as the database is
not a backup.** Add a command that copies it somewhere else to
`officeyak-backup.service`, where there is a commented line ready for it.

Then do the part everybody skips, once, now:

```bash
systemctl start officeyak-backup
ls -lh /srv/officeyak/data/backups

sudo -u officeyak bash -lc 'cd /srv/officeyak && npm run backup -- --restore data/backups/<the file> --out /tmp/restore-test'
ls /tmp/restore-test/srv/officeyak/data
rm -rf /tmp/restore-test
```

An untested backup is a belief, not a backup. Put a repeat of this drill in the
calendar every three months.

---

## 10. Updating it later

```bash
cd /srv/officeyak
sudo -u officeyak git pull
sudo -u officeyak npm ci
sudo -u officeyak npm run build
systemctl restart officeyak
```

The database migrates itself on boot: new tables and columns are added when
the app starts, and nothing existing is rewritten. Take a backup first anyway.

---

## If something is wrong

| What you see | Where to look |
| ------------ | ------------- |
| The site does not load at all | `systemctl status caddy`, then `journalctl -u caddy -n 50` |
| A 502 from Caddy | The app is down: `systemctl status officeyak`, `journalctl -u officeyak -n 100` |
| It refuses to start | The preflight said why. `journalctl -u officeyak -n 30` |
| A subdomain has no certificate | `curl -i "http://127.0.0.1:3000/api/tls-check?domain=that.officeyak.com"`. A 404 means no consultancy has that address |
| No email is arriving | `systemctl list-timers 'officeyak*'`, then the Automatic emails screen in any consultancy's console, which shows every message and its delivery state |
| Uploads fail | Check the disk with `df -h`, and that `/srv/officeyak/data` belongs to the officeyak user |

Two more places worth knowing: the **Security** screen inside any
consultancy's console shows who holds which key and what has been opened
lately, and **`docs/security.md`** is the written account of what protects the
data and what is still to be done.
