import { getDb } from '../db/connection.js';
import { ObjectId } from "mongodb";



export async function createReferee({ user_id, full_name, title, organization, relationship, email, preferred_contact_method, phone, availability_notes,tags, last_used_at, usage_count}) {
  const db = getDb();
  const references = db.collection('Referees');

  const doc =  { user_id, full_name, title, organization, relationship, email, preferred_contact_method, phone, availability_notes,tags, last_used_at, usage_count}

  const res = await references.insertOne(doc);
  return { _id: res.insertedId };
}

export async function updateReferee({ user_id, full_name, title, organization, relationship, email, preferred_contact_method, phone, availability_notes,tags, last_used_at, usage_count,referenceid}) {
  const db = getDb();

  const doc =  { user_id, full_name, title, organization, relationship, email, preferred_contact_method, phone, availability_notes,tags, last_used_at, usage_count}

      const result = await db
      .collection("Referees")
      .updateOne(
        { _id: new ObjectId(referenceid) }, 
        { $set: doc }
      );

    if (result.matchedCount === 0) {
      return { message: "Referee not found" };
    }

  return { _id: referenceid};
}

export async function getReferee({ userid,referee_id}) {
  const db = getDb();
  let result;
   result = await db
    .collection("Referees")
    .findOne(     { _id: new ObjectId(referee_id), user_id: userid }  )
 

  return result ;
}


export async function getALLReferee({ userid}) {
  const db = getDb();
  let result;
   result = await db
    .collection("Referees")
    .find(     { user_id: userid }  ).toArray();
 

  return result ;
}

export async function deleteReferees({ referee_ids}) {
    const idsToDelete = [];
  for (const key in referee_ids) {
    idsToDelete.push(new ObjectId(referee_ids[key]))
  }

  const db = getDb();
  let result;
   result = await db
    .collection("Referees")
    .deleteMany(  { _id: { $in: idsToDelete } }  )
 

  return result ;
}

