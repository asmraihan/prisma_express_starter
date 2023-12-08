const express = require("express");
const app = express();
const cors = require("cors");
const fileupload = require("express-fileupload");
const exp = require("constants");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const hbs = require("hbs");
const { v4: uuidv4 } = require("uuid");
const sms = require("ssl-wireless-sms-send");
const nodemailer = require("nodemailer");
const https = require("https");
const fs = require("fs");
const console = require("console");

//? MIDDLEWARES
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
var corsOptions = {
    origin: "*",
    optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(fileupload());
// const publicDirectory = path.join(__dirname + "public");
// app.use(express.static(publicDirectory));
// app.use("image", express.static(publicDirectory + "/image/"));


//? CONTROLERS IMPORT
const authority = require("./routes/authority")


//? CONTROLLERS USE
app.use("/authority", authority)


//? VIEW ENGINE
app.get("/server-test", (req, res) => {
    res.send("<center><h1>Server is Running</h1></center>");
});
app.get("/test", (req, res) => {
    res.send("<center><h1>test</h1></center>");
});

const server = app.listen(5000, () =>
    console.log(`
🚀 Server ready at: http://localhost:5000
⭐️ See sample requests: http://pris.ly/e/ts/rest-express#3-using-the-rest-api`),
)