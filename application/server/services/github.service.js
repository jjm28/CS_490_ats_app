import { getDb } from '../db/connection.js';
import { ObjectId, ReturnDocument, Timestamp } from "mongodb";
import 'dotenv/config';

/*
  fakeUserStore.set("user-123", {
    githubAccessToken: "gho_...",
    githubLogin: "octocat",
  });
*/

// Helper to load/save user GitHub info
export async function getUserRecord(appUserId) {
  const db = getDb();
  const userstore = db.collection('usergithubrecord');
  let usergitrecord = await userstore.findOne({ userid: appUserId})

    if (!usergitrecord) {
                    const doc = {
                        userid: appUserId,
                        githubAccess: {}
                        }
                        await  userstore.insertOne(doc)
                        usergitrecord =  doc
     }
  return usergitrecord;
}



export async function updateUserRecord(appUserId, data = {}) {
  const db = getDb();
  const userstore = db.collection("usergithubrecord");
try {
  // 1. Try to find existing record
  let existing = await userstore.findOne({ userid: appUserId });

  // 2. If no record exists, create a new one
  if (!existing) {
    const newDoc = {
      userid: appUserId,
      githubAccess: data,             // store the GitHub fields directly
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await userstore.insertOne(newDoc);
    return newDoc;
  }

  // 3. Prepare only the fields you want updated
  const updatedFields = {
    githubAccess: data,              // githubAccessToken, githubLogin, githubId
    updatedAt: new Date(),
  };

  // 4. Update the record safely
  const updated = await userstore.updateOne(
    { userid: appUserId },
    { $set: updatedFields }
  );
  console.log(updated)
}
catch (err){
    console.log("Error upating user record: ",err)
}

}



