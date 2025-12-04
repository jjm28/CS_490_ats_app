// server/service/user.service.js
import { getDb } from '../db/connection.js';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from "mongodb";

const ROUNDS = 10;

export async function createUser({ email, password, firstName, lastName,role }) {
  const db = getDb();
  const users = db.collection('users');
  const emailLower = String(email).toLowerCase();


  let passwordHash = null;
  if (password) {
    // Only hash if password is provided (e.g., manual signup)
    passwordHash = await bcrypt.hash(password, ROUNDS);
  }
  const doc = {
     _id: uuidv4(), 
    email: emailLower,
    passwordHash: passwordHash, //encrytion for password
    firstName,
    lastName,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    role: role,
    organizationId: null
  };

  const res = await users.insertOne(doc); // throws an error if duplicate email is entered
  return { _id: res.insertedId, email: doc.email, firstName, lastName, role: doc.role,
    organizationId: doc.organizationId };
}

export async function verifyUser({ email, password },isprovider) {
  const db = getDb();
  const users = db.collection('users');

  const user = await users.findOne({ email: email});
  if (!user) {
    const err =  Error('Invalid credentials');
    err.statusCode = 400;
    throw err
    }
  
  if (user.isDeleted) {
    const err = new Error('Account deleted');
    err.statusCode = 403;
    throw err;
  }
if(!isprovider){
  const authpass = await bcrypt.compare(password, user.passwordHash)
  if (!authpass){
    const err =  Error('Invalid credentials');
    err.statusCode = 400;
    throw err
  }
}
  console.log(user)
  //return { _id: user._id, email: email}
    return { _id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName, role : user.role,
        organizationId : user.organizationId};
}

export async function findUserByEmail(email) {
  const db = getDb();
  return db.collection('users').findOne({ email: String(email).toLowerCase() });
}
export async function findUserByEmailCaseSensitve(email) {
  const db = getDb()
  const users = db.collection('users');
  return await users.findOne({ email: email});
}

export async function UpdateUser({ userId, role,organizationId }) {
  const db = getDb();
  const users = db.collection('users');

  let user = await users.findOne({ _id: userId});

  if (!user) {
    const err =  Error('Invalid credentials');
    err.statusCode = 400;
    throw err
    }

 user = await users.findOneAndUpdate(
      { _id: userId}, 
      { $set: {role: role, organizationId: organizationId} },
      {returnDocument: "after"}
    );


  //return { _id: user._id, email: email}
    return { _id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName, role : user.role,
        organizationId : user.organizationId};
}