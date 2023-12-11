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

    const insertSql = 'INSERT INTO notifications (title, message, image, linkto) VALUES (?, ?, ?, ?)';
    db.query(insertSql, [title, message, base64Image, linkto], (err, result) => {
      if (err) {
        console.error('Error in send-notification endpoint:', err);
        res.status(500).send({ error: err.message });
      } else {
        res.status(200).send({ message: 'Notification sent successfully' });
      }
    });
  } catch (error) {
    console.error('Error in send-notification endpoint:', error);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});

// Get notification endpoint
router.get('/get-notification', (req, res) => {
  const { page = 1, limit = 10, sortField = 'NotificationId', sortOrder = 'asc', search = '' } = req.query;

  const offset = (page - 1) * limit;
  const sortDirection = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  // Construct the WHERE clause for searching by title
  const searchCondition = search ? `WHERE title LIKE '%${search}%'` : '';

  const selectSql = `
    SELECT * FROM notifications
    ${searchCondition}
    ORDER BY ${sortField} ${sortDirection}
    LIMIT ${limit} OFFSET ${offset}
  `;

  db.getConnection((err, connection) => {
    if (err) {
      console.error('Error getting database connection:', err.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    connection.query(selectSql, (errSelect, result) => {
      if (errSelect) {
        connection.release();
        return res.status(500).send({ error: errSelect.message });
      }

      // Count total records without pagination
      const totalCountSql = `SELECT COUNT(*) as totalCount FROM notifications ${searchCondition}`;
      connection.query(totalCountSql, (errCount, resultCount) => {
        connection.release();
        if (errCount) {
          return res.status(500).send({ error: errCount.message });
        }

        const totalCount = resultCount[0].totalCount;

        const paginationInfo = {
          totalCount,
          currentPage: +page,
          totalPages: Math.ceil(totalCount / limit),
        };

        res.status(200).json({ data: result, pagination: paginationInfo });
      });
    });
  });
});

// Edit notification endpoint
router.patch('/edit-notification/:NotificationId', (req, res) => {
  const { NotificationId } = req.params;
  const { title, message, image, linkto } = req.body;

  const updateSql = 'UPDATE notifications SET title=?, message=?, image=?, linkto=? WHERE NotificationId=?';
  db.query(updateSql, [title, message, image, linkto, NotificationId], (err, result) => {
    if (err) {
      res.status(500).send({ error: err.message });
    } else {
      if (result.affectedRows === 0) {
        res.status(404).send({ message: 'No matching notification found' });
      } else {
        res.status(200).send({ message: 'Notification updated successfully' });
      }
    }
  });
});

// Delete notification endpoint
router.delete('/delete-notification/:NotificationId', (req, res) => {
  const { NotificationId } = req.params;

  const deleteSql = 'DELETE FROM notifications WHERE NotificationId=?';
  db.query(deleteSql, [NotificationId], (err, result) => {
    if (err) {
      res.status(500).send({ error: err.message });
    } else {
      if (result.affectedRows === 0) {
        res.status(404).send({ message: 'No matching notification found' });
      } else {
        res.status(200).send({ message: 'Notification deleted successfully' });
      }
    }
  });
});

module.exports = router;
