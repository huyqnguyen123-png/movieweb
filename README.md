# 🎬 Movix - Movie Streaming & Watch Party App

![Project Banner](<img width="1902" height="943" alt="Screenshot 2026-10-04 095949" src="https://github.com/user-attachments/assets/1a7fe38c-4813-43c7-a364-16397dce8205" />
)

> **Modern Full-Stack Movie Streaming Platform built with React, Node.js, Prisma, and Socket.io, featuring Real-time Watch Parties and Voice Chat.**

[🔴 **LIVE DEMO**](https://movieweb-cet2.vercel.app/) | [Report Bug](https://github.com/huyqnguyen123-png/movie-web/issues)

---

## 📖 Introduction

**Movix** is an advanced online movie and TV show streaming application. The project is a complete full-stack solution featuring a **React (Vite)** frontend and a **Node.js/Express** backend powered by a **PostgreSQL** database via **Prisma ORM**.

The goal of this project is to provide a seamless media streaming experience while integrating real-time social features like **Watch Parties**, **Live Chat**, and **WebRTC Voice Chat** to watch movies together with friends from anywhere.

---

## ✨ Key Features

### 🍿 Media Streaming & Discovery
- **Dynamic Content:** Browse movies, TV shows, and cast details fetched via TMDB API.
- **Embedded Player:** Seamless playback using third-party sources (Vidsrc) via centralized utility functions.
- **Personalized Library:** Save watch history, add to Watch Later, and create Custom Playlists.
- **Reviews & Ratings:** Interactive user review system with star ratings.

### 🎉 Real-time Watch Party
- **Synchronized Playback:** Watch movies with friends simultaneously in private rooms.
- **Live Chat & Notifications:** Real-time messaging and room member tracking using **Socket.io**.
- **Voice Chat:** Built-in audio communication using **WebRTC (PeerJS)** for a true theater experience.

### 🔐 Backend & Security
- **PostgreSQL & Prisma:** Robust relational database hosted on **Neon DB**.
- **User Authentication:** Secure login, session management, and profile customization.
- **RESTful API:** Clean backend architecture deployed on **Render**.

---

## 🛠️ Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, Framer Motion, Lucide React.
- **Backend:** Node.js, Express.js, Prisma ORM, PostgreSQL (Neon).
- **Real-time & WebRTC:** Socket.io, PeerJS.
- **APIs:** TMDB API, Vidsrc iframe.
- **Deployment:** Vercel (Frontend), Render (Backend).

---

## 🚀 How to Run

Since this is a full-stack project, you need to run both the backend and frontend.

### 1. Backend Setup
1. Open a terminal and navigate to the backend directory:
   bash
   cd movie-backend

2. Install dependencies:
    Bash
    npm install

3. Create a .env file and add your credentials:
    DATABASE_URL="postgresql://user:password@host/neondb?sslmode=require"
    PORT=5000
    TMDB_TOKEN="Your_TMDB_API_Token"

4. Sync the database schema and start the server:
    Bash
    npx prisma db push
    npm run dev


### 2. Frontend Setup
1. Open a new terminal and navigate to the frontend directory:
    Bash
    cd movie-frontend

2. Install dependencies:
    Bash
    npm install

3. Create a .env file and add your environment variables:
    VITE_API_URL=http://localhost:5000
    VITE_VIDSRC_BASE_URL=[https://vidsrc.me](https://vidsrc.me)

4. Start the frontend development server:
    Bash
    npm run dev


## 📂 Project Structure
Movie web/
├── img/                     # Static images and assets
├── movie-backend/           # Node.js API & Socket.io Server
│   ├── models/              # Database models & logic
│   ├── prisma/              # Schema & Database configurations
│   ├── .env                 # Backend environment variables
│   ├── importMovies.js      # Script to import movies from TMDB
│   ├── index.js             # Server entry point
│   ├── seed.js              # Database seeding script
│   └── prisma.config.ts     # Prisma configuration
├── movie-frontend/          # React Vite Application
│   ├── public/              # Public static files
│   ├── src/                 # Source files
│   │   ├── assets/          # Static assets (images, icons)
│   │   ├── utils/           # Helper functions (mediaUtils.js)
│   │   ├── App.jsx / CSS    # Root component & styling
│   │   ├── Auth.jsx         # Authentication component
│   │   ├── Home.jsx         # Home page component
│   │   ├── MovieLoader.jsx  # Custom loading screen
│   │   ├── Navbar.jsx       # Navigation bar
│   │   ├── Player.jsx       # Movie player & details
│   │   ├── WatchParty.jsx   # Real-time watch party & voice chat
│   │   └── ...              # Other pages (Profile, Settings, etc.)
│   ├── tailwind.config.js   # Tailwind CSS configuration
│   ├── vercel.json          # Vercel deployment configuration
│   └── vite.config.js       # Vite bundler configuration
└── README.md                # Project Documentation


## 👨‍💻 Author
Huy Nguyen

Github: @huyqnguyen123-png

Thanks for reading!
