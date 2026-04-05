import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';

const connectionString = `${process.env.DATABASE_URL}`;
const needsSsl =
  process.env.NODE_ENV === 'production' ||
  connectionString.includes('aivencloud.com') ||
  connectionString.includes('supabase.com');

const adapter = new PrismaPg({
  connectionString,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
});
const prisma = new PrismaClient({ adapter });

export default prisma;
