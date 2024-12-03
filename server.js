import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

const { MONGO_URL, PORT = 7000 } = process.env;

// MongoDB connection
const connectDb = async () => {
  try {
    const client = await MongoClient.connect(MONGO_URL);
    console.log('MongoDB connected.');
    return client.db('kalmal_store_db');
  } catch (err) {
    console.error(`Error connecting to MongoDB: ${err.message}`);
    process.exit(1);
  }
};

/**
 * 
 * @param {*} lessons 
 * @returns Routes
 */
const createLessons = (lessons) => async (req, res) => {
  try {
    const result = await lessons.insertMany(req.body);
    res.status(201).json({ message: 'Lessons created successfully', result });
  } catch (err) {
    res.status(500).json({ error: err.message, success: false });
  }
};

const getLessons = (lessons) => async (req, res) => {
  try {
    const results = await lessons.find({}).toArray();
    res.status(200).json({ message: 'Lessons fetched successfully', results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateLesson = (lessons) => async (req, res) => {
  try {
    const { id } = req.params;
    const result = await lessons.updateOne({ _id: new ObjectId(id) }, { $set: req.body });
    res.json({ message: 'Lesson updated successfully', result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createOrder = (lessons, orders) => async (req, res) => {
  const { name, phone, lessonIDs, spaces } = req.body;
  if (!name || !phone || !lessonIDs || !spaces) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    const selectedLessons = await lessons.find({ _id: { $in: lessonIDs.map(id => new ObjectId(id)) } }).toArray();
    
    for (const lesson of selectedLessons) {
      if (lesson.spaces < spaces[lesson._id]) {
        return res.status(400).json({ error: `Not enough spaces for lesson: ${lesson.subject}` });
      }
    }

    const order = { name, phone, lessonIDs, spaces, createdAt: new Date() };
    const orderResult = await orders.insertOne(order);
    res.status(201).json({ message: 'Order created successfully', order: orderResult });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getOrders = (orders) => async (req, res) => {
  try {
    const results = await orders.find({}).toArray();
    res.json({ message: 'Orders fetched successfully', results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};




// Main function to initialize app and routes
const startApp = async () => {
  const db = await connectDb();
  const lessons = db.collection('lessons');
  const orders = db.collection('orders');

  app.post('/api/lessons', createLessons(lessons));
  app.put('/api/lessons/:id', updateLesson(lessons));
  app.get('/api/lessons', getLessons(lessons));
  app.post('/api/orders', createOrder(lessons, orders));
  app.get('/api/orders', getOrders(orders));
  // app.get('/api/search', searchLessons(lessons));

  app.listen(PORT, () => console.log(`Server running on port: ${PORT}`));
};

startApp();
