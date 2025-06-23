const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const connectDB = require("./db");
const UserModel = require("./models/userModel");

dotenv.config();

const PORT = process.env.PORT || 5000;

function parseCookies(cookieHeader) {
  const list = {};
  if (!cookieHeader) return list;
  cookieHeader.split(";").forEach(cookie => {
    const parts = cookie.split("=");
    list[parts[0].trim()] = decodeURIComponent(parts[1]);
  });
  return list;
}

(async () => {
  const db = await connectDB();
  const user = new UserModel(db);

  const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    let body = "";

    if (req.method === "GET") {
      if (parsedUrl.pathname === "/") {
        res.writeHead(302, { Location: "/signup-form" });
        return res.end();
      }

      if (parsedUrl.pathname === "/signup-form") {
        return fs.readFile(path.join(__dirname, "signup.html"), (err, data) => {
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(data);
        });
      }

      if (parsedUrl.pathname === "/login-form") {
        return fs.readFile(path.join(__dirname, "login.html"), (err, data) => {
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(data);
        });
      }

      if (parsedUrl.pathname === "/dashboard") {
        const cookies = parseCookies(req.headers.cookie);
        const token = cookies.token;
        if (!token) {
          res.writeHead(302, { Location: "/login-form" });
          return res.end();
        }

        try {
          jwt.verify(token, process.env.JWT_SECRET);
          return fs.readFile(path.join(__dirname, "dashboard.html"), (err, data) => {
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(data);
          });
        } catch (err) {
          res.writeHead(302, { Location: "/login-form" });
          return res.end();
        }
      }

      if (parsedUrl.pathname === "/logout") {
        res.writeHead(302, {
          "Set-Cookie": "token=; Max-Age=0",
          Location: "/login-form"
        });
        return res.end();
      }
    }

    req.on("data", chunk => { body += chunk.toString(); });

    req.on("end", async () => {
      const parsedBody = new URLSearchParams(body);

      if (req.method === "POST" && parsedUrl.pathname === "/signup") {
        const email = parsedBody.get("email");
        const password = parsedBody.get("password");
        const exists = await user.find(email);
        if (exists) {
          res.writeHead(409);
          return res.end("User already exists. <a href='/login-form'>Login</a>");
        }

        await user.create(email, password);
        res.writeHead(302, { Location: "/login-form" });
        return res.end();
      }

      if (req.method === "POST" && parsedUrl.pathname === "/login") {
        const email = parsedBody.get("email");
        const password = parsedBody.get("password");

        const valid = await user.validate(email, password);
        if (!valid) {
          res.writeHead(401);
          return res.end("Invalid credentials. <a href='/login-form'>Try again</a>");
        }

        const token = jwt.sign({ email }, process.env.JWT_SECRET, {
          expiresIn: "1h",
        });

        res.writeHead(302, {
          "Set-Cookie": `token=${token}; HttpOnly`,
          Location: "/dashboard",
        });
        return res.end();
      }

      res.writeHead(404);
      res.end("404 Not Found");
    });
  });

  server.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
})();
