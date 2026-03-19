# Complete Guide: Deploying to Azure Managed Services (Option 2)

This guide provides a detailed, step-by-step walkthrough for deploying your Facebook Feature App using a production-ready cloud architecture on Microsoft Azure. 

By choosing Option 2, you are separating your **State** (Database and Cache) from your **Compute** (Frontend and Backend containers). This is the best practice for scalability, reliability, and security.

---

## Architecture Overview

Instead of running everything on one Linux machine, your architecture will look like this:

1. **Azure Database for PostgreSQL**: A fully managed Postgres database. Azure handles backups, scaling, and updates.
2. **Azure Cache for Redis**: A fully managed Redis instance.
3. **Azure Container Registry (ACR)**: A private repository to store your custom Docker images (`facebook-frontend` and `facebook-backend`).
4. **Azure App Service (Web App for Containers)**: Two separate managed hosting environments—one for the React frontend, one for the Node.js backend.
5. **GitHub Actions**: An automated pipeline that builds your code, creates Docker images, pushes them to ACR, and tells App Service to restart with the new code.

---

## Step 1: Provision the Managed Database & Cache

To prevent your custom code from having direct internet access to your database, you should set these up first.

### A. Create PostgreSQL Server
1. Go to the Azure Portal and search for **Azure Database for PostgreSQL Flexible Servers**.
2. Click **Create** and configure:
   - **Resource Group**: Create a new one (e.g., `facebook-prod-rg`).
   - **Compute + Storage**: Choose a "Burstable" tier (e.g., `B1ms`) for cost-effective hosting if you are just starting out.
   - **Authentication**: Create an Admin username (`postgresAdmin`) and a strong password.
3. *Crucial Best Practice: Networking*. Under the **Networking** tab, do **NOT** enable "Public access" to the entire internet. Ensure "Allow public access from any Azure service within Azure to this server" is checked so your App Service can securely talk to it.

### B. Create Redis Cache
1. Search for **Azure Cache for Redis** and click **Create**.
2. Use the same Resource Group (`facebook-prod-rg`).
3. Choose the **Basic** or **Standard** tier (C0 size is fine for starting out).
4. Once created, go to the **Access keys** menu on the sidebar to get your Primary Connection String.

---

## Step 2: Set Up the Container Registry (ACR)

This is where your compiled Docker images will live. **Important Note:** The registry domain name you create here (e.g., `myregistry.azurecr.io`) is **not** your app's final URL. It is purely a private storage address. Your app's actual URL will be generated in Step 3.

1. Search for **Container Registries** and click **Create**.
2. Name it uniquely (e.g., `facebookregistry123`). 
   - *If prompted for "Domain name label scope", leave it as the default (usually "Not Applicable" or "Subscription")*.
3. Choose the **Basic** SKU.
4. *Crucial Best Practice: Admin User*. Once created, go to **Access keys** on the sidebar and enable the **Admin user** toggle. You will need the `Login server`, `Username`, and `password` for GitHub Actions.

---

## Step 3: Create the Web Apps (App Service)

You need two App Services—one for the frontend, one for the backend.

### A. Backend App Service
1. Search for **App Services** and click **Create -> Web App**.
2. Configure the basics:
   - **Publish**: Choose **Docker Container**.
   - **Operating System**: Linux.
   - **App Service Plan**: Create a new Linux plan (e.g., Basic B1 tier).
3. Under the **Docker** tab:
   - **Options**: Single Container.
   - **Image Source**: Azure Container Registry.
   - Leave the specific image blank for now (GitHub Actions will handle this later!).
4. Click **Review + Create**.

### B. Frontend App Service
Repeat the exact same steps above to create a second Web App for your frontend. Ensure they share the same **App Service Plan** to save money (you pay for the plan, not the individual apps).

---

## Step 4: Configure Environment Variables

Your backend container needs to know how to connect to the new PostgreSQL and Redis instances you created in Step 1.

1. Go to your **Backend App Service** in the Azure Portal.
2. On the sidebar, click **Environment variables** (or **Configuration**).
3. Add the following Application Settings:
   - `DATABASE_URL`: `postgresql://postgresAdmin:<YOUR_PASSWORD>@<YOUR_POSTGRES_SERVER_NAME>.postgres.database.azure.com:5432/postgres?sslmode=require`
   - `REDIS_URL`: `<YOUR_REDIS_PRIMARY_CONNECTION_STRING>`
   - `JWT_ACCESS_SECRET`: Use a strong, random password.
   - `JWT_REFRESH_SECRET`: Use a strong, random password.
   - `PORT`: `8080` (This tells Azure which port your container is listening on).

*Crucial Best Practice: If you have Supabase or external APIs configured in your local `.env`, add them here too!*

---

## Step 5: Automate Deployment with GitHub Actions

You don't want to manually build and upload Docker images every time you change a line of code. We will automate this perfectly.

1. Go to your GitHub Repository -> **Settings** -> **Secrets and variables** -> **Actions**.
2. Add the following **Repository Secrets**:
   - `REGISTRY_LOGIN_SERVER`: (From Step 2, e.g., `facebookregistry123.azurecr.io`)
   - `REGISTRY_USERNAME`: (From Step 2)
   - `REGISTRY_PASSWORD`: (From Step 2)
   - `AZURE_WEBAPP_NAME_BACKEND`: (The exact name of the backend App Service you created in Step 3A).
   - `AZURE_WEBAPP_NAME_FRONTEND`: (The exact name of the frontend App Service you created in Step 3B).

3. Now, whenever you push code to GitHub, the `.github/workflows/deploy.yml` file in your repository will automatically trigger. It will:
   - Log into Azure.
   - Build your `Dockerfile.backend` and push it to ACR.
   - Build your `Dockerfile.frontend` and push it to ACR.
   - Tell both Azure App Services to restart and pull the latest code.

---

## Final Best Practices Checklist

- [ ] **Run Prisma Migrations**: Your database is currently empty! Since your `Dockerfile.backend` ends with `CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]`, your tables will be automatically created the very first time the container starts up in Azure. If the backend crashes on startup, check the App Service **Log Stream** to ensure Prisma successfully connected to the database.
- [ ] **CORS Settings**: Once Azure gives you a public URL for your frontend (e.g., `https://my-frontend.azurewebsites.net`), update your Backend environment variables to specifically allow CORS traffic from that exact frontend URL (instead of `localhost:5173`).
- [ ] **Lock Down the Registry**: Make sure your ACR `Admin User` credentials are strictly kept inside GitHub Secrets and never shared in Slack/Discord.
- [ ] **Azure Key Vault (Advanced Expansion)**: When you scale up, move your `DATABASE_URL` and `JWT` secrets out of App Service Environment Variables and into Microsoft Azure Key Vault for enterprise-grade security.
