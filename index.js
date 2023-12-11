const express = require('express');
const notificationsRouter = require('./notification');

const app = express();
const port = 3000;

app.use('/v1/api', notificationsRouter);

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Methods', 'GET');
    next();
  });

app.get('/health', (req, res) => {
    const data = {
      uptime: process.uptime(),
      message: 'Ok',
      date: new Date()
    }
  
    res.status(200).send(data);
  });

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
