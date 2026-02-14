import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

export default async () => {
  const mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  global.__MONGO_SERVER__ = mongoServer;
  global.__MONGO_URI__ = uri;
};