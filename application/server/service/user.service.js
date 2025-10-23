// server/service/user.service.js
import { getDb } from '../db/connection.js';
import bcrypt from 'bcrypt';

const ROUNDS = 10;

export async function createUser({ email, password, firstName, lastName }) {
  const db = getDb();
  const users = db.collection('users');

  const doc = {
    email: String(email).toLowerCase(),
    passwordHash: await bcrypt.hash(password, ROUNDS),
    firstName,
    lastName,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const res = await users.insertOne(doc); // throws 11000 on duplicate email
  return { _id: res.insertedId, email: doc.email, firstName, lastName };
}

export async function findUserByEmail(email) {
  const db = getDb();
  return db.collection('users').findOne({ email: String(email).toLowerCase() });
}
