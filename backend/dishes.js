// backend/dishes.js
const express = require('express');
const router = express.Router();
const connection = require('./db');

// Get all dishes
router.get('/dishes', (req, res) => {
  connection.query('SELECT * FROM dishes', (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Database error' });
    } else {
      res.json(results);
    }
  });
});

// Add a new dish
router.post('/dishes', (req, res) => {
  const { name, description, full_price, half_price, image_url } = req.body;
  connection.query(
    'INSERT INTO dishes (name, description, full_price, half_price, image_url) VALUES (?, ?, ?, ?, ?)',
    [name, description, full_price, half_price, image_url],
    (err, results) => {
      if (err) {
        res.status(500).json({ error: 'Database error' });
      } else {
        res.json({ message: 'Dish added successfully' });
      }
    }
  );
});

// Update an existing dish
router.put('/dishes/:id', (req, res) => {
  const { name, description, full_price, half_price, image_url } = req.body;
  const { id } = req.params;
  connection.query(
    'UPDATE dishes SET name = ?, description = ?, full_price = ?, half_price = ?, image_url = ? WHERE id = ?',
    [name, description, full_price, half_price, image_url, id],
    (err, results) => {
      if (err) {
        res.status(500).json({ error: 'Database error' });
      } else {
        res.json({ message: 'Dish updated successfully' });
      }
    }
  );
});

// Remove a dish
router.delete('/dishes/:id', (req, res) => {
  const { id } = req.params;
  connection.query('DELETE FROM dishes WHERE id = ?', [id], (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Database error' });
    } else {
      res.json({ message: 'Dish deleted successfully' });
    }
  });
});

module.exports = router;
