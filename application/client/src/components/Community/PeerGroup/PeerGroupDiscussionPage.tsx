import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Card from "../../StyledComponents/Card";
import Button from "../../StyledComponents/Button";
import GroupPrivacyModal, {
  type GroupPrivacyFormValues,
} from "./GroupPrivacyModal";
import {
  getPeerGroup,
  listMyPeerGroups,
  fetchGroupPosts,
  createGroupPost,
  updateMembershipPrivacy,
  fetchGroupChallenges,
  createGroupChallenge,
  joinGroupChallenge,
  updateGroupChallengeProgress,
  leaveGroupChallenge,
   updatePostHighlight,  
    fetchGroupOpportunities,
  createPeerOpportunity,
  expressInterestInOpportunity,
    fetchGroupEvents,
  createGroupEvent,
  rsvpToGroupEvent,
    fetchNetworkingImpact, createJobFromPeerOpportunity,
  type NetworkingImpactResponse,
  type PeerGroupEvent,
  type PeerGroupEventStats,
  type PeerGroupEventRsvp,
  type PeerOpportunity,
  type PeerOpportunityStats,
  type PeerOpportunityInterest,
  type PeerGroup,
  type PeerGroupMembership,
  type GroupPost,
  type GroupChallenge,
  type GroupChallengeParticipation,
  type GroupChallengeStats,
} from "../../../api/peerGroups";
import ChallengeCard from "./ChallengeCard";
import OpportunityCard from "./OpportunityCard";
import GroupEventCard from "./GroupEventCard";

import JobPickerSheet from "../../Coverletter/JobPickerSheet";
import MiniOpportunityForm, {
  type OpportunityDraft,
} from "./MiniOpportunityForm";
import { useJobs } from "../../Coverletter/hooks/useJobs";
export default function PeerGroupDiscussionPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();

  const [group, setGroup] = useState<PeerGroup | null>(null);
  const [myMemberships, setMyMemberships] = useState<PeerGroupMembership[]>([]);
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [content, setContent] = useState("");
  const [postType, setPostType] = useState<"insight" | "question" | "strategy">(
    "insight"
  );
    const currentUserId = JSON.parse(localStorage.getItem("authUser") ?? "").user._id
const [challenges, setChallenges] = useState<GroupChallenge[]>([]);
const [myChallengeParticipations, setMyChallengeParticipations] = useState<
  GroupChallengeParticipation[]
>([]);
const [challengeStats, setChallengeStats] = useState<
  Record<string, GroupChallengeStats>
>({});
const [challengesLoading, setChallengesLoading] = useState(true);
const [challengeError, setChallengeError] = useState<string | null>(null);
const [creatingChallenge, setCreatingChallenge] = useState(false);
const [newChallengeTitle, setNewChallengeTitle] = useState("");
const [newChallengeType, setNewChallengeType] = useState<
  "applications" | "outreach" | "practice" | "other"
>("applications");
const [newChallengeTarget, setNewChallengeTarget] = useState<string>("10");
const [newChallengeUnit, setNewChallengeUnit] = useState("applications");
const [newChallengeStart, setNewChallengeStart] = useState<string>("");
const [newChallengeEnd, setNewChallengeEnd] = useState<string>("");
const [newChallengeDescription, setNewChallengeDescription] = useState("");

const [opportunities, setOpportunities] = useState<PeerOpportunity[]>([]);
const [opportunityStats, setOpportunityStats] = useState<
  Record<string, PeerOpportunityStats>
>({});
const [myOpportunityInterests, setMyOpportunityInterests] = useState<
  PeerOpportunityInterest[]
>([]);
const [oppsLoading, setOppsLoading] = useState(true);
const [oppsError, setOppsError] = useState<string | null>(null);

// for share form
const [sharingOpp, setSharingOpp] = useState(false);
const [oppTitle, setOppTitle] = useState("");
const [oppCompany, setOppCompany] = useState("");
const [oppLocation, setOppLocation] = useState("");
const [oppUrl, setOppUrl] = useState("");
const [oppSource, setOppSource] = useState("");
const [oppTags, setOppTags] = useState("");
const [oppNotes, setOppNotes] = useState("");
const [oppReferralAvailable, setOppReferralAvailable] = useState(true);
const [oppMaxReferrals, setOppMaxReferrals] = useState<string>("");
// Events (group coaching / webinars)
const [events, setEvents] = useState<PeerGroupEvent[]>([]);
const [eventStats, setEventStats] = useState<
  Record<string, PeerGroupEventStats>
>({});
const [myEventRsvps, setMyEventRsvps] = useState<PeerGroupEventRsvp[]>([]);
const [eventsLoading, setEventsLoading] = useState<boolean>(true);
const [eventsError, setEventsError] = useState<string | null>(null);

// Create event form (owner only)
const [creatingEvent, setCreatingEvent] = useState(false);
const [eventTitle, setEventTitle] = useState("");
const [eventDescription, setEventDescription] = useState("");
const [eventType, setEventType] = useState<
  "group_coaching" | "webinar" | "office_hours" | "other"
>("group_coaching");
const [eventDate, setEventDate] = useState("");      // yyyy-mm-dd
const [eventStartTime, setEventStartTime] = useState(""); // HH:MM
const [eventEndTime, setEventEndTime] = useState("");     // HH:MM
const [eventLocationType, setEventLocationType] = useState<
  "online" | "in_person"
>("online");
const [eventLocationText, setEventLocationText] = useState("");
const [eventJoinUrl, setEventJoinUrl] = useState("");
const [eventMaxAttendees, setEventMaxAttendees] = useState<string>("");


// Jobs (for picking an existing job)
const { jobs, loading: jobsLoading, err: jobsError } = useJobs();

// Sharing opportunity flow
const [showOppJobPicker, setShowOppJobPicker] = useState(false);
const [showOppMiniForm, setShowOppMiniForm] = useState(false);
const [oppInitialDraft, setOppInitialDraft] = useState<Partial<OpportunityDraft> | null>(null);

// Alerts
const [newOppCount, setNewOppCount] = useState(0);
const [lastSeenOppTime, setLastSeenOppTime] = useState<number | null>(null);


const successPosts = useMemo(
  () => posts.filter((p) => p.highlightType === "success").slice(0, 3),
  [posts]
);

const learningPosts = useMemo(
  () => posts.filter((p) => p.highlightType === "learning").slice(0, 3),
  [posts]
);

const [networkingImpact, setNetworkingImpact] =
  useState<NetworkingImpactResponse | null>(null);
const [networkingImpactLoading, setNetworkingImpactLoading] =
  useState<boolean>(true);
const [networkingImpactError, setNetworkingImpactError] =
  useState<string | null>(null);

const [addToTrackerLoadingId, setAddToTrackerLoadingId] = useState<string | null>(null);
const [addToTrackerError, setAddToTrackerError] = useState<string | null>(null);

  // Privacy modal state
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const isGroupOwner = useMemo(() => {
    if (!group || !currentUserId) return false;
    return group.createdBy === currentUserId;
  }, [group, currentUserId]);
useEffect(() => {
  if (!groupId || !currentUserId) return;

  (async () => {
    try {
      setNetworkingImpactLoading(true);
      setNetworkingImpactError(null);

      const data = await fetchNetworkingImpact({
        groupId,
        userId: currentUserId,
      });

      setNetworkingImpact(data);
    } catch (e) {
      console.error(e);
      setNetworkingImpactError("Failed to load networking impact.");
    } finally {
      setNetworkingImpactLoading(false);
    }
  })();
}, [groupId, currentUserId]);

const handleAddOpportunityToTracker = async (opp: PeerOpportunity) => {
  if (!groupId || !currentUserId) return;
  try {
    setAddToTrackerError(null);
    setAddToTrackerLoadingId(opp._id);

    const job = await createJobFromPeerOpportunity({
      userId: currentUserId,
      groupId,
      opportunityId: opp._id,
    });

    // Navigate to the job detail/editor – adjust path to your real route
    navigate(`/jobs/${job._id}`);
  } catch (e: any) {
    console.error(e);
    setAddToTrackerError(e?.message ?? "Failed to add opportunity to job tracker.");
  } finally {
    setAddToTrackerLoadingId(null);
  }
};

useEffect(() => {
  if (!groupId || !currentUserId) return;

  (async () => {
    try {
         setLoading(true);
      setError(null);
      setChallengesLoading(true);
      setChallengeError(null);
            setOppsLoading(true);
      setOppsError(null);

      setEventsLoading(true);
      setEventsError(null);

      // Add to whatever Promise.all you're already using
      const [g, my, p, ch, oppData, evData] = await Promise.all([
        getPeerGroup(groupId),
        listMyPeerGroups(currentUserId),
        fetchGroupPosts(groupId),
        fetchGroupChallenges(groupId,currentUserId),
        fetchGroupOpportunities(groupId,currentUserId),
        fetchGroupEvents({ groupId, userId: currentUserId }),
      ]);

   
      setGroup(g);
      setMyMemberships(my.memberships);
      setPosts(p);

      setChallenges(ch.challenges);
      setMyChallengeParticipations(ch.myParticipations);
      setChallengeStats(ch.stats);

      setOpportunities(oppData.opportunities);
      setMyOpportunityInterests(oppData.myInterests);
      setOpportunityStats(oppData.stats);

      // NEW: events
      setEvents(evData.events);
      setMyEventRsvps(evData.myRsvps);
      setEventStats(evData.stats);

      // NEW: alert + new-marker logic
if (groupId) {
  const key = `peerGroup:${groupId}:lastSeenOpportunity`;
  const lastSeenStr = localStorage.getItem(key);
  const lastSeen = lastSeenStr ? Date.parse(lastSeenStr) : 0;

  const countNew = oppData.opportunities.filter((o) => {
    const created = Date.parse(o.createdAt);
    return created > lastSeen;
  }).length;

  setNewOppCount(countNew);
  setLastSeenOppTime(lastSeen || 0);

  // update last seen to now so next visit uses this as baseline
  localStorage.setItem(key, new Date().toISOString());
}
    } catch (e) {
      console.error(e);
        setError("Failed to load group discussion.");
      setChallengeError("Failed to load challenges.");
       setOppsError("Failed to load opportunities.");
      setEventsError("Failed to load group events.");
    } finally {
      setEventsLoading(false);
      setLoading(false);
      setChallengesLoading(false);
       setOppsLoading(false);
    }
  })();
}, [groupId, currentUserId]);
const handleDismissOppAlert = () => {
  setNewOppCount(0);
  if (groupId) {
    localStorage.setItem(
      `peerGroup:${groupId}:lastSeenOpportunity`,
      new Date().toISOString()
    );
  }
};
const isOppNew = (opp: PeerOpportunity) => {
  if (!lastSeenOppTime) return false;
  const created = Date.parse(opp.createdAt);
  return created > lastSeenOppTime;
};
const handleShareOpportunityClick = () => {
  // if user has jobs, let them pick; otherwise go straight to manual form
  if (jobs && jobs.length > 0) {
    setShowOppJobPicker(true);
  } else {
    setOppInitialDraft(null);
    setShowOppMiniForm(true);
  }
};

const handlePickJobForOpportunity = (job: import("../../Coverletter/hooks/useJobs").Job) => {
  setShowOppJobPicker(false);
  // Map job -> opportunity initial draft
  setOppInitialDraft({
    title: job.jobTitle,
    company: job.company,
    location: job.location || "",
    jobUrl: job.jobPostingUrl || "",
    tags: "",          // user can add
    source: "From my job tracker",
    notes: job.description ? job.description.slice(0, 240) : "",
    referralAvailable: true,
    maxReferrals: "",
  });
  setShowOppMiniForm(true);
};
const handleEnterOpportunityManual = () => {
  setShowOppJobPicker(false);
  setOppInitialDraft(null);
  setShowOppMiniForm(true);
};
const handleMiniOpportunitySubmit = async (draft: OpportunityDraft) => {
  if (!groupId) return;

  try {
    setOppsError(null);
    // Call existing createPeerOpportunity helper
    await createPeerOpportunity(groupId,currentUserId, {
      title: draft.title,
      company: draft.company,
      location: draft.location || "",
      jobUrl: draft.jobUrl || "",
      source: draft.source || "",
      referralAvailable: draft.referralAvailable,
      maxReferrals:
        draft.maxReferrals === "" ? 0 : Number(draft.maxReferrals),
      tags: draft.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      notes: draft.notes || "",
    });

    // Refresh opportunities
    const oppData = await fetchGroupOpportunities(groupId,currentUserId);
    setOpportunities(oppData.opportunities);
    setMyOpportunityInterests(oppData.myInterests);
    setOpportunityStats(oppData.stats);

    setShowOppMiniForm(false);
    setOppInitialDraft(null);
  } catch (e) {
    console.error(e);
    setOppsError("Failed to share opportunity.");
  }
};

const myRsvpByEventId = useMemo(() => {
  const map: Record<string, PeerGroupEventRsvp> = {};
  myEventRsvps.forEach((r) => {
    map[r.eventId] = r;
  });
  return map;
}, [myEventRsvps]);

const myInterestByOppId = useMemo(() => {
  const map: Record<string, PeerOpportunityInterest> = {};
  myOpportunityInterests.forEach((i) => {
    map[i.opportunityId] = i;
  });
  return map;
}, [myOpportunityInterests]);
const handleShareOpportunity = async () => {
  if (!groupId) return;
  if (!oppTitle.trim() || !oppCompany.trim()) return;
  try {
    setSharingOpp(true);
    setOppsError(null);

    await createPeerOpportunity(groupId,currentUserId ,{
      title: oppTitle.trim(),
      company: oppCompany.trim(),
      location: oppLocation.trim(),
      jobUrl: oppUrl.trim(),
      source: oppSource.trim(),
      referralAvailable: oppReferralAvailable,
      maxReferrals: oppMaxReferrals ? Number(oppMaxReferrals) : 0,
      tags: oppTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      notes: oppNotes.trim(),
    });

    const oppData = await fetchGroupOpportunities(groupId,currentUserId);
    setOpportunities(oppData.opportunities);
    setMyOpportunityInterests(oppData.myInterests);
    setOpportunityStats(oppData.stats);

    setOppTitle("");
    setOppCompany("");
    setOppLocation("");
    setOppUrl("");
    setOppSource("");
    setOppTags("");
    setOppNotes("");
    setOppReferralAvailable(true);
    setOppMaxReferrals("");
  } catch (e) {
    console.error(e);
    setOppsError("Failed to share opportunity.");
  } finally {
    setSharingOpp(false);
  }
};
const handleCreateEvent = async () => {
  if (!groupId || !currentUserId) return;
  if (!eventTitle.trim() || !eventDate || !eventStartTime || !eventEndTime) {
    return;
  }

  try {
    setCreatingEvent(true);
    setEventsError(null);

    // Build ISO datetime strings
    const startIso = new Date(`${eventDate}T${eventStartTime}:00`).toISOString();
    const endIso = new Date(`${eventDate}T${eventEndTime}:00`).toISOString();

    await createGroupEvent({
      groupId,
      userId: currentUserId,
      payload: {
        title: eventTitle.trim(),
        description: eventDescription.trim(),
        type: eventType,
        startTime: startIso,
        endTime: endIso,
        locationType: eventLocationType,
        locationText: eventLocationText.trim(),
        joinUrl: eventJoinUrl.trim(),
        maxAttendees: eventMaxAttendees
          ? Number(eventMaxAttendees)
          : 0,
      },
    });

    // Refresh events
    const evData = await fetchGroupEvents({
      groupId,
      userId: currentUserId,
    });
    setEvents(evData.events);
    setMyEventRsvps(evData.myRsvps);
    setEventStats(evData.stats);

    // Reset form
    setEventTitle("");
    setEventDescription("");
    setEventType("group_coaching");
    setEventDate("");
    setEventStartTime("");
    setEventEndTime("");
    setEventLocationType("online");
    setEventLocationText("");
    setEventJoinUrl("");
    setEventMaxAttendees("");
  } catch (e) {
    console.error(e);
    setEventsError("Failed to create event.");
  } finally {
    setCreatingEvent(false);
  }
};
const handleRsvp = async (
  ev: PeerGroupEvent,
  status: "going" | "interested" | "not_going"
) => {
  if (!currentUserId) return;
  if (!membership) {
    setEventsError("You must join this group before RSVPing.");
    return;
  }

  try {
    await rsvpToGroupEvent({
      eventId: ev._id,
      userId: currentUserId,
      status,
    });

    const evData = await fetchGroupEvents({
      groupId: ev.groupId,
      userId: currentUserId,
    });
    setEvents(evData.events);
    setMyEventRsvps(evData.myRsvps);
    setEventStats(evData.stats);
  } catch (e) {
    console.error(e);
    setEventsError("Failed to update RSVP.");
  }
};

const handleExpressInterest = async (opp: PeerOpportunity, note: string) => {
  if (!groupId) return;
  if (!membership) {
    setOppsError("You must join this group before expressing interest.");
    return;
  }
  try {
    await expressInterestInOpportunity(opp._id,currentUserId, { note, status: "interested" });
    const oppData = await fetchGroupOpportunities(groupId,currentUserId);
    setOpportunities(oppData.opportunities);
    setMyOpportunityInterests(oppData.myInterests);
    setOpportunityStats(oppData.stats);
  } catch (e) {
    console.error(e);
    setOppsError("Failed to express interest.");
  }
};

const handleWithdrawInterest = async (opp: PeerOpportunity) => {
  if (!groupId) return;
  try {
    await expressInterestInOpportunity(opp._id, currentUserId,{ status: "withdrawn" });
    const oppData = await fetchGroupOpportunities(groupId,currentUserId);
    setOpportunities(oppData.opportunities);
    setMyOpportunityInterests(oppData.myInterests);
    setOpportunityStats(oppData.stats);
  } catch (e) {
    console.error(e);
    setOppsError("Failed to withdraw interest.");
  }
};


const handleCreateChallenge = async () => {
  if (!groupId) return;
  if (!newChallengeTitle.trim()) return;

  const target = Number(newChallengeTarget || 0);
  if (!target || isNaN(target)) {
    setChallengeError("Target must be a valid number.");
    return;
  }
  if (!newChallengeStart || !newChallengeEnd) {
    setChallengeError("Start and end dates are required.");
    return;
  }

  try {
    setCreatingChallenge(true);
    setChallengeError(null);

    await createGroupChallenge(groupId, currentUserId ,{
      title: newChallengeTitle.trim(),
      description: newChallengeDescription.trim(),
      type: newChallengeType,
      targetValue: target,
      unitLabel: newChallengeUnit.trim() || "actions",
      startDate: newChallengeStart,
      endDate: newChallengeEnd,
    });

    // after creating, refresh challenges from backend to get stats etc.
    const ch = await fetchGroupChallenges(groupId,currentUserId);
    setChallenges(ch.challenges);
    setMyChallengeParticipations(ch.myParticipations);
    setChallengeStats(ch.stats);

    // reset form
    setNewChallengeTitle("");
    setNewChallengeDescription("");
    setNewChallengeTarget("10");
    setNewChallengeUnit(
      newChallengeType === "applications"
        ? "applications"
        : newChallengeType === "outreach"
        ? "messages"
        : newChallengeType === "practice"
        ? "sessions"
        : "actions"
    );
    setNewChallengeStart("");
    setNewChallengeEnd("");
  } catch (e) {
    console.error(e);
    setChallengeError("Failed to create challenge.");
  } finally {
    setCreatingChallenge(false);
  }
};


  const membership = useMemo(() => {
    if (!groupId) return null;
    return myMemberships.find((m) => m.groupId === groupId) || null;
  }, [myMemberships, groupId]);

  const interactionLabel = useMemo(() => {
    if (!membership) return "You haven't joined this group yet.";
    const mode = membership.interactionLevel || "public";
    if (mode === "anonymous") return "Your posts appear as Anonymous in this group.";
    if (mode === "alias")
      return `Your posts appear under your alias "${membership.alias || "Anonymous"}".`;
    return "Your posts appear with your real name in this group.";
  }, [membership]);

  const handlePost = async () => {
    if (!groupId || !content.trim()) return;
    if (!membership) {
      setError("You must join this group before posting.");
      return;
    }

    try {
      setPosting(true);
      setError(null);
      const newPost = await createGroupPost(groupId, currentUserId, {
        content,
        type: postType,
      });

      // newPost won't have persona from POST; refetch or optimistically insert
      // simplest: refetch posts
      const updatedPosts = await fetchGroupPosts(groupId);
      setPosts(updatedPosts);
      setContent("");
    } catch (e) {
      console.error(e);
      setError("Failed to publish your post.");
    } finally {
      setPosting(false);
    }
  };
const participationByChallengeId = useMemo(() => {
  const map: Record<string, GroupChallengeParticipation> = {};
  myChallengeParticipations.forEach((p) => {
    map[p.challengeId] = p;
  });
  return map;
}, [myChallengeParticipations]);
const handleJoinChallenge = async (challenge: GroupChallenge) => {
  if (!groupId) return;
  if (!membership) {
    setChallengeError("You must join this group before joining challenges.");
    return;
  }
  try {
    const participation = await joinGroupChallenge(challenge._id,currentUserId);
    setMyChallengeParticipations((prev) => {
      const existing = prev.find((p) => p._id === participation._id);
      if (existing) {
        return prev.map((p) => (p._id === participation._id ? participation : p));
      }
      return [...prev, participation];
    });

    // refresh stats
    const ch = await fetchGroupChallenges(groupId,currentUserId);
    setChallenges(ch.challenges);
    setChallengeStats(ch.stats);
  } catch (e) {
    console.error(e);
    setChallengeError("Failed to join challenge.");
  }
};
const handleHighlightPost = async (
  postId: string,
  highlightType: "success" | "learning" | null
) => {
  if (!groupId) return;

  try {
    await updatePostHighlight(groupId, postId, currentUserId, highlightType);

    // Update local posts array
    setPosts((prev) =>
      prev.map((p) =>
        p._id === postId ? { ...p, highlightType } : p
      )
    );
  } catch (e) {
    console.error(e);
    setError("Failed to update post highlight.");
  }
};

const handleUpdateChallengeProgress = async (
  challenge: GroupChallenge,
  delta: number,
  note?: string
) => {
  if (!groupId) return;
  if (!membership) {
    setChallengeError("You must join this group before updating progress.");
    return;
  }
  if (!delta || isNaN(delta)) return;

  try {
    const participation = await updateGroupChallengeProgress(challenge._id,currentUserId, {
      delta,
      note,
    });

    setMyChallengeParticipations((prev) =>
      prev.map((p) => (p._id === participation._id ? participation : p))
    );

    const ch = await fetchGroupChallenges(groupId,currentUserId);
    setChallenges(ch.challenges);
    setChallengeStats(ch.stats);
  } catch (e) {
    console.error(e);
    setChallengeError("Failed to update challenge progress.");
  }
};
const handleLeaveChallenge = async (challenge: GroupChallenge) => {
  if (!groupId) return;
  if (!membership) return;

  const ok = window.confirm(
    `Leave "${challenge.title}"? Your progress will no longer be tracked.`
  );
  if (!ok) return;

  try {
    await leaveGroupChallenge(challenge._id,currentUserId);

    // ✅ Refresh to drop participantCount and remove myParticipation
    const ch = await fetchGroupChallenges(groupId,currentUserId);
    setChallenges(ch.challenges);
    setMyChallengeParticipations(ch.myParticipations);
    setChallengeStats(ch.stats);
  } catch (e) {
    console.error(e);
    setChallengeError("Failed to leave challenge.");
  }
};

  const handleSubmitPrivacy = async (values: GroupPrivacyFormValues) => {
    if (!groupId || !membership) return;

    const updated = await updateMembershipPrivacy(groupId,currentUserId, {
      interactionLevel: values.interactionLevel,
      alias: values.alias,
      allowDirectMessages: values.allowDirectMessages,
      showProfileLink: values.showProfileLink,
      showRealNameInGroup: values.showRealNameInGroup,
    });

    setMyMemberships((prev) =>
      prev.map((m) => (m._id === updated._id ? { ...m, ...updated } : m))
    );

    // refresh posts so persona updates immediately
    const refreshedPosts = await fetchGroupPosts(groupId);
    setPosts(refreshedPosts);
  };

  if (!groupId) {
    return <div className="p-4">Invalid group.</div>;
  }

  if (loading) {
    return <div className="p-4">Loading group discussion...</div>;
  }

  if (error && !group) {
    return (
      <div className="p-4">
        <p className="text-red-600 text-sm mb-2">{error}</p>
        <Button onClick={() => navigate("/peer-groups")}>Back to groups</Button>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="p-4">
        <p className="text-sm text-gray-600">Group not found.</p>
        <Button onClick={() => navigate("/peer-groups")}>Back to groups</Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Privacy modal */}
      <GroupPrivacyModal
        open={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
        group={group}
        membership={membership}
        onSubmit={handleSubmitPrivacy}
      />
{(successPosts.length > 0 || learningPosts.length > 0) && (
  <Card className="p-3 space-y-2">
    <h2 className="text-sm font-medium">Success stories & learning</h2>

    {successPosts.length > 0 && (
      <div>
        <div className="text-[11px] font-semibold text-green-700 mb-1">
          Recent success stories
        </div>
        <ul className="space-y-1">
          {successPosts.map((p) => (
            <li key={p._id} className="text-[11px] text-gray-800">
              <span className="font-medium">{p.persona.displayName}:</span>{" "}
              {p.content.length > 120
                ? p.content.slice(0, 117) + "..."
                : p.content}
            </li>
          ))}
        </ul>
      </div>
    )}

    {learningPosts.length > 0 && (
      <div>
        <div className="text-[11px] font-semibold text-blue-700 mb-1 mt-2">
          Learning resources
        </div>
        <ul className="space-y-1">
          {learningPosts.map((p) => (
            <li key={p._id} className="text-[11px] text-gray-800">
              <span className="font-medium">{p.persona.displayName}:</span>{" "}
              {p.content.length > 120
                ? p.content.slice(0, 117) + "..."
                : p.content}
            </li>
          ))}
        </ul>
      </div>
    )}
  </Card>
)}

      {/* Header */}
      <div className="flex justify-between items-center gap-2">
        <div>
          <h1 className="text-2xl font-semibold">{group.name}</h1>
          <p className="text-xs text-gray-500">
            {group.industry && <span>{group.industry} · </span>}
            {group.role && <span>{group.role} · </span>}
          </p>
          {group.description && (
            <p className="text-sm text-gray-700 mt-1">{group.description}</p>
          )}
        </div>
        <Button onClick={() => navigate("/peer-groups")}>Back to groups</Button>
      </div>

      {/* Interaction level banner */}
      <Card className="p-3 flex items-center justify-between gap-4">
        <p className="text-xs text-gray-700">{interactionLabel}</p>
        {membership && (
          <Button
            type="button"
            onClick={() => setIsPrivacyModalOpen(true)}
            className="text-xs"
          >
            Privacy settings
          </Button>
        )}
      </Card>

      {/* Composer */}
      <Card className="p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Share an insight or strategy</span>
          <select
            className="border rounded px-2 py-1 text-xs"
            value={postType}
            onChange={(e) =>
              setPostType(e.target.value as "insight" | "question" | "strategy")
            }
          >
            <option value="insight">Insight</option>
            <option value="strategy">Strategy</option>
            <option value="question">Question</option>
          </select>
        </div>
        <textarea
          className="w-full border rounded px-3 py-2 text-sm"
          rows={3}
          placeholder={
            membership
              ? "Share how you're approaching applications, interviews, or networking..."
              : "Join this group to share insights."
          }
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={!membership || posting}
        />
        <div className="flex justify-end">
          <Button onClick={handlePost} disabled={!membership || posting || !content.trim()}>
            {posting ? "Posting..." : "Post"}
          </Button>
        </div>
        {!membership && (
          <p className="text-[11px] text-gray-500">
            You need to join this group before you can post.
          </p>
        )}
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </Card>

      {/* Posts list */}
      <div className="space-y-2">
        <h2 className="text-lg font-medium">Recent posts</h2>
        {posts.length === 0 && (
          <p className="text-xs text-gray-500">
            No posts yet. Be the first to share an insight or strategy!
          </p>
        )}
        {posts.map((post) => (
          <Card key={post._id} className="p-3 space-y-1">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-xs font-medium">
                  {post.persona.displayName}
                  {post.persona.mode === "anonymous" && (
                    <span className="text-[10px] text-gray-500 ml-1">
                      (Anonymous)
                    </span>
                  )}
                  {post.persona.mode === "alias" && (
                    <span className="text-[10px] text-gray-500 ml-1">
                      (Alias)
                    </span>
                  )}
                </div>
                {post.persona.headline && (
                  <div className="text-[10px] text-gray-500">
                    {post.persona.headline}
                  </div>
                )}
              </div>
              <div className="text-[10px] text-gray-500">
                {new Date(post.createdAt).toLocaleString()}
              </div>
            </div>
            <div className="text-xs inline-block rounded-full bg-gray-100 px-2 py-0.5 mt-1">
              {post.type}
            </div>
             {post.highlightType === "success" && (
                <span className="text-[10px] inline-block rounded-full bg-green-100 px-2 py-0.5 text-green-800">
                  Success story
                </span>
              )}
              {post.highlightType === "learning" && (
                <span className="text-[10px] inline-block rounded-full bg-blue-100 px-2 py-0.5 text-blue-800">
                  Learning resource
                </span>
              )}
              {(isGroupOwner || post.isMine) && (
                  <div className="ml-auto flex gap-1">
                    <button
                      type="button"
                      className="text-[10px] underline text-gray-500"
                      onClick={() => handleHighlightPost(post._id, "success")}
                    >
                      Mark success
                    </button>
                    <button
                      type="button"
                      className="text-[10px] underline text-gray-500"
                      onClick={() => handleHighlightPost(post._id, "learning")}
                    >
                      Mark learning
                    </button>
                    {post.highlightType && (
                      <button
                        type="button"
                        className="text-[10px] underline text-gray-400"
                        onClick={() => handleHighlightPost(post._id, null)}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}
            <p className="text-sm text-gray-800 mt-1 whitespace-pre-wrap">
              {post.content}
            </p>
          </Card>
        ))}
      </div>

      {/* Challenges & accountability */}
<div className="space-y-2 mt-6">
  <h2 className="text-lg font-medium">Group challenges & accountability</h2>

  {challengesLoading && (
    <p className="text-xs text-gray-500">Loading challenges...</p>
  )}

  {challengeError && (
    <p className="text-xs text-red-600">{challengeError}</p>
  )}

  {!challengesLoading && challenges.length === 0 && (
    <p className="text-xs text-gray-500">
      No challenges yet. Group owners can create weekly goals like “Apply to 10 jobs”
      or “Send 5 networking messages”.
    </p>
  )}
  {/* Only group owner can create challenges */}
  {isGroupOwner && (
    <div className="border rounded-md p-3 space-y-2 bg-gray-50">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">Create a new challenge</span>
      </div>

      <div className="space-y-2 text-xs">
        <input
          className="w-full border rounded px-2 py-1"
          placeholder='Title (e.g. "Apply to 10 jobs this week")'
          value={newChallengeTitle}
          onChange={(e) => setNewChallengeTitle(e.target.value)}
        />

        <textarea
          className="w-full border rounded px-2 py-1"
          rows={2}
          placeholder="Optional description (how to participate, tips, etc.)"
          value={newChallengeDescription}
          onChange={(e) => setNewChallengeDescription(e.target.value)}
        />

        <div className="flex flex-wrap gap-2">
          <select
            className="border rounded px-2 py-1"
            value={newChallengeType}
            onChange={(e) =>
              setNewChallengeType(
                e.target.value as "applications" | "outreach" | "practice" | "other"
              )
            }
          >
            <option value="applications">Applications</option>
            <option value="outreach">Outreach</option>
            <option value="practice">Interview practice</option>
            <option value="other">Other</option>
          </select>

          <input
            type="number"
            min={1}
            className="border rounded px-2 py-1 w-24"
            placeholder="Goal"
            value={newChallengeTarget}
            onChange={(e) => setNewChallengeTarget(e.target.value)}
          />

          <input
            className="border rounded px-2 py-1 w-32"
            placeholder="Unit"
            value={newChallengeUnit}
            onChange={(e) => setNewChallengeUnit(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="flex flex-col">
            <label className="text-[11px] text-gray-500">Start date</label>
            <input
              type="date"
              className="border rounded px-2 py-1 text-xs"
              value={newChallengeStart}
              onChange={(e) => setNewChallengeStart(e.target.value)}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-[11px] text-gray-500">End date</label>
            <input
              type="date"
              className="border rounded px-2 py-1 text-xs"
              value={newChallengeEnd}
              onChange={(e) => setNewChallengeEnd(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            disabled={creatingChallenge}
            onClick={handleCreateChallenge}
          >
            {creatingChallenge ? "Creating..." : "Create challenge"}
          </Button>
        </div>
      </div>
    </div>
  )}

  <div className="space-y-3">
    {challenges.map((ch) => (
     <ChallengeCard
  key={ch._id}
  challenge={ch}
  stats={challengeStats[ch._id] || { participantCount: 0, totalProgress: 0 }}
  membership={membership}
  myParticipation={participationByChallengeId[ch._id] || null}
  onJoin={handleJoinChallenge}
  onUpdateProgress={handleUpdateChallengeProgress}
  onLeave={handleLeaveChallenge}
/>

      
    ))}
  </div>

{/* Shared opportunities & referrals */}
<div className="space-y-2 mt-6">
  {addToTrackerError && (
  <p className="text-xs text-red-600">{addToTrackerError}</p>
)}

  <h2 className="text-lg font-medium">Shared opportunities & referrals</h2>

  {oppsError && (
    <p className="text-xs text-red-600">{oppsError}</p>
  )}

  {/* Alerts */}
  {newOppCount > 0 && (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
      <div className="flex items-center gap-2">
        <span className="text-base">🔔</span>
        <span>
          {newOppCount} new opportunit{newOppCount === 1 ? "y" : "ies"} since your last visit to this group.
        </span>
      </div>
      <button
        type="button"
        onClick={handleDismissOppAlert}
        className="underline hover:no-underline"
      >
        Mark as seen
      </button>
    </div>
  )}

  {oppsLoading && (
    <p className="text-xs text-gray-500">Loading opportunities...</p>
  )}

  {/* CTA card to share */}
  {membership ? (
    <div className="border rounded-md p-3 bg-gray-50 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div className="text-xs text-gray-700">
        <div className="font-medium text-sm">
          Share a role with your peers
        </div>
        <p className="mt-1">
          Post internships, new grad roles, and referral-ready openings so the group can benefit.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleShareOpportunityClick}
          className="px-4 py-2 rounded-md bg-gray-900 text-white text-xs font-medium hover:bg-black"
        >
          Share opportunity
        </button>
      </div>
    </div>
  ) : (
    <p className="text-[11px] text-gray-500">
      Join this group to share opportunities and referrals.
    </p>
  )}

  {/* List of opportunities */}
  <div className="space-y-2">
    {opportunities.length === 0 && !oppsLoading && (
      <p className="text-xs text-gray-500">
        No opportunities shared yet. Once members start posting roles and referrals, they’ll appear here.
      </p>
    )}
    {opportunities.map((opp) => (
     <OpportunityCard
    key={opp._id}
    opportunity={opp}
    stats={
      opportunityStats[opp._id] || {
        interestCount: 0,
        referredCount: 0,
      }
    }
    membership={membership}
    myInterest={myInterestByOppId[opp._id] || null}
    isOwner={
      !!currentUserId &&
      (opp.createdBy === currentUserId ||
        (group && group.createdBy === currentUserId))
    }
    onExpressInterest={handleExpressInterest}
    onWithdrawInterest={handleWithdrawInterest}
    onAddToTracker={handleAddOpportunityToTracker}
    isNew={isOppNew(opp)}
  />
    ))}
  </div>
</div>

{/* Group coaching & webinars */}
<div className="space-y-2 mt-6">
  <h2 className="text-lg font-medium">Group coaching & webinars</h2>

  {eventsError && (
    <p className="text-xs text-red-600">{eventsError}</p>
  )}

  {eventsLoading && (
    <p className="text-xs text-gray-500">Loading sessions...</p>
  )}

  {/* Create event form (group owner only) */}
  {isGroupOwner ? (
    <div className="border rounded-md p-3 space-y-2 bg-gray-50">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">Schedule a session</span>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <input
          className="border rounded px-2 py-1 flex-1"
          placeholder="Session title (e.g. Weekly Job Search Check-in)"
          value={eventTitle}
          onChange={(e) => setEventTitle(e.target.value)}
        />
        <select
          className="border rounded px-2 py-1"
          value={eventType}
          onChange={(e) =>
            setEventType(
              e.target.value as
                | "group_coaching"
                | "webinar"
                | "office_hours"
                | "other"
            )
          }
        >
          <option value="group_coaching">Group coaching</option>
          <option value="webinar">Webinar</option>
          <option value="office_hours">Office hours</option>
          <option value="other">Other</option>
        </select>
      </div>

      <textarea
        className="w-full border rounded px-2 py-1 text-xs"
        rows={2}
        placeholder="Optional description (what you'll cover, who it's for)"
        value={eventDescription}
        onChange={(e) => setEventDescription(e.target.value)}
      />

      <div className="flex flex-wrap gap-2 text-xs">
        <div className="flex flex-col">
          <label className="text-[11px] text-gray-600">Date</label>
          <input
            type="date"
            className="border rounded px-2 py-1"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
          />
        </div>
        <div className="flex flex-col">
          <label className="text-[11px] text-gray-600">Start time</label>
          <input
            type="time"
            className="border rounded px-2 py-1"
            value={eventStartTime}
            onChange={(e) => setEventStartTime(e.target.value)}
          />
        </div>
        <div className="flex flex-col">
          <label className="text-[11px] text-gray-600">End time</label>
          <input
            type="time"
            className="border rounded px-2 py-1"
            value={eventEndTime}
            onChange={(e) => setEventEndTime(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs items-center">
        <select
          className="border rounded px-2 py-1"
          value={eventLocationType}
          onChange={(e) =>
            setEventLocationType(
              e.target.value as "online" | "in_person"
            )
          }
        >
          <option value="online">Online</option>
          <option value="in_person">In-person</option>
        </select>

        <input
          className="border rounded px-2 py-1 flex-1"
          placeholder={
            eventLocationType === "online"
              ? "Platform (Zoom, Discord, etc.)"
              : "Location (Room, campus, etc.)"
          }
          value={eventLocationText}
          onChange={(e) => setEventLocationText(e.target.value)}
        />

        {eventLocationType === "online" && (
          <input
            className="border rounded px-2 py-1 flex-[1.2]"
            placeholder="Join URL (Zoom / Meet / Discord link)"
            value={eventJoinUrl}
            onChange={(e) => setEventJoinUrl(e.target.value)}
          />
        )}

        <input
          className="border rounded px-2 py-1 w-28"
          placeholder="Max attendees"
          value={eventMaxAttendees}
          onChange={(e) => setEventMaxAttendees(e.target.value)}
        />
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          disabled={creatingEvent}
          onClick={handleCreateEvent}
        >
          {creatingEvent ? "Scheduling..." : "Schedule session"}
        </Button>
      </div>
    </div>
  ) : (
    <p className="text-[11px] text-gray-500">
      Group owners can schedule coaching sessions and webinars for this group.
    </p>
  )}

  {/* Event list */}
  <div className="space-y-2">
    {events.length === 0 && !eventsLoading && (
      <p className="text-xs text-gray-500">
        No sessions scheduled yet. Once the group owner adds events, they will
        appear here.
      </p>
    )}

    {events.map((ev) => (
      <GroupEventCard
        key={ev._id}
        event={ev}
        stats={
          eventStats[ev._id] || { goingCount: 0, interestedCount: 0 }
        }
        membership={membership}
        myRsvp={myRsvpByEventId[ev._id] || null}
        isOwner={
          !!currentUserId &&
          (ev.createdBy === currentUserId ||
            (group && group.createdBy === currentUserId))
        }
        onRsvp={handleRsvp}
      />
    ))}
  </div>
</div>


{/* Networking impact analytics */}
<div className="space-y-2 mt-6">
  <h2 className="text-lg font-medium">Networking impact</h2>

  {networkingImpactLoading && (
    <p className="text-xs text-gray-500">Calculating impact…</p>
  )}

  {networkingImpactError && (
    <p className="text-xs text-red-600">{networkingImpactError}</p>
  )}

  {networkingImpact && (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {/* Your impact */}
      <div className="border rounded-md p-3 bg-white">
        <h3 className="text-sm font-medium mb-1">Your outcomes from this group</h3>
        <p className="text-[11px] text-gray-500 mb-2">
          Jobs you added to your tracker that came from shared opportunities or referrals in this group.
        </p>
        <div className="flex gap-4 text-sm">
          <div>
            <div className="text-xs text-gray-500">Jobs sourced</div>
            <div className="text-lg font-semibold">
              {networkingImpact.me.jobsFromGroup}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Reached interview</div>
            <div className="text-lg font-semibold">
              {networkingImpact.me.interviewsFromGroup}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Offers</div>
            <div className="text-lg font-semibold">
              {networkingImpact.me.offersFromGroup}
            </div>
          </div>
        </div>
      </div>

      {/* Group impact */}
      <div className="border rounded-md p-3 bg-white">
        <h3 className="text-sm font-medium mb-1">Group-wide outcomes</h3>
        <p className="text-[11px] text-gray-500 mb-2">
          Combined results from jobs sourced through this group (all members).
        </p>
        <div className="flex gap-4 text-sm">
          <div>
            <div className="text-xs text-gray-500">Jobs sourced</div>
            <div className="text-lg font-semibold">
              {networkingImpact.group.jobsFromGroup}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Reached interview</div>
            <div className="text-lg font-semibold">
              {networkingImpact.group.interviewsFromGroup}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Offers</div>
            <div className="text-lg font-semibold">
              {networkingImpact.group.offersFromGroup}
            </div>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-gray-500">
          {networkingImpact.group.membersWithPeerJobs} member
          {networkingImpact.group.membersWithPeerJobs === 1 ? "" : "s"} have at
          least one job sourced from this group.
        </p>
      </div>
    </div>
  )}
</div>

<JobPickerSheet
  open={showOppJobPicker}
  onClose={() => setShowOppJobPicker(false)}
  jobs={jobs}
  loading={jobsLoading}
  error={jobsError}
  onPickJob={handlePickJobForOpportunity}
  onEnterManual={handleEnterOpportunityManual}
  title="Pick a job to share with your group"
  subtitle="Choose an existing job from your tracker or enter the opportunity details manually."
/>

<MiniOpportunityForm
  open={showOppMiniForm}
  onCancel={() => {
    setShowOppMiniForm(false);
    setOppInitialDraft(null);
  }}
  onSubmit={handleMiniOpportunitySubmit}
  initial={oppInitialDraft || undefined}
  titleLabel="Share an opportunity with your peer group"
/>

</div>

    </div>
  );
}

