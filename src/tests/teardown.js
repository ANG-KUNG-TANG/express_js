import mongoose from 'mongoose';

export default async () => {
  await mongoose.disconnect();
  if (global.__MONGO_SERVER__) {
    await global.__MONGO_SERVER__.stop();
  }
};