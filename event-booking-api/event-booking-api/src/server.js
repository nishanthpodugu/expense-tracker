require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const { MONGO_URI, JWT_SECRET, PORT = 5000 } = process.env;
if (!MONGO_URI || !JWT_SECRET) {
  console.error('MONGO_URI and JWT_SECRET must be set in .env');
  process.exit(1);
}

connectDB(MONGO_URI)
  .then(() => app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}  |  Docs: /api-docs`)))
  .catch((err) => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  });
