const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10, // Adjust according to your needs
  queueLimit: 0,
});

db.getConnection((err, connection) => {
  if (err) {
    console.error('MySQL connection error:', err);
  } else {
    console.log('Connected to MySQL database');
    connection.release(); // Release the connection back to the pool
  }
});

module.exports = db;

// const mysql = require('mysql2');
// require('dotenv').config();

// const db = mysql.createConnection({
//     host: process.env.DB_HOST,
//     user: process.env.DB_USER,
//     password: process.env.DB_PASSWORD,
//     port: process.env.DB_PORT,
//     database: process.env.DB_DATABASE,
//   });

// db.connect((err) => {
//   if (err) {
//     console.error('MySQL connection error:', err);
//   } else {
//     console.log('Connected to MySQL database');
//   }
// });

// module.exports = db;
