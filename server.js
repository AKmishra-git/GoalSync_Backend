import dotenv from 'dotenv';
dotenv.config();

async function startServer() {
  const { default: app } = await import('./src/app.js');
  const { default: connectDB } = await import('./src/config/database.js');

  const PORT = process.env.PORT || 8000;

  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

startServer();
