const express = require('express');
const notificationsRouter = require('./notification');

const app = express();
const port = 3000;

// Use the notifications router
app.use('/v1/api', notificationsRouter);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
