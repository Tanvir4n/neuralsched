# NeuralSched — Phase 3 Deployment Guide

Deploy the full stack online, with the **real trained models** running:

| Layer      | Host                              | Cost | URL you'll get                          |
|------------|-----------------------------------|------|-----------------------------------------|
| Database   | Supabase (Postgres)               | Free | `postgresql://...` connection string    |
| Backend    | Hugging Face Spaces (Docker)      | Free | `https://<user>-neuralsched.hf.space`   |
| Frontend   | Vercel                            | Free | `https://neuralsched.vercel.app`        |

Deploy in this order: **Database → Backend → Frontend** (each needs the previous one's URL).

---

## 0. Prerequisites

- A GitHub account (to hold the code) — https://github.com
- A Hugging Face account — https://huggingface.co/join
- A Vercel account — https://vercel.com/signup
- A Supabase account — https://supabase.com/dashboard
- `git` installed locally — https://git-scm.com/downloads

The 4 trained weights (`backend/app/models/*.pth`, ~2 MB total) are **committed to the repo**, so they ship inside the backend image automatically — no extra hosting step.

---

## 1. Database — Supabase Postgres

1. Go to https://supabase.com/dashboard → **New project**.
2. Name it `neuralsched`, pick a strong DB password (save it), choose the region closest to you, click **Create new project** (wait ~2 min).
3. Left sidebar → **Project Settings** (gear) → **Database**.
4. Under **Connection string** choose **URI** and copy it. It looks like:
   ```
   postgresql://postgres.abcdefgh:[YOUR-PASSWORD]@aws-0-xx.pooler.supabase.com:6543/postgres
   ```
5. Replace `[YOUR-PASSWORD]` with the password from step 2. **Save this full string** — it's your `DATABASE_URL`.

> Use the **Session pooler** (port 6543) connection string — it's the one that works from a serverless/container host.

---

## 2. Put the code on GitHub

If the project isn't on GitHub yet:

```bash
cd "d:/AI Hackathon"
git init
git add .
git commit -m "NeuralSched full stack"
```

Create an empty repo at https://github.com/new (name it `neuralsched`), then:

```bash
git remote add origin https://github.com/<your-user>/neuralsched.git
git branch -M main
git push -u origin main
```

> The `.pth` weight files are small (~2 MB) and are committed normally — no Git LFS needed.

---

## 3. Backend — Hugging Face Spaces (Docker)

HF Spaces gives free CPU with enough RAM/disk for the torch stack. A Space is its own git repo; we push the `backend/` folder into it.

### 3a. Create the Space

1. Go to https://huggingface.co/new-space
2. **Owner**: you. **Space name**: `neuralsched`.
3. **License**: mit. **Select the SDK**: **Docker** → **Blank**.
4. **Hardware**: `CPU basic` (free). **Visibility**: Public.
5. Click **Create Space**.

### 3b. Push the backend into the Space

The Space repo expects the `Dockerfile` at its **root**. Your backend already has `backend/Dockerfile.hf`. Push the *contents of `backend/`* to the Space, using `Dockerfile.hf` as the Space's `Dockerfile`:

```powershell
# clone the (empty) Space repo next to your project
cd "d:/AI Hackathon"
git clone https://huggingface.co/spaces/<your-user>/neuralsched hf-space
cd hf-space

# copy backend contents in
Copy-Item -Recurse -Force ..\backend\* .

# there must be exactly ONE file named "Dockerfile" at the root:
# delete the Render one, then rename the HF one into place.
Remove-Item -Force Dockerfile
Rename-Item Dockerfile.hf Dockerfile
```

Add the Space README front-matter (HF needs it). Create `hf-space/README.md`:

```markdown
---
title: NeuralSched
emoji: 🧠
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
---
NeuralSched GPU-cluster-intelligence API.
```

Commit and push:

```bash
git add .
git commit -m "NeuralSched backend on HF Spaces"
git push
```

### 3c. Set the backend secrets

In the Space page → **Settings** → **Variables and secrets** → add:

| Name                    | Type    | Value                                              |
|-------------------------|---------|----------------------------------------------------|
| `DATABASE_URL`          | Secret  | the Supabase URI from step 1                        |
| `JWT_SECRET`            | Secret  | a long random string (e.g. run `openssl rand -hex 32`) |
| `NUM_GPU_NODES`         | Variable| `32`                                               |
| `TELEMETRY_TICK_SECONDS`| Variable| `10`                                               |
| `ENVIRONMENT`           | Variable| `production`                                        |

The Space rebuilds automatically. First build takes ~5–10 min (installing torch). When it shows **Running**, open:

- `https://<your-user>-neuralsched.hf.space/` → should return JSON with all four models showing `gnn_ppo` / `lstm` / `tcn` (NOT `mock`).
- `https://<your-user>-neuralsched.hf.space/healthz` → `{"status":"ok"}`

**Copy this Space URL** — it's your `VITE_API_BASE` for the frontend.

> The direct Space URL is `https://<user>-<space>.hf.space`. Find the exact one via the Space page → the **⋮** menu → **Embed this Space** → **Direct URL**.

---

## 4. Frontend — Vercel

1. Go to https://vercel.com/new and **Import** your GitHub repo.
2. **Root Directory**: click **Edit** → select `frontend`.
3. **Framework Preset**: Vite (auto-detected). Build command `npm run build`, output `dist` (defaults are fine).
4. Expand **Environment Variables** and add:

   | Name             | Value                                                 |
   |------------------|-------------------------------------------------------|
   | `VITE_API_BASE`  | `https://<your-user>-neuralsched.hf.space`            |
   | `VITE_WS_BASE`   | `wss://<your-user>-neuralsched.hf.space`              |

   > No trailing slash, no `/api`. The backend routes live at the root (`/auth/login`, `/health/predictions`, …).

5. Click **Deploy**. After ~1 min you get `https://neuralsched.vercel.app`.

---

## 5. Verify end-to-end

1. Open the Vercel URL. The homepage should load with the 3D hero.
2. **Sign up** → you should get redirected into the dashboard.
3. Dashboard telemetry should stream (WebSocket via `VITE_WS_BASE`), nodes mostly green.
4. **Submit a job** → SmartPack places it (real `gnn_ppo`), GreenSched shows carbon decision.
5. **Health** view → SentinelAI predictions; toggle **Auto-migrate**; use the demo helper to force a fault:
   ```
   POST https://<your-user>-neuralsched.hf.space/dev/inject-fault?node_id=gpu-node-5
   ```
   Then watch the alert + migration (auto or manual) appear.

---

## 6. Notes & gotchas

- **Cold start**: free HF Spaces sleep after inactivity. First request after idle takes ~20–40 s. Hit `/healthz` once before a live demo to warm it.
- **CORS** is already open (`allow_origins=["*"]` in `app/main.py`), so Vercel → HF works out of the box.
- **DB tables** are auto-created on backend startup (`init_db()` in `app/main.py`) — nothing to run manually.
- **Model check**: if `/` shows `mock(...)` instead of real methods, the `.pth` files didn't ship — confirm `backend/app/models/*.pth` are committed and not caught by `.gitignore`/`.dockerignore`.
- **Redeploy**: push to GitHub → Vercel redeploys the frontend; push to the Space repo → HF rebuilds the backend.
