
require("dotenv").config();
const express = require("express");
const session = require("express-session");
const { MongoStore } = require("connect-mongo");
const cookieParser = require("cookie-parser");
const path = require("path");

const { connectMongo } = require("./db/mongo");
const { attachUser } = require("./middleware/auth");
const platformRoutes = require("./routes/platform");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.set("trust proxy", 1);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

async function start() {
  await connectMongo();

  app.use(session({
    secret: process.env.SESSION_SECRET || "zeroday-academy-dev-secret-change-in-prod",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI, collectionName: "sessions" }),
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 8
    }
  }));

  app.use(attachUser());

  app.use("/", platformRoutes);

  const labRegistry = require("./labs");
  labRegistry.forEach(({ mountPath, router }) => {
    app.use(mountPath, router);
  });

  app.use((req, res) => {
    res.status(404).render("404", { title: "Not Found" });
  });

  app.listen(PORT, () => {
    console.log(`ZeroDay Academy running at http://localhost:${PORT}`);
    console.log(`Loaded ${labRegistry.length} vulnerability labs.`);
  });
}

start();
