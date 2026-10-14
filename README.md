# Cloud Poll — Three-Tier Cloud Web Application
**Design and Deployment of a Three-Tier Web Application Using Netlify, Render, and MongoDB Atlas**

---

## 1. Project Overview

**Cloud Poll** is a responsive, cloud-native Online Polling System demonstrating a decoupled **Three-Tier Cloud Architecture**:

* **Tier 1: Presentation Layer (Frontend)** &rarr; Deployed on **Netlify**
* **Tier 2: Application / Business Logic Layer (Backend API)** &rarr; Deployed on **Render**
* **Tier 3: Database Layer** &rarr; Hosted on **MongoDB Atlas**

```text
               CLIENT (Web Browser)
                        │
                        │ HTTPS
                        ▼
             ┌─────────────────────┐
             │       NETLIFY       │
             │  Presentation Tier  │  (HTML5, CSS3, Vanilla JavaScript)
             └──────────┬──────────┘
                        │
                        │ REST API (HTTPS + CORS)
                        ▼
             ┌─────────────────────┐
             │       RENDER        │
             │  Application Tier   │  (Node.js + Express.js REST API)
             └──────────┬──────────┘
                        │
                        │ Secure MongoDB Driver (TLS)
                        ▼
             ┌─────────────────────┐
             │    MONGODB ATLAS    │
             │    Database Tier    │  ('pollDB' -> 'polls' collection)
             └─────────────────────┘
```

---

## 2. Directory Structure

```text
CC Project 1/
├── backend/
│   ├── config/
│   │   └── db.js              # MongoDB Atlas connection handler
│   ├── models/
│   │   └── Poll.js            # Mongoose schema for Polls & Options
│   ├── routes/
│   │   └── pollRoutes.js      # REST API endpoints (CRUD + Vote)
│   ├── .env.example           # Environment variable template
│   ├── package.json           # Backend dependencies
│   └── server.js              # Express application entry point
│
├── frontend/
│   ├── index.html             # Presentation markup with Cloud Tier badges
│   ├── style.css              # Responsive styling, animations & progress bars
│   ├── app.js                 # Frontend business logic & API fetch calls
│   └── netlify.toml           # Netlify SPA routing & security headers
│
└── README.md                  # Complete deployment and architecture guide
```

---

## 3. CRUD API Specification (Tier 2)

| Operation | HTTP Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Create** | `POST` | `/api/polls` | Create a new poll with question & options |
| **Read (All)** | `GET` | `/api/polls` | Retrieve all active polls (supports `?search=`) |
| **Read (One)** | `GET` | `/api/polls/:id` | Fetch a single poll by MongoDB ID |
| **Update (Vote)** | `PATCH` | `/api/polls/:id/vote` | Cast a vote on an option (increments vote count) |
| **Update (Edit)** | `PUT` | `/api/polls/:id` | Modify question text or category |
| **Delete** | `DELETE` | `/api/polls/:id` | Permanently remove a poll from the database |
| **Health Check** | `GET` | `/health` | Healthcheck endpoint for Render keep-alive |

---

## 4. Step-by-Step Deployment Guide

### Step 1: Set Up Database Tier (MongoDB Atlas)
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and sign in.
2. Create a free **M0 Shared Cluster**.
3. Under **Security &rarr; Database Access**:
   * Click **Add New Database User**.
   * Create a username (e.g., `polladmin`) and secure password.
   * Assign the role `Read and write to any database`.
4. Under **Security &rarr; Network Access**:
   * Click **Add IP Address**.
   * Select **Allow Access From Anywhere** (`0.0.0.0/0`) so Render backend can connect.
5. Under **Deployment &rarr; Database &rarr; Connect**:
   * Choose **Drivers** (Node.js).
   * Copy the connection string. Example:
     ```text
     mongodb+srv://polladmin:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority
     ```

---

### Step 2: Deploy Application Tier (Render Backend)
1. Push your project to GitHub (or push the `backend/` folder).
2. Go to [Render](https://render.com/) and click **New &rarr; Web Service**.
3. Connect your GitHub repository.
4. Configure the Web Service:
   * **Name**: `cloud-poll-api`
   * **Root Directory**: `backend`
   * **Runtime**: `Node`
   * **Build Command**: `npm install`
   * **Start Command**: `npm start`
5. Add **Environment Variables** in Render:
   * `MONGODB_URI` = `<Your MongoDB Atlas connection string with real password>`
   * `PORT` = `5000`
   * `FRONTEND_URL` = `*` (or your Netlify URL once deployed)
6. Click **Deploy Web Service**.
7. Once deployed, Render will provide a public URL:
   ```text
   https://cloud-poll-api.onrender.com
   ```
8. Verify in your browser by opening `https://cloud-poll-api.onrender.com/health`.

---

### Step 3: Deploy Presentation Tier (Netlify Frontend)
1. Go to [Netlify](https://www.netlify.com/) and sign in.
2. Click **Add new site &rarr; Import an existing project** (from GitHub) or **Deploy manually** (drag and drop the `frontend` folder).
3. If connecting via Git:
   * **Base directory**: `frontend`
   * **Publish directory**: `frontend` (or leave empty if Base is set to `frontend`)
4. Click **Deploy Site**.
5. Netlify will generate a public domain:
   ```text
   https://cloud-poll-system.netlify.app
   ```
6. Open your Netlify site in the browser:
   * In the top **Backend API Endpoint** bar, enter your Render API URL (e.g. `https://cloud-poll-api.onrender.com`).
   * Click **Connect API**. The Render status pill will turn **green**!

---

## 5. Local Development & Testing

### 1. Run the Backend:
```bash
cd backend
npm install
# Set your MONGODB_URI in a .env file
npm start
```
The backend server runs on `http://localhost:5000`.

### 2. Run the Frontend:
Open `frontend/index.html` in any web browser (or use VS Code Live Server).
Ensure the API Endpoint in the top bar is set to `http://localhost:5000`.

---

## 6. Verification & Test Cases

| Test Case | Action | Expected Output |
| :--- | :--- | :--- |
| **Test Case 1: Add Poll** | Fill form with Question and 3 options &rarr; Click **Publish Poll to Cloud** | Success toast shown; poll immediately appears with 0 votes. Document created in MongoDB Atlas. |
| **Test Case 2: Display Polls** | Load the Netlify page | All stored polls are fetched via `GET /api/polls` and displayed with options and progress bars. |
| **Test Case 3: Cast Vote** | Click any option card on a poll | Vote count increments by 1; progress percentage dynamically recalculates and animates. |
| **Test Case 4: Search Poll** | Type keyword in search bar | Real-time filter narrows list by matching question or category. |
| **Test Case 5: Delete Poll** | Click 🗑️ **Delete** button & confirm | Poll is removed from MongoDB Atlas and disappears from frontend. |
