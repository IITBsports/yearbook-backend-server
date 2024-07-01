const express = require('express');
const multer = require('multer');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const app = express();
const port = process.env.PORT || 8086;
const AWS = require('aws-sdk');
const fs = require('fs');
const util = require('util');

const unlinkFile = util.promisify(fs.unlink);

const mongoURI = 'mongodb+srv://kalpeshkahre7777:Kalpesh%40123@yearbook.f0h3kns.mongodb.net/yearbook';

mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err));

AWS.config.update({
  accessKeyId: 'AKIA6ODVABP6D4SXY3UP',
  secretAccessKey: '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',
  region: 'eu-north-1',
});

const s3 = new AWS.S3();

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
  photos: [String],
  videos: [String],
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

const uploadToS3 = async (file) => {
  const fileStream = fs.createReadStream(file.path);
  
  const uploadParams = {
    Bucket: 'yearbook-images-videos',
    Body: fileStream,
    Key: file.filename,
  };

  const result = await s3.upload(uploadParams).promise();
  await unlinkFile(file.path);
  return result.Location;
};


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


app.post('/api/submit', upload.fields([{ name: 'photos' }, { name: 'videos' }]), async (req, res) => {
  const { selectedSport, selectedName, description, userName, userEmail } = req.body;
  const photoFiles = req.files['photos'] || [];
  const videoFiles = req.files['videos'] || [];

  try {
    const photoUrls = await Promise.all(photoFiles.map(uploadToS3));
    const videoUrls = await Promise.all(videoFiles.map(uploadToS3));

    const newMemory = new Memory({
      selectedSport,
      selectedName,
      description,
      userName,
      userEmail,
      photos: photoUrls,
      videos: videoUrls,
    });

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
