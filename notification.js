const express = require('express');
const bodyParser = require('body-parser');
const db = require('./db');
const axios = require('axios');

const router = express.Router();

// Middleware for handling JSON
router.use(express.json());

// Body parser middleware
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

// Send notification endpoint
router.post('/send-notification', async (req, res) => {
  try {
    const { title, message, image, link } = req.body;
    // Send the base64-encoded image directly
    const base64Image = image;
    // Insert notification into local database
    const insertSql = 'INSERT INTO notifications (title, message, image, link) VALUES (?, ?, ?, ?)';
    db.query(insertSql, [title, message, base64Image, link], async (err, result) => {
      if (err) {
        console.error('Error in send-notification endpoint:', err);
        return res.status(500).send({ error: err.message });
      }
      // Notification inserted successfully, now call the external API
      try {
        const externalApiUrl = 'https://app.nativenotify.com/api/notification';
        const externalApiPayload = {
          appId: 16351,
          appToken: 'hYNQ78ihflsQqOQA5RhYBN',
          title: title,
          body: message,
          dateSent: new Date().toLocaleString(), // You might want to format this according to your needs
          pushData: { yourProperty: 'yourPropertyValue' },
          bigPictureURL: 'Big picture URL as a string',
        };
        const externalApiResponse = await axios.post(externalApiUrl, externalApiPayload);
        // Handle the response from the external API
        console.log('External API Response:', externalApiResponse.data);
        res.status(200).send({ message: 'Notification sent successfully' });
      } catch (externalApiError) {
        console.error('Error calling external API:', externalApiError);
        res.status(500).send({ error: 'Error calling external API' });
      }
    });
  } catch (error) {
    console.error('Error in send-notification endpoint:', error);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});


router.post('/send-push-notification', async (req, res) => {
  try {
    const { title, message, image, linkto } = req.body;
    // Send the base64-encoded image directly
    const base64Image = image;
    // Insert notification into local database
    const insertSql = 'INSERT INTO notifications (title, message, image, link) VALUES (?, ?, ?, ?)';
    db.query(insertSql, [title, message, base64Image, linkto], async (err, result) => {
      if (err) {
        console.error('Error in send-notification endpoint:', err);
        return res.status(500).send({ error: err.message });
      }
      // Notification inserted successfully, now call the external API
      try {
        const externalApiUrl = 'https://app.nativenotify.com/api/notification';
        const externalApiPayload = {
          appId: 16351,
          appToken: 'hYNQ78ihflsQqOQA5RhYBN',
          title: title,
          body: message,
          dateSent: new Date().toLocaleString(),
          pushData: { yourProperty: 'yourPropertyValue' },
          bigPictureURL: 'Big picture URL as a string',
        };
        const externalApiResponse = await axios.post(externalApiUrl, externalApiPayload);
        // Handle the response from the first external API
        console.log('External API Response:', externalApiResponse.data);
        // Check if the response status is 200
        if (externalApiResponse.data) {
          // If successful, trigger the second external API call
          const secondExternalApiUrl = `https://app.nativenotify.com/api/notification/inbox/16351/hYNQ78ihflsQqOQA5RhYBN`;
          const secondExternalApiResponse = await axios.get(secondExternalApiUrl);
          // Assuming the response is an array and you want to get the first element
          const firstNotificationId = secondExternalApiResponse.data[0]?.notification_id;
          // Insert the notification_id into your local database
          const updateSql = 'UPDATE notifications SET refer_notification_id = ? WHERE NotificationId = ?';
          db.query(updateSql, [firstNotificationId, result.insertId], (updateErr) => {
            if (updateErr) {
              console.error('Error updating refer_notification_id:', updateErr);
            }
          });
          res.status(200).send({ message: 'Notification sent successfully' });
        } else {
          res.status(500).send({ error: 'First external API call failed' });
        }
      } catch (externalApiError) {
        console.error('Error calling external API:', externalApiError);
        res.status(500).send({ error: 'Error calling external API' });
      }
    });
  } catch (error) {
    console.error('Error in send-notification endpoint:', error);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});

router.get('/get-push-notification', async (req, res) => {
  try {
    const { page = 1, limit = 10, sortField = 'NotificationId', sortOrder = 'asc' } = req.query;
    const offset = (page - 1) * limit;
    const sortDirection = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    // Fetch internal notifications
    const internalSelectSql = `
      SELECT * FROM notifications
      ORDER BY ${sortField} ${sortDirection}
      LIMIT ${limit} OFFSET ${offset}
    `;
    const [internalResult, totalCount] = await Promise.all([
      queryAsync(internalSelectSql),
      queryAsync(`SELECT COUNT(*) as totalCount FROM notifications`),
    ]);
    // Fetch external notifications
    const externalApiUrl = 'https://app.nativenotify.com/api/notification/inbox/16351/hYNQ78ihflsQqOQA5RhYBN';
    const externalApiResponse = await axios.get(externalApiUrl);
    const externalResult = externalApiResponse.data;
    // Combine internal and external notifications based on matching IDs
    const combinedResult = internalResult.map(internalNotification => {
      const matchingExternalNotification = externalResult.find(
        externalNotification => externalNotification.notification_id === internalNotification.refer_notification_id
      );
      return {
        NotificationId: internalNotification.NotificationId,
        title: internalNotification.title,
        message: internalNotification.message,
        image: internalNotification.image,
        link: internalNotification.link,
        refer_notification_id: internalNotification.refer_notification_id,
        pushData: matchingExternalNotification ? JSON.parse(matchingExternalNotification.pushData) : null,
        date: matchingExternalNotification ? matchingExternalNotification.date : null,
      };
    });
    const paginationInfo = {
      totalCount: totalCount[0].totalCount,
      currentPage: +page,
      totalPages: Math.ceil(totalCount[0].totalCount / limit),
    };
    res.status(200).json({ data: combinedResult, pagination: paginationInfo });
  } catch (error) {
    console.error('Error in get-push-notification endpoint:', error);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});
// Helper function to execute SQL queries with promises
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
  const { title, message, image, link } = req.body;

  const updateSql = 'UPDATE notifications SET title=?, message=?, image=?, link=? WHERE NotificationId=?';
  db.query(updateSql, [title, message, image, link, NotificationId], (err, result) => {
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
// router.delete('/delete-notification/:NotificationId', async (req, res) => {
//   try {
//     const { NotificationId } = req.params;
//     // Delete notification from local database
//     const deleteSql = 'DELETE FROM notifications WHERE NotificationId=?';
//     db.query(deleteSql, [NotificationId], async (err, result) => {
//       if (err) {
//         return res.status(500).send({ error: err.message });
//       }
//       if (result.affectedRows === 0) {
//         return res.status(404).send({ message: 'No matching notification found' });
//       }
//       // Notification deleted successfully from local database, now delete from external API
//       try {
//         const externalApiUrl = `https://app.nativenotify.com/api/notification/inbox/notification/16351/hYNQ78ihflsQqOQA5RhYBN/${NotificationId}`;
//         const externalApiResponse = await axios.delete(externalApiUrl);
//         // Handle the response from the external API
//         console.log('External API Response:', externalApiResponse.data);
//         res.status(200).send({ message: 'Notification deleted successfully' });
//       } catch (externalApiError) {
//         console.error('Error calling external API:', externalApiError);
//         res.status(500).send({ error: 'Error calling external API' });
//       }
//     });
//   } catch (error) {
//     console.error('Error in delete-notification endpoint:', error);
//     res.status(500).send({ error: 'Internal Server Error' });
//   }
// });

// // Delete notification endpoint
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
