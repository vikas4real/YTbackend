import 'dotenv/config';
import express from 'express';
import connectDB from './db/index.js';

connectDB();
/*
const app = express();
(async () => {
  try {
    await mongoose.connect(`${process.env.DATABASE_URL}/${DB_NAME}`);

    app.on('error', (error) => {
      console.log('ERROR:', error);
      throw error;
    });
    app.listen(process.env.PORT, () => {
      console.log(`App is running on port:${process.env.PORT}`);
    });
  } catch (error) {
    console.error('ERROR:', error);
    throw error;
  }
})();
*/
