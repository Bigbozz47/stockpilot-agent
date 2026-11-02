import mongoose from 'mongoose';
import { logger } from './logger';

/** Module load must not throw: dbConnect validates env per call (Next.js + tsx seed both load env lazily). */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache | undefined;
}

const cached: MongooseCache = globalThis.mongoose ?? { conn: null, promise: null };

if (!globalThis.mongoose) {
  globalThis.mongoose = cached;
}

export async function dbConnect(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      '[StockPilot] MONGODB_URI missing. Set it in .env.local (e.g., mongodb://localhost:27017/stockpilot)',
    );
  }
  // Return cached connection if already established
  if (cached.conn) {
    return cached.conn;
  }

  // If no connection promise exists, create one
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    cached.promise = mongoose
      .connect(uri, opts)
      .then(async (mongooseInstance) => {
        logger.info(
          'MongoDB',
          `Connected (readyState=${mongooseInstance.connection.readyState}) ` +
            `to ${mongooseInstance.connection.host}:${mongooseInstance.connection.port}/${mongooseInstance.connection.name}`,
        );

        mongooseInstance.connection.on('disconnected', () => {
          logger.warn('MongoDB', 'Disconnected');
        });

        mongooseInstance.connection.on('error', (err: Error) => {
          logger.error('MongoDB', 'Connection error:', err.message);
        });

        mongooseInstance.connection.on('reconnected', () => {
          logger.info('MongoDB', 'Reconnected');
        });

        return mongooseInstance;
      })
      .catch((err: Error) => {
        cached.promise = null;
        logger.error('MongoDB', 'Failed to connect:', err.message);
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }

  return cached.conn;
}

export default dbConnect;