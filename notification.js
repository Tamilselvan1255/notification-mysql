const express = require('express');
const bodyParser = require('body-parser');
const db = require('./db');

const router = express.Router();

// Middleware for handling JSON
router.use(express.json());

// Body parser middleware
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

// Send notification endpoint
router.post('/send-notification', async (req, res) => {
  try {
    const { title, message, image, linkto } = req.body;

    // Send the base64-encoded image directly
    const base64Image = image;

    const sql = 'INSERT INTO notifications (title, message, image, linkto) VALUES (?, ?, ?, ?)';
    db.query(sql, [title, message, base64Image, linkto], (err, result) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.status(200).json({ message: 'Notification sent successfully' });
      }
    });
  } catch (error) {
    console.error('Error in send-notification endpoint:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get notifications endpoint
router.get('/get-notifications', (req, res) => {
  const sql = 'SELECT * FROM notifications';
  db.query(sql, (err, result) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.status(200).json(result);
    }
  });
});

module.exports = router;
 