const express = require("express");
const logger = require("morgan");
const mongoose = require("mongoose");
const compression = require("compression");

//process.env.PORT gives the port for Heroku
const PORT = process.env.PORT || 3000;

//Set up express
const app = express();

app.use(logger("dev"));

app.use(compression());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static("public"));

//Below info provided by MongoDB Atlas and Heroku to connect to a mongo DB
mongoose.connect(
  process.env.MONGODB_URI || "mongodb://localhost/budget", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
  useFindAndModify: false
});

//Require the API routes
app.use(require("./routes/api.js"));

app.listen(PORT, () => {
  console.log(`App running on port ${PORT}!`);
});