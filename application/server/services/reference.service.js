import { getDb } from '../db/connection.js';
import { ObjectId, ReturnDocument, Timestamp } from "mongodb";



export async function createReferee({ user_id, full_name, title, organization, relationship, email, preferred_contact_method, phone, tags, last_used_at, usage_count,availability_status,availability_other_note,preferred_opportunity_types,preferred_number_of_uses}) {
  const db = getDb();
  const references = db.collection('Referees');

  const doc =  { user_id, full_name, title, organization, relationship, email, preferred_contact_method, phone, tags, last_used_at, usage_count,availability_status,availability_other_note,preferred_opportunity_types,preferred_number_of_uses}

  const res = await references.insertOne(doc);
  return { _id: res.insertedId };
}

export async function updateReferee({ user_id, full_name, title, organization, relationship, email, preferred_contact_method, phone, tags, last_used_at, usage_count,referenceid,availability_status,availability_other_note,preferred_opportunity_types,preferred_number_of_uses}) {
  const db = getDb();

  const doc =  { user_id, full_name, title, organization, relationship, email, preferred_contact_method, phone, tags, last_used_at, usage_count,availability_status,availability_other_note,preferred_opportunity_types,preferred_number_of_uses}

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

export async function updateJobandReferee({referenceIds, job_id}) {
  const db = getDb();
  const referencestoad = [];
  for (const key in referenceIds) {
      const doc =  { 
      reference_id: referenceIds[key],     // ObjectId of the referee
      status: "planned",
      requested_at: "",
      responded_at: "",
      notes: "",
  }
    referencestoad.push(doc)

      const Refereeresult = await db
      .collection("Referees")
      .updateOne(
        { _id: new ObjectId(referenceIds[key]) }, 
        { $set: {last_used_at: new Date().toISOString()} ,  $inc: { usage_count: 1 } }
      );
  }


  const Jobresult = await db
    .collection("jobs")
    .findOneAndUpdate(
      { _id: new ObjectId(job_id) }, 
      { $set: {references: referencestoad} },
      {returnDocument: "after"}
    );

  if (Jobresult.matchedCount === 0) {
    return { message: "Referee not found" };
  }

  return Jobresult
}

export async function updateJobReferencestat({referenceId, job_id,status}) {
  const db = getDb();


const Jobresult = await db
  .collection("jobs")
  .findOneAndUpdate(
    { 
      _id: new ObjectId(job_id), 
      "references.reference_id": referenceId 
    },
    { 
      $set: { 
        "references.$.status": status 
      } 
    },
    { returnDocument: "after" }
  );

    if (Jobresult === null) {
    return { message: "Referee not found" };
  }

  return Jobresult
}