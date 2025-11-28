import { getDb } from '../db/connection.js';
import { ObjectId, ReturnDocument, Timestamp } from "mongodb";
import 'dotenv/config';
import { file, object } from 'zod';




export async function fetchAllPeerGroups(filter) {
  const db = getDb();
  let result;
   result = await db
    .collection("PeerGroups")
    .find(    filter  )
    .toArray();
  return result ;
}

export async function updatePeerGroup(filter,set=undefined,inc=undefined,options=undefined) {
  const db = getDb();
    const membership = await db
    .collection("PeerGroups")
    .findOneAndUpdate(
      {filter},
      { $set: set || {}, $inc: inc|| {}},
    options || {}
    );

  return membership ;
}

export async function updatePeerGroupMembership(filter,set,options) {
  const db = getDb();
    const membership = await db
    .collection("PeerGroupMembership")
    .findOneAndUpdate(
      {filter},
      { $set: set},
    options
    );

  return membership ;
}

export async function fetchAllmyPeerGroupMembership(userId) {
  const db = getDb();
  let result;
   result = await db
    .collection("PeerGroupMembership")
    .find( {userId: userId}  )
    .toArray()
 

  return result ;
}



export async function JoinPeerGroup(userId, groupId) {
  const db = getDb();

 

  const group = await fetchAllPeerGroups({_id: new ObjectId(groupId)})
      

   if (!group) {
      return  { error: "Group not found" };
    }

    const membership = await db
    .collection("PeerGroupMembership")
    .findOneAndUpdate(
      { userId, groupId },
      { $setOnInsert: { role: "member" } },
      { new: true, upsert: true }
    );

    if (membership.createdAt.getTime() === membership.updatedAt.getTime()) {
    const PeerGroup = await db
    .collection("PeerGroups")
    .updateOne(
      { _id: new ObjectId(groupId) },
      {$inc: { memberCount: 1 }, }
    );
     
    }


  if (PeerGroup.matchedCount === 0) {
    return { message: "membership not found" };
  }

  return membership

}


export async function LeavePeerGroup(userId, groupId) {
  const db = getDb();

 


    const membership = await db
    .collection("PeerGroupMembership")
    .findOneAndDelete({ userId, groupId })

    if (membership) {
      await updatePeerGroup(  { _id: new ObjectId(groupId) },   undefined,{ memberCount: -1 },  undefined )
      
    }


  if (membership.matchedCount === 0) {
    return false
  }

  return true


}

