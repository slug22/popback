// server.js
const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const app = express();
const path = require('path');
const fs = require('fs');
// CORS configuration
const corsOptions = {
  origin: 'http://localhost:8081',
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(bodyParser.json());
// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname))
  }
});

const upload = multer({ storage: storage });

// MySQL connection
// MySQL connection
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'popin'
});

connection.connect((err) => {
    if (err) {
      console.error('Error connecting to the database:', err);
      return;
    }
    console.log('Connected to the database');
  });
  
  // GET all venues
app.get('/venues', (req, res) => {
    const query = 'SELECT * FROM venues';
    connection.query(query, (error, results) => {
      if (error) {
        res.status(500).json({ error: 'Error fetching venues' });
      } else {
        res.json(results);
      }
    });
  });
  
  // GET a specific venue
  app.get('/venues/:id', (req, res) => {
    const query = 'SELECT * FROM venues WHERE id = ?';
    connection.query(query, [req.params.id], (error, results) => {
      if (error) {
        res.status(500).json({ error: 'Error fetching venue' });
      } else if (results.length === 0) {
        res.status(404).json({ error: 'Venue not found' });
      } else {
        res.json(results[0]);
      }
    });
  });
  
  // POST vote for a venue
  app.post('/vote', (req, res) => {
    const { venueId, voteType } = req.body;
    let query;
  
    if (voteType === 'upvote') {
      query = 'UPDATE venues SET upvotes = upvotes + 1 WHERE id = ?';
    } else if (voteType === 'downvote') {
      query = 'UPDATE venues SET downvotes = downvotes + 1 WHERE id = ?';
    } else {
      return res.status(400).json({ error: 'Invalid vote type' });
    }
  
    connection.query(query, [venueId], (error) => {
      if (error) {
        res.status(500).json({ error: 'Error updating vote' });
      } else {
        // Fetch updated venue
        const selectQuery = 'SELECT * FROM venues WHERE id = ?';
        connection.query(selectQuery, [venueId], (selectError, results) => {
          if (selectError) {
            res.status(500).json({ error: 'Error fetching updated venue' });
          } else {
            res.json(results[0]);
          }
        });
      }
    });
  });
  
  // POST update cover charge for a venue
  app.post('/venues/:id/cover', (req, res) => {
    const { id } = req.params;
    const { cover } = req.body;
  
    const query = 'UPDATE venues SET cover = ? WHERE id = ?';
    connection.query(query, [cover, id], (error) => {
      if (error) {
        res.status(500).json({ error: 'Error updating cover charge' });
      } else {
        // Fetch updated venue
        const selectQuery = 'SELECT * FROM venues WHERE id = ?';
        connection.query(selectQuery, [id], (selectError, results) => {
          if (selectError) {
            res.status(500).json({ error: 'Error fetching updated venue' });
          } else {
            res.json(results[0]);
          }
        });
      }
    });
  });
  
  // POST update pop for a venue
  app.post('/venues/:id/pop', (req, res) => {
    const { id } = req.params;
  
    const query = 'UPDATE venues SET pop = pop + 1 WHERE id = ?';
    connection.query(query, [id], (error) => {
      if (error) {
        res.status(500).json({ error: 'Error updating pop' });
      } else {
        // Fetch updated venue
        const selectQuery = 'SELECT * FROM venues WHERE id = ?';
        connection.query(selectQuery, [id], (selectError, results) => {
          if (selectError) {
            res.status(500).json({ error: 'Error fetching updated venue' });
          } else {
            res.json(results[0]);
          }
        });
      }
    });
  });
  
  // Periodically reset pop counts (e.g., every day at midnight)
  const resetPopCounts = () => {
    const query = 'UPDATE venues SET pop = 0';
    connection.query(query, (error) => {
      if (error) {
        console.error('Error resetting pop counts:', error);
      } else {
        console.log('Pop counts reset successfully');
      }
    });
  };
  
  // Schedule pop count reset (example: every day at midnight)
  const schedulePopReset = () => {
    const now = new Date();
    const night = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1, // next day
      0, 0, 0 // at 00:00:00 hours
    );
    const msToMidnight = night.getTime() - now.getTime();
  
    setTimeout(() => {
      resetPopCounts();
      // Then set interval to run every 24 hours
      setInterval(resetPopCounts, 24 * 60 * 60 * 1000);
    }, msToMidnight);
  };
  
  schedulePopReset();
  // POST upload a photo for a venue
// POST upload a photo for a venue
app.post('/venues/:id/photos', upload.single('photo'), (req, res) => {
  const { id } = req.params;

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const photoUrl = `http://localhost:3000/uploads/${req.file.filename}`;

  const query = 'INSERT INTO venue_photos (venue_id, photo_url) VALUES (?, ?)';
  connection.query(query, [id, photoUrl], (error, results) => {
    if (error) {
      console.error('Database error:', error);
      res.status(500).json({ error: 'Error uploading photo', details: error.message });
    } else {
      res.json({ message: 'Photo uploaded successfully', photoUrl });
    }
  });
});

// GET photos for a venue
app.get('/venues/:id/photos', (req, res) => {
  const { id } = req.params;

  const query = 'SELECT * FROM venue_photos WHERE venue_id = ?';
  connection.query(query, [id], (error, results) => {
    if (error) {
      console.error('Database error:', error);
      res.status(500).json({ error: 'Error fetching photos', details: error.message });
    } else {
      res.json(results);
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });