const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});


db.getConnection((err, connection) => {
  if (err) {
    console.error('MySQL connection error:', err);
  } else {
    console.log('Connected to MySQL database');

    // Select the database
    connection.query(`USE ${process.env.DB_NAME}`, (selectDbErr) => {
      if (selectDbErr) {
        console.error('Error selecting database:', selectDbErr);
      } else {
        console.log('Database selected:', process.env.DB_NAME);
      }

      connection.release(); // Release the connection back to the pool
    });
  }
});

module.exports = db;
