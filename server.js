const express = require('express');
const multer = require('multer');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const app = express();
const port = process.env.PORT || 8006;

const mongoURI = 'mongodb+srv://kalpeshkahre7777:Kalpesh%40123@yearbook.f0h3kns.mongodb.net/yearbook';

mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err));

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
});

const memorySchema = new mongoose.Schema({
  selectedSport: String,
  selectedName: String,
  description: String,
  userName: String,
  userEmail: String,
  photo: String,
  video: String,
}, { collection: 'responses' });

const Memory = mongoose.model('Memory', memorySchema);


const User = mongoose.model('User', userSchema);

app.use(bodyParser.json());
app.use(cors());

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({ storage });

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user && await bcrypt.compare(password, user.password)) {
      res.json({ message: 'Login successful', name: user.name, email: user.email });
    } else {
      res.status(401).json({ error: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error logging in' });
  }
});

app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();
    res.json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error registering user' });
  }
});



// Add this route for alumni registration
app.post('/api/alumni-register', async (req, res) => {
  const { name, rollNo, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, rollNo, email, password: hashedPassword });
    await newUser.save();
    res.json({ message: 'Alumni registered successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error registering alumni' });
  }
});


app.post('/api/submit', upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'video', maxCount: 1 }]), async (req, res) => {
  const { selectedSport, selectedName, description, userName, userEmail } = req.body;
  const photo = req.files.photo ? req.files.photo[0].path : null;
  const video = req.files.video ? req.files.video[0].path : null;

  try {
    // Create a new memory document
    const newMemory = new Memory({
      selectedSport,
      selectedName,
      description,
      userName,
      userEmail,
      photo,
      video,
    });

    // Save the memory document to MongoDB
    await newMemory.save();

    res.json({ message: 'Form submitted successfully and data saved to database' });
  } catch (error) {
    console.error('Error saving memory:', error);
    res.status(500).json({ error: 'Error saving memory to database' });
  }
});


app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
