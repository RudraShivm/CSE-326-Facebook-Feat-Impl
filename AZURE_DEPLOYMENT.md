# Azure Linux VM Deployment Guide

This guide replaces the old multi-service Azure setup. It is for deploying the entire application onto a single Azure Linux VM that has:

- a public IP address
- an SSH private key file (`.pem`)
- Ubuntu 22.04 or 24.04 LTS

The deployment model is:

1. **Frontend container (Nginx)** exposed publicly on port `80`
2. **Backend container (Express + Prisma)** reachable only inside Docker
3. **PostgreSQL container** reachable only inside Docker
4. **Redis container** reachable only inside Docker
5. **Supabase Storage** remains external for media uploads

This is the safest practical option for a single free VM because the database, Redis, and backend are not published directly to the internet.

---

## Important Notes Before You Start

- This guide assumes you only have an **IP address**, not a domain name.
- With only an IP, you can deploy safely over **HTTP** first. For browser-trusted **HTTPS**, add a domain later and then place TLS in front of the VM.
- Do **not** upload your `.pem` file to the VM.
- Do **not** open ports `5432`, `6379`, or `8080` publicly.
- Docker-published ports can bypass host firewall expectations, which is why the production compose file now publishes only port `80`.
- This repo has been adjusted so the frontend Nginx container proxies `/api/*` to the internal backend container, which is required for a safe single-VM deployment.

---

## Step 1: Lock Down Azure Networking

In the Azure portal, open your VM and go to **Networking**.

Create or verify inbound rules so that:

1. Port `22/TCP` is allowed **only from your own IP address**
2. Port `80/TCP` is allowed from the internet
3. Port `443/TCP` is allowed only if you later add HTTPS
4. Ports `5432`, `6379`, and `8080` are **not** allowed from the internet

If an overly-broad SSH rule already exists, tighten it so the **Source** is your own IP instead of `Any`.

---

## Step 2: Connect to the VM with Your `.pem` File

On your local machine:

```bash
chmod 400 /path/to/your-key.pem
ssh -i /path/to/your-key.pem <VM_USERNAME>@<VM_PUBLIC_IP>
```

Replace:

- `<VM_USERNAME>` with the admin username you chose when creating the VM
- `<VM_PUBLIC_IP>` with the VM's public IP

Example:

```bash
ssh -i ~/Downloads/facebook-vm.pem azureuser@20.55.10.25
```

---

## Step 3: Update the VM and Install Basic Security Tools

After logging in:

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y ufw fail2ban ca-certificates curl gnupg
```

Configure the host firewall:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

`fail2ban` helps protect SSH from repeated login attempts. Its default configuration is usually enough for a small VM.

---

## Step 4: Install Docker Engine and Docker Compose

Follow Docker's official Ubuntu repository method.

```bash
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable docker
sudo systemctl start docker
sudo docker --version
sudo docker compose version
```

Optional: allow your current user to run Docker without `sudo`:

```bash
sudo usermod -aG docker $USER
newgrp docker
```

Be aware that the Docker group is effectively root-equivalent.

---

## Step 5: Clone the Repository on the VM

If your repository is public:

```bash
git clone <repo-url>
cd CSE-326-Information-System-Design/9.Facebook-Feat-Impl
```

If it is private, use whichever Git authentication method you already trust on that machine.

---

## Step 6: Create the Production Backend Environment File

This app expects a backend env file at `backend/.env`.

Start from the example:

```bash
cp .env.example backend/.env
```

Now edit it:

```bash
nano backend/.env
```

Use values like these:

```env
DATABASE_URL="postgresql://facebook:CHANGE_THIS_DB_PASSWORD@db:5432/facebook_db?schema=public"
REDIS_URL="redis://redis:6379"

JWT_ACCESS_SECRET="GENERATE_A_LONG_RANDOM_SECRET"
JWT_REFRESH_SECRET="GENERATE_A_LONG_RANDOM_SECRET"
JWT_ACCESS_EXPIRY="15m"
JWT_REFRESH_EXPIRY="7d"

PORT=8080
NODE_ENV="production"
FRONTEND_URL="http://<VM_PUBLIC_IP>"

SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_KEY="your-supabase-service-role-key"
SUPABASE_BUCKET="facebook-assets"
```

Important:

1. Use `db` as the PostgreSQL hostname, not `localhost`
2. Use `redis` as the Redis hostname, not `localhost`
3. Set `FRONTEND_URL` to `http://<VM_PUBLIC_IP>` for now
4. Keep `SUPABASE_KEY` secret

Generate strong secrets with:

```bash
openssl rand -hex 64
```

---

## Step 7: Set a Strong Database Password

The production compose file uses environment variables for the Postgres container. Export them in your current shell before starting the stack:

```bash
export POSTGRES_USER=facebook
export POSTGRES_PASSWORD='replace-with-a-strong-db-password'
export POSTGRES_DB=facebook_db
```

If you want these values to survive new SSH sessions, put them in a file that is **not committed to Git**, such as:

```bash
cat <<'EOF' > .vm-secrets
export POSTGRES_USER=facebook
export POSTGRES_PASSWORD='replace-with-a-strong-db-password'
export POSTGRES_DB=facebook_db
EOF
chmod 600 .vm-secrets
```

Then load them whenever you deploy:

```bash
source ./.vm-secrets
```

---

## Step 8: Build and Start the Full Stack

From `9.Facebook-Feat-Impl/`:

```bash
source ./.vm-secrets
docker compose -f docker-compose.prod.yml up -d --build
```

What this does:

1. Builds the backend image
2. Builds the frontend image
3. Starts PostgreSQL and Redis inside Docker
4. Starts the backend container
5. Starts the frontend Nginx container on port `80`

The backend automatically runs Prisma migrations on startup because `Dockerfile.backend` ends with:

```bash
npx prisma migrate deploy && npm start
```

---

## Step 9: Verify the Deployment

Check running containers:

```bash
docker compose -f docker-compose.prod.yml ps
```

Check logs:

```bash
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
```

Test the health endpoint from the VM:

```bash
curl http://localhost/api/v1/health
```

Test from your own computer:

```bash
curl http://<VM_PUBLIC_IP>/api/v1/health
```

Then open the app in your browser:

```text
http://<VM_PUBLIC_IP>
```

If the frontend loads but API requests fail, inspect:

1. `backend/.env`
2. `docker compose ... logs -f backend`
3. Supabase credentials
4. Azure NSG rules

---

## Step 10: Update the App Later

When you make changes:

```bash
cd ~/CSE-326-Information-System-Design/9.Facebook-Feat-Impl
git pull
source ./.vm-secrets
docker compose -f docker-compose.prod.yml up -d --build
```

To stop the app:

```bash
docker compose -f docker-compose.prod.yml down
```

To stop the app without deleting volumes:

```bash
docker compose -f docker-compose.prod.yml stop
```

---

## Step 11: Backups and Recovery

A single-VM deployment is convenient, but all state now lives on one machine. You should protect it.

At minimum:

1. Enable **Azure Backup** for the VM
2. Keep your code in GitHub
3. Keep a copy of your `.pem` file in a safe local location
4. Back up important secrets securely

If you do not want full Azure Backup yet, at least create regular **managed disk snapshots** before risky changes.

---

## Recommended Safety Checklist

- [ ] SSH key login works with your `.pem`
- [ ] Port `22` is restricted to your IP in Azure Networking
- [ ] Only port `80` is public for now
- [ ] Ports `5432`, `6379`, and `8080` are not public
- [ ] `backend/.env` uses `db` and `redis`, not `localhost`
- [ ] `FRONTEND_URL` is set to your VM public URL
- [ ] Prisma migrations ran successfully
- [ ] Supabase secrets are correct
- [ ] Azure Backup or snapshots are configured

---

## Optional Next Upgrade: Domain + HTTPS

Once the app works on the VM IP:

1. Buy or use an existing domain
2. Point an `A` record to the Azure VM public IP
3. Add TLS termination with Caddy or Nginx + Let's Encrypt
4. Change `FRONTEND_URL` to `https://your-domain.com`

For a class project or demo, HTTP on the public IP is enough to prove deployment. For real users, add a domain and HTTPS.

---

## Sources Checked

These were re-checked before writing this guide:

- Azure VM SSH connection and `.pem` usage: Microsoft Learn, "Connect to a Linux VM"
- Azure VM creation quickstart: Microsoft Learn, "Quickstart - Create a Linux VM in the Azure portal"
- Azure Backup for VMs: Microsoft Learn, "Back up Azure VMs in a Recovery Services vault"
- Docker Engine on Ubuntu: Docker Docs, "Install Docker Engine on Ubuntu"
- Docker Compose plugin on Linux: Docker Docs, "Install the Docker Compose plugin"
- Docker post-installation guidance: Docker Docs, "Linux post-installation steps"
