const express = require('express');
const mysql = require('mysql2');
const notificationsRouter = require('./notification');
const cors = require('cors');
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

// Middleware to enable cross-origin resource sharing (CORS)
app.use(cors()); // Add this line

// Middleware to enable cross-origin resource sharing (CORS)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Methods', 'GET', 'POST', 'PATCH', 'DELETE');
  next();
});

// Sample database query in the notificationsRouter
app.use('/v1/api', (req, res, next) => {
  // Inject the database pool into the request object
  req.db = pool;
  next();
}, notificationsRouter);

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
