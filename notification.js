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

router.get('/get-notification', (req, res) => {
    const { page = 1, limit = 10, sortField = 'NotificationId', sortOrder = 'asc', search = '' } = req.query;

    const offset = (page - 1) * limit;
    const sortDirection = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    // Construct the WHERE clause for searching by title
    const searchCondition = search ? `WHERE title LIKE '%${search}%'` : '';

    const sql = `
      SELECT * FROM notifications
      ${searchCondition}
      ORDER BY ${sortField} ${sortDirection}
      LIMIT ${limit} OFFSET ${offset}
    `;

    db.query(sql, (err, result) => {
        if (err) {
            res.status(500).send({ error: err.message });
        } else {
            // Count total records without pagination
            const totalCountQuery = `SELECT COUNT(*) as totalCount FROM notifications ${searchCondition}`;
            db.query(totalCountQuery, (errCount, resultCount) => {
                if (errCount) {
                    res.status(500).send({ error: errCount.message });
                } else {
                    const totalCount = resultCount[0].totalCount;

                    // const hasNextPage = offset + result.length < totalCount;
                    // const hasPrevPage = page > 1;

                    const paginationInfo = {
                        totalCount,
                        currentPage: +page,
                        totalPages: Math.ceil(totalCount / limit),
                        //   hasNextPage,
                        //   hasPrevPage,
                    };

                    res.status(200).json({ data: result, pagination: paginationInfo });
                }
            });
        }
    });
});



// Edit notification endpoint
router.patch('/edit-notification/:NotificationId', (req, res) => {
    const { NotificationId } = req.params;
    const { title, message, image, linkto } = req.body;

    const sql = 'UPDATE notifications SET title=?, message=?, image=?, linkto=? WHERE NotificationId=?';
    db.query(sql, [title, message, image, linkto, NotificationId], (err, result) => {
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

    const sql = 'DELETE FROM notifications WHERE NotificationId=?';
    db.query(sql, [NotificationId], (err, result) => {
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
