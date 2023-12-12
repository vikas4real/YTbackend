import 'dotenv/config';
import connectDB from './db/index.js';
import { app } from './app.js';

connectDB()
  .then(() => {
    const PORT = process.env.PORT || 8000;
    app.listen(PORT, () => {
      console.log(`Server is running at port:${PORT}`);
    });
  })
  .catch((error) => {
    console.log(error);
  });
