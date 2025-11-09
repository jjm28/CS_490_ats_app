import { getDb } from '../db/connection.js';

import { ObjectId } from "mongodb";


export async function createCoverletter({ userid, filename, lastSaved,templateKey},coverletterdata) {
  const db = getDb();
  const coverletters = db.collection('coverletters');

  const doc = {
    owner: userid,
    filename: filename,
    templateKey: templateKey,
    coverletterdata: coverletterdata,
    lastSaved: lastSaved
  };

  const res = await coverletters.insertOne(doc);
  return { _id: res.insertedId, owner: doc.id };
}

export async function updateCoverletter({ coverletterid,userid, filename, lastSaved},coverletterdata) {
  const db = getDb();

  const doc = {
    filename: filename,
    coverletterdata: coverletterdata,
    lastSaved: lastSaved
  };
      const result = await db
      .collection("coverletters")
      .updateOne(
        { _id: new ObjectId(coverletterid), owner: userid }, 
        { $set: doc }
      );

    if (result.matchedCount === 0) {
      return { message: "CoverLetter not found" };
    }

  return { _id: coverletterid};
}

export async function getCoverletter({ userid,coverletterid}) {
  const db = getDb();
  let result;
  if (coverletterid == undefined){
   result = await db
    .collection("coverletters")
    .find(
      { owner: userid },
      { projection: { _id: 1, filename: 1, templateKey: 1, lastSaved: 1 } }
    )
    .toArray();
  }
  else {
       result = await db
    .collection("coverletters")
    .findOne(  { _id: new ObjectId(coverletterid), owner: userid}    )
  }

  return result ;
}



export async function createSharedLink({ userid,coverletterid,coverletterdata}) {
  const db = getDb();
  const sharedcoverletters = db.collection('sharedcoverletters');
  
  const result = await db.collection("sharedcoverletters").updateOne(
  { coverletterid: coverletterid, owner: userid },  // filter
  { $set: { expiresAt: new Date() , coverletterdata: coverletterdata} }    );
  if (result.matchedCount == 1){
    const sharedcoverletter = await db
    .collection("sharedcoverletters")
    .findOne(  { coverletterid: coverletterid, owner: userid }    )
  return { sharedid: sharedcoverletter._id, url: `${process.env.FRONTEND_ORIGIN}/coverletter/share?sharedid=${sharedcoverletter._id}`, owner: sharedcoverletter._id };
  }
  const coverletter = await getCoverletter({userid,coverletterid})
  delete coverletter._id;
  coverletter.expiresAt = new Date()
  coverletter.coverletterid = coverletterid

  const res = await sharedcoverletters.insertOne(coverletter);
  return { sharedid: res.insertedId, url: `${process.env.FRONTEND_ORIGIN}/coverletter/share?sharedid=${res.insertedId}`, owner: coverletter.owner };
}

export async function fetchSharedCoverletter({ sharedid}) {
    const db = getDb();
    const sharedcoverletter = await db
    .collection("sharedcoverletters")
    .findOne(  { _id: new ObjectId(sharedid) } )
    return sharedcoverletter

}

export async function findmostpopular() {
    const db = getDb();

  try {
    const result = await db
      .collection("coverletters")
      .aggregate([
        { $match: { templateKey: { $exists: true, $ne: null } } },
        { $group: { _id: "$templateKey", count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } }, // sort by count desc, then alphabetically
        { $limit: 1 },
      ])
      .toArray();

    if (result.length > 0) {
      return {templateKey: result[0]._id}; // the most frequent templateKey
    } else {
      return null;
    }
  } catch (err) {
    console.error("Error while aggregating:", err);
    return null;
  }

}