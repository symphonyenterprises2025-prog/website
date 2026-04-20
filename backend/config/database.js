const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/symphony-cms';
  const uriMatch = mongoUri.match(/mongodb(?:\+srv)?:\/\/[^/]+\/([^?]+)/i);
  const targetDb = uriMatch && uriMatch[1] ? uriMatch[1] : 'unknown';

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`MongoDB connected: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);
  } catch (error) {
    console.error('MongoDB connection failed.');
    console.error(`URI: ${mongoUri}`);
    console.error(`Target database: ${targetDb}`);
    if (error.message.includes('ECONNREFUSED')) {
      console.error('Reason: MongoDB service is unreachable on the configured host/port.');
      console.error('Action: Start local MongoDB service and verify port 27017 is open.');
    } else if (error.message.includes('Authentication failed')) {
      console.error('Reason: Invalid MongoDB username/password.');
      console.error('Action: Update MONGODB_URI credentials in backend/.env.');
    } else {
      console.error(`Reason: ${error.message}`);
    }
    process.exit(1);
  }
};

module.exports = connectDB;
