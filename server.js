const express = require("express");
const session = require("express-session");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

const DATA_FILE = path.join(__dirname, "data.json");

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(
    DATA_FILE,
    JSON.stringify({
      titles: [],
      seasons: [],
      episodes: []
    }, null, 2)
  );
}

function readData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "change-this-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax"
    }
  })
);

app.use(express.static(path.join(__dirname, "public")));

function adminOnly(req, res, next) {
  if (!req.session.admin) {
    return res.status(401).json({
      error: "Unauthorized"
    });
  }

  next();
}

/* =========================
   ADMIN LOGIN
========================= */

app.post("/api/admin/login", (req, res) => {
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "change-me";

  if (
    req.body.username === username &&
    req.body.password === password
  ) {
    req.session.admin = true;

    return res.json({
      ok: true
    });
  }

  res.status(401).json({
    error: "Invalid username or password"
  });
});

app.post("/api/admin/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({
      ok: true
    });
  });
});

app.get("/api/admin/me", (req, res) => {
  res.json({
    authenticated: !!req.session.admin
  });
});

/* =========================
   TITLES
========================= */

app.get("/api/titles", (req, res) => {
  const data = readData();

  let titles = data.titles;

  if (
    req.query.type === "movie" ||
    req.query.type === "series"
  ) {
    titles = titles.filter(
      item => item.type === req.query.type
    );
  }

  if (req.query.q) {
    const query = req.query.q.toLowerCase();

    titles = titles.filter(item =>
      (
        item.title +
        " " +
        item.description +
        " " +
        item.genre
      )
        .toLowerCase()
        .includes(query)
    );
  }

  titles = [...titles].reverse();

  res.json(titles);
});

app.get("/api/titles/:id", (req, res) => {
  const data = readData();

  const title = data.titles.find(
    item => item.id == req.params.id
  );

  if (!title) {
    return res.status(404).json({
      error: "Title not found"
    });
  }

  const seasons = data.seasons
    .filter(item => item.titleId === title.id)
    .map(season => ({
      ...season,
      episodes: data.episodes.filter(
        episode => episode.seasonId === season.id
      )
    }));

  res.json({
    ...title,
    seasons
  });
});

/* =========================
   ADD MOVIE / SERIES
========================= */

app.post("/api/titles", adminOnly, (req, res) => {
  const data = readData();

  const {
    type,
    title,
    description,
    year,
    genre,
    poster,
    banner,
    video_url
  } = req.body;

  if (
    !["movie", "series"].includes(type) ||
    !title
  ) {
    return res.status(400).json({
      error: "Type and title are required"
    });
  }

  const newTitle = {
    id: Date.now(),
    type,
    title,
    description: description || "",
    year: year || "",
    genre: genre || "",
    poster: poster || "",
    banner: banner || "",
    video_url: video_url || ""
  };

  data.titles.push(newTitle);

  saveData(data);

  res.json(newTitle);
});

/* =========================
   DELETE TITLE
========================= */

app.delete("/api/titles/:id", adminOnly, (req, res) => {
  const data = readData();

  const id = Number(req.params.id);

  data.titles = data.titles.filter(
    item => item.id !== id
  );

  const seasonIds = data.seasons
    .filter(season => season.titleId === id)
    .map(season => season.id);

  data.seasons = data.seasons.filter(
    season => season.titleId !== id
  );

  data.episodes = data.episodes.filter(
    episode => !seasonIds.includes(episode.seasonId)
  );

  saveData(data);

  res.json({
    ok: true
  });
});

/* =========================
   SEASONS
========================= */

app.post("/api/seasons", adminOnly, (req, res) => {
  const data = readData();

  const season = {
    id: Date.now(),
    titleId: Number(req.body.titleId),
    seasonNumber: Number(req.body.seasonNumber)
  };

  data.seasons.push(season);

  saveData(data);

  res.json(season);
});

/* =========================
   EPISODES
========================= */

app.post("/api/episodes", adminOnly, (req, res) => {
  const data = readData();

  const episode = {
    id: Date.now(),
    seasonId: Number(req.body.seasonId),
    episodeNumber: Number(req.body.episodeNumber),
    title: req.body.title || "",
    description: req.body.description || "",
    video_url: req.body.video_url || ""
  };

  data.episodes.push(episode);

  saveData(data);

  res.json(episode);
});

/* =========================
   HEALTH CHECK
========================= */

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    name: "Kurd Cine"
  });
});

/* =========================
   START SERVER
========================= */

app.listen(PORT, () => {
  console.log(
    `Kurd Cine running on port ${PORT}`
  );
});
