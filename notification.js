const express = require('express');
const bodyParser = require('body-parser');
const db = require('./db');
const axios = require('axios');
const AWS = require('aws-sdk');
const router = express.Router();
require('dotenv').config();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const { initializeApp } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");
const admin = require("firebase-admin"); // Add this line


const serviceAccount = require("./serviceAccountKey.json");

initializeApp({
  credential: admin.credential.cert(serviceAccount), // Use 'admin' here
  projectId: "push-notification-3f697",
});

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
  endpoint: process.env.AWS_ENDPOINT, // Correct format for S3 endpoint
});

router.use(express.json());
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));


function isValidUrl(url) {
  const urlRegex = /^(ftp|http|https):\/\/[^ "]+$/;
  return urlRegex.test(url);
}

router.post('/send-push-notification', upload.single('image'), async (req, res) => {
  try {
    const { title, message, link } = req.body;

    if (!title || !message || !link) {
      return res.status(400).send({ error: 'Please enter all entities' });
    }

    if (!isValidUrl(link)) {
      return res.status(400).send({ error: 'Invalid URL link' });
    }

    if (!req.file) {
      return res.status(400).send({ error: 'No file uploaded' });
    }

    const file = req.file;
    const fileName = file.originalname;
    const filePath = file.path;

    const s3Params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: 'uploads/' + fileName,
      Body: require('fs').createReadStream(filePath),
      ACL: 'public-read',
      ContentType: file.mimetype,
    };

    try {
      const s3Response = await s3.upload(s3Params).promise();
      const imageUrl = s3Response.Location;

      console.log('Image uploaded to S3:', imageUrl);

      // Insert notification into local database
      const insertSql = 'INSERT INTO notifications (title, message, image, link) VALUES (?, ?, ?, ?)';
      db.query(insertSql, [title, message, imageUrl, link], async (err, result) => {
        if (err) {
          console.error('Error in send-push-notification endpoint:', err);
          return res.status(500).send({ error: err.message });
        }

        const currentDate = new Date();
        const options = { timeZone: 'Asia/Kolkata' };
        const formattedDate = currentDate.toLocaleString('en-US', options);

        // Notification inserted successfully, now call the external API
        try {
          const externalApiUrl = 'https://app.nativenotify.com/api/notification';
          const externalApiPayload = {
            appId: 16785,
            appToken: 'M4BkpOjRzzcSpbRoGzxT8i',
            title: title,
            body: message,
            dateSent: formattedDate,
            pushData: { yourProperty: 'yourPropertyValue' },
            bigPictureURL: imageUrl,
          };

          const externalApiResponse = await axios.post(externalApiUrl, externalApiPayload);

          // Handle the response from the external API
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
    } catch (s3Error) {
      console.error('Error uploading image to S3:', s3Error);
      res.status(500).send({ error: 'Error uploading image to S3' });
    } finally {
      require('fs').unlinkSync(filePath);
    }
  } catch (error) {
    console.error('Error in send-push-notification endpoint:', error);
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
        emoji: internalNotification.emoji,
      };
    });
    const paginationInfo = {
      totalCount: totalCount[0].totalCount,
      currentPage: +page,
      totalPages: Math.ceil(totalCount[0].totalCount / limit),
    };

    res.status(200).send({ data: combinedResult, pagination: paginationInfo });
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
router.delete('/delete-push-notification/:id', async (req, res) => {
  const { id } = req.params;


  try {
    // Delete the external notification
    // const externalApiUrl = `https://app.nativenotify.com/api/notification/inbox/notification/16351/hYNQ78ihflsQqOQA5RhYBN/${refer_notification_id}`;
    // await axios.delete(externalApiUrl);

    // Delete the internal notification
    const deleteSql = 'DELETE FROM notifications WHERE NotificationId=?';
    const result = await queryAsyncFunc(deleteSql, [id]);

    if (result.affectedRows === 0) {
      res.status(404).send({ message: 'No matching notification found' });
    } else {
      res.status(200).send({ message: 'Notification deleted successfully' });
    }
  } catch (error) {
    console.error('Error in delete-notification endpoint:', error);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});



router.post('/send-push-notification-users', upload.single('image'), async (req, res) => {
  try {
    const { title, message, link } = req.body;

    if (!title || !message || !link) {
      return res.status(400).send({ error: 'Please enter all entities' });
    }

    if (!isValidUrl(link)) {
      return res.status(400).send({ error: 'Invalid URL link' });
    }

    if (!req.file) {
      return res.status(400).send({ error: 'No file uploaded' });
    }

    const file = req.file;
    const fileName = file.originalname;
    const filePath = file.path;

    const s3Params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: 'uploads/' + fileName,
      Body: require('fs').createReadStream(filePath),
      ACL: 'public-read',
      ContentType: file.mimetype,
    };

    try {
      const s3Response = await s3.upload(s3Params).promise();
      const imageUrl = s3Response.Location;

      console.log('Image uploaded to S3:', imageUrl);

      // Insert notification into local database
      const insertSql = 'INSERT INTO notifications (title, message, image, link) VALUES (?, ?, ?, ?)';
      db.query(insertSql, [title, message, imageUrl, link], async (err, result) => {
        if (err) {
          console.error('Error in send-push-notification endpoint:', err);
          return res.status(500).send({ error: err.message });
        }

        // Retrieve Expo push tokens from the user table

        const userTokensSql = 'SELECT DISTINCT token FROM users';

        db.query(userTokensSql, async (tokenErr, tokenResults) => {
          if (tokenErr) {
            console.error('Error retrieving user tokens:', tokenErr);
            return res.status(500).send({ error: tokenErr.message });
          }

          const expoTokens = tokenResults.map((row) => row.token);

          // Notification inserted successfully, now call the external API
          try {
            const externalApiUrl = 'https://exp.host/--/api/v2/push/send';
            const externalApiPayload = {
              to: expoTokens,
              title: title,
              body: message,
              sound: 'default',
            };

            const externalApiResponse = await axios.post(externalApiUrl, externalApiPayload);

            // Handle the response from the external API
            console.log('External API Response:', externalApiResponse.data);

            // Check if the response status is 200
            if (externalApiResponse.data) {
              // Assuming the response is an array and you want to get the first element
              const firstNotificationId = externalApiResponse?.data?.id;

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
      });
    } catch (s3Error) {
      console.error('Error uploading image to S3:', s3Error);
      res.status(500).send({ error: 'Error uploading image to S3' });
    } finally {
      require('fs').unlinkSync(filePath);
    }
  } catch (error) {
    console.error('Error in send-push-notification endpoint:', error);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});



router.post('/send-push-notification-users-test', upload.single('image'), async (req, res) => {
  try {
    const { title, message, link } = req.body;

    if (!title || !message || !link) {
      return res.status(400).send({ error: 'Please enter all entities' });
    }

    if (!isValidUrl(link)) {
      return res.status(400).send({ error: 'Invalid URL link' });
    }

    if (!req.file) {
      return res.status(400).send({ error: 'No file uploaded' });
    }

    const file = req.file;
    const fileName = file.originalname;
    const filePath = file.path;

    const s3Params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: 'uploads/' + fileName,
      Body: require('fs').createReadStream(filePath),
      ACL: 'public-read',
      ContentType: file.mimetype,
    };

    try {
      const s3Response = await s3.upload(s3Params).promise();
      const imageUrl = s3Response.Location;

      console.log('Image uploaded to S3:', imageUrl);

      // Insert notification into local database
      const insertSql = 'INSERT INTO notifications (title, message, image, link) VALUES (?, ?, ?, ?)';
      db.query(insertSql, [title, message, imageUrl, link], async (err, result) => {
        if (err) {
          console.error('Error in send-push-notification endpoint:', err);
          return res.status(500).send({ error: err.message });
        }

        // Retrieve Expo push tokens from the user table

        const userTokensSql = 'SELECT DISTINCT token FROM users';

        db.query(userTokensSql, async (tokenErr, tokenResults) => {
          if (tokenErr) {
            console.error('Error retrieving user tokens:', tokenErr);
            return res.status(500).send({ error: tokenErr.message });
          }

          const expoTokens = tokenResults.map((row) => row.token);

          getMessaging().subscribeToTopic(expoTokens, "all")
            .then((response) => {
              const message1 = {
                android: {
                  notification: {
                    imageUrl:
                      imageUrl,
                  },
                },
                notification: {
                  title: title,
                  body: message,
                },
                topic: "all"
              };
            
              getMessaging()
                .send(message1)
                .then((response) => {
                  res.status(200).json({
                    message: "Successfully sent message",
                    response
                  });
                  console.log("Successfully sent message:", response);
                })
                .catch((error) => {
                  res.status(400);
                  res.send(error);
                  console.log("Error sending message:", error);
                });
            })
            .catch((error) => {
              console.log('Error subscribing to topic:', error);
            });
        });
      });
    } catch (s3Error) {
      console.error('Error uploading image to S3:', s3Error);
      res.status(500).send({ error: 'Error uploading image to S3' });
    } finally {
      require('fs').unlinkSync(filePath);
    }
  } catch (error) {
    console.error('Error in send-push-notification endpoint:', error);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});




// Helper function to execute SQL queries with promises
function queryAsyncFunc(sql, params) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

module.exports = router;
