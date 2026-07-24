<div align="center">

# NeuralSched

### GPU-Cluster-Intelligence Middleware

Topology-aware, carbon-aware, failure-aware and cost-aware scheduling intelligence
that sits above Kubernetes / SLURM and is driven by four trained ML models.

Built by **Team ShadowForge**, Daffodil International University.

</div>

---

## What it is

NeuralSched is a middleware layer for GPU clusters. It does not replace
Kubernetes or SLURM, it makes them smarter. Four ML models watch the cluster and
decide where jobs should run, when they should run, which nodes are about to
fail, and which GPUs are being wasted.

| Module | Question it answers | Model |
|--------|--------------------|-------|
| **SmartPack** | Which GPU node is the best place for this job? | GraphSAGE GNN + PPO reinforcement learning |
| **GreenSched** | When is the greenest time to run this flexible job? | Carbon-intensity LSTM (24h forecast) |
| **SentinelAI** | Which node is about to fail, and why? | Temporal Convolutional Network + SHAP |
| **CostCut** | Which GPUs are idle and reclaimable? | Utilization LSTM (next-step forecast) |

The system is self-healing: when SentinelAI predicts a failure, the job is
checkpointed, SmartPack picks a healthy replacement node, the job is migrated,
and the event is logged, automatically or on one click.

See [`PROJECT.md`](./PROJECT.md) for the full architecture and API surface, and
[`PROJECT_EXPLANATION.md`](./PROJECT_EXPLANATION.md) for the plain-language
hackathon walkthrough and demo script.

---

## Repository layout

```
neuralsched/
├── backend/                FastAPI service (Python)
│   ├── app/
│   │   ├── api/            routes.py, scheduler.py (job placement + health scan)
│   │   ├── auth/           JWT signup / login / me
│   │   ├── models/         *.pth trained weights (committed, ~2 MB) + db_models.py
│   │   ├── modules/        smartpack, greensched, sentinelai, costcut
│   │   ├── telemetry/      simulator.py (DCGM-style telemetry stream)
│   │   ├── config.py  database.py  main.py
│   ├── Dockerfile          container image (binds to $PORT, works on Render)
│   ├── requirements.txt
│   └── .env.example
├── frontend/               React + Vite + TypeScript dashboard
│   ├── src/
│   │   ├── components/     Navbar, ClusterTopology3D, HeroScene, ui, ...
│   │   ├── pages/          Home, About, Dashboard, Health, Cost, Carbon, ...
│   │   ├── lib/            api.ts, store.ts, useTelemetry.ts
│   │   └── theme/          tokens.ts, global.css
│   ├── package.json
│   └── .env.example
├── .github/workflows/      CI
├── docker-compose.yml      full stack (frontend + backend + Postgres)
├── DEPLOYMENT.md           step-by-step online deploy (Supabase + HF + Vercel)
├── PROJECT.md              architecture + model cards + API reference
└── PROJECT_EXPLANATION.md  hackathon narrative + demo script
```

---

## Run locally

### Option A: Docker Compose (one command)

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API + Swagger docs: http://localhost:8000/docs
- Postgres: localhost:5432 (`neuralsched` / `neuralsched`)

### Option B: dev mode with hot reload

Backend (needs Python 3.11+):

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate            # Windows
# source .venv/bin/activate       # macOS / Linux
pip install -r requirements.txt

# Use a local SQLite DB so you don't need Postgres:
#   PowerShell:  $env:DATABASE_URL="sqlite:///./neuralsched.db"
#   bash:        export DATABASE_URL="sqlite:///./neuralsched.db"
uvicorn app.main:app --reload --port 8000
```

Frontend (needs Node 18+), in a second terminal:

```bash
cd frontend
npm install
npm run dev                       # Vite proxies /api to :8000
```

### First run

1. Open the frontend, click **Sign up**, create an Operator or Admin account.
2. Log in to reach the Operator Dashboard (3D topology + heatmap).
3. Submit a job and watch SmartPack / GreenSched route it.
4. Force a fault for the demo:
   `POST http://localhost:8000/dev/inject-fault?node_id=gpu-node-5`
   then open the Health view to see SentinelAI + SHAP react and (optionally)
   auto-migrate.

### Verify the real models are loaded

Open http://localhost:8000/ . The `models` block should read
`gnn_ppo` / `lstm` / `tcn` / `lstm`, not `mock(...)`. If you see `mock`, the
`.pth` files under `backend/app/models/` were not found.

---

## Deploy online (free tier)

Full click-by-click guide in [`DEPLOYMENT.md`](./DEPLOYMENT.md). Summary:

| Layer | Host | Result |
|-------|------|--------|
| Database | Supabase (Postgres) | `DATABASE_URL` connection string |
| Backend | Render (Docker web service) | `https://neuralsched-backend.onrender.com` |
| Frontend | Vercel | `https://neuralsched.vercel.app` |

Deploy order is **Database → Backend → Frontend** because each step needs the
previous URL.

---

## Tech stack

**Backend:** Python, FastAPI, SQLAlchemy 2.0, Postgres / SQLite, python-jose
(JWT), bcrypt, PyTorch, torch-geometric, stable-baselines3, SHAP.

**Frontend:** React 18, Vite, TypeScript, React Router, Zustand, Framer Motion,
Recharts, React Three Fiber + drei (3D cluster topology).

---

## Team ShadowForge

- **Abdullah Rubab** - Team Leader and ML Architect
- **Md. Tanvir Hasan** - Backend and Infrastructure
- **Sourov Kumar** - Frontend and Dashboard

Mentor: **Md. Mezbaul Islam Zion**, Department of CSE, Daffodil International University.

## License

Released under the [MIT License](./LICENSE).
