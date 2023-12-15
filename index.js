const express = require('express');
const mysql = require('mysql2');
const notificationsRouter = require('./notification');
const cors = require('cors');
const corsOption = require("./cors/cors");
const db = require('./db');
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



// save 
app.post('/save-token', (req, res) => {
  try {
    const { token } = req.body;
    const insertSql = 'INSERT INTO users (token) VALUES (?)';
    db.query(insertSql, [token], (err, result) => {
      if (err) {
        console.error('Error saving token:', err);
        return res.status(500).send({ error: 'Internal Server Error' });
      }
      res.status(200).send({ message: 'Token saved successfully' });
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});



app.get('/getnotification', async (req, res) => {
  try {

    // Fetch internal notifications
    const internalSelectSql = `
      SELECT * FROM notifications
    `;
    const [internalResult] = await Promise.all([
      queryAsync(internalSelectSql),
      queryAsync(`SELECT COUNT(*) as totalCount FROM notifications`),
    ]);

    res.status(200).send({ data: internalResult });
  } catch (error) {
    console.error('Error in get-push-notification endpoint:', error);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});

function queryAsync(sql) {
  return new Promise((resolve, reject) => {
    db.query(sql, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}


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
