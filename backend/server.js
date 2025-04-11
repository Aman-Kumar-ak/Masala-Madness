// backend/server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dishesRoutes = require('./dishes');

const app = express();
app.use(cors());
app.use(bodyParser.json()); // Parse incoming JSON data

app.use('/api', dishesRoutes);

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
})
