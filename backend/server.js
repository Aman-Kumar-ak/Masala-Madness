const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const dishRoutes = require('./routes/dishRoutes');
const orderRoutes = require('./routes/orderRoutes');
const discountRoutes = require('./routes/discountRoutes');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/dishes', dishRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/discounts', discountRoutes);

app.get('/', (req, res) => {
  res.send('Masala Madness API is running.');
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected.');
    app.listen(5000, () => console.log('Server running on port 5000'));
  })
  .catch((err) => console.error(err));
