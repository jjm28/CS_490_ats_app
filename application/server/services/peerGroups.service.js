import { getDb } from '../db/connection.js';
import { ObjectId, ReturnDocument, Timestamp } from "mongodb";
import 'dotenv/config';
import { file, object } from 'zod';
import PeerGroup from "../models/PeerGroup.js";
import PeerGroupMembership from "../models/PeerGroupMembership.js"



export async function fetchAllPeerGroups(filter) {
    
  let result;
   result = await PeerGroup
    .find(    filter  )
    .lean()
  return result ;
}
export async function fetchAllPeerGroupMembership(filter) {
    
  let result;
   result = await PeerGroupMembership
    .find(    filter  )
    .lean()
  return result ;
}

export async function updatePeerGroup(filter,set=undefined,inc=undefined,options=undefined) {
    const membership = await PeerGroup
    .findOneAndUpdate(
      filter,
      { $set: set || {}, $inc: inc|| {}},
    options || {}
    );
    return membership
}

export async function updatePeerGroupMembership(filter,set,options) {
  const db = getDb();
    const membership = await PeerGroupMembership
    .findOneAndUpdate(
      filter,
      { $set: set},
    options
    );

  return membership ;
}

export async function fetchAllmyPeerGroupMembership(userId) {
  const db = getDb();
  let result;
   result = await PeerGroupMembership
    .find( {userId: userId}  )
   .lean()
 

  return result ;
}



export async function JoinPeerGroup(userId, groupId) {
  const db = getDb();

 

  const group = await fetchAllPeerGroups({_id: new ObjectId(groupId)})
      

   if (!group) {
      return  { error: "Group not found" };
    }

    const membership = await PeerGroupMembership
    .findOneAndUpdate(
      { userId, groupId },
      { $setOnInsert: { role: "member" } },
      { new: true, upsert: true }
    );

    if (membership.createdAt.getTime() === membership.updatedAt.getTime()) {
    const PeerGroups = await PeerGroup
    .updateOne(
      { _id: new ObjectId(groupId) },
      {$inc: { memberCount: 1 }, }
    );
       if (PeerGroups.matchedCount === 0) {
    return { message: "membership not found" };
  }
    }




  return membership

}


export async function LeavePeerGroup(userId, groupId) {
  const db = getDb();

    const membership = await 
    PeerGroupMembership
    .findOneAndDelete({ userId, groupId })
    if (membership) {
      await updatePeerGroup(  { _id: new ObjectId(groupId) },   undefined,{ memberCount: -1 },  undefined )
      
    }
  return true


}

export async function DeleteGroup( groupId) {
    await PeerGroupMembership.deleteMany({ groupId: groupId });
    await PeerGroup.deleteOne({ _id: new ObjectId(groupId )});
   
  return true


}


export async function canManageGroup(user, group) {
  if (!group) return false;
  if (!user) return false;
  if (group.createdBy == user) return true;
   console.log(group.createdBy == user)
  return false;
}


export async function createGroup( { userId, name, description, industry, role, tags }) {
    const group = await PeerGroup.create({
      name,
      description: description || "",
      industry: industry || null,
      role: role || null,
      tags: Array.isArray(tags) ? tags : [],
      createdBy: userId,
      memberCount: 1, // creator is first member
    });

    // creator becomes owner member
    const membership = await PeerGroupMembership.create({
      userId:userId,
      groupId: group._id,
      role: "owner",
      showRealNameInGroup: true,
      receiveOpportunityAlerts: true,
    });

    return {group,membership}
}
