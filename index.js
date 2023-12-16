const express = require('express');
const mysql = require('mysql2');
const notificationsRouter = require('./notification');
const contactUsRouter = require('./contactUs'); 
const shareLinkRouter = require('./shareLink'); 
const cors = require('cors');
const corsOption = require("./cors/cors");
const app = express();
const port = process.env.PORT || 3000;

let pool;

if (process.env.NODE_ENV === 'production') {
  // Heroku configuration
  pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
  });
} else {
  // Local configuration
  pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME, // Add this line to specify the database
  });
}

app.use(express.static('public'));
app.use(express.json());
app.use(cors(corsOption));

// Sample database query in the notificationsRouter
app.use('/v1/api', (req, res, next) => {
  // Inject the database pool into the request object
  req.db = pool;
  next();
}, notificationsRouter);

app.use('/v1/api', contactUsRouter);
app.use('/v1/api', shareLinkRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  const data = {
    uptime: process.uptime(),
    message: 'Ok',
    date: new Date()
  };

  res.status(200).send(data);
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
