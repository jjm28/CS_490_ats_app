import React from "react";
import Card from "../../StyledComponents/Card";
import Button from "../../StyledComponents/Button";
import type {
  PeerGroupEvent,
  PeerGroupEventStats,
  PeerGroupEventRsvp,
  PeerGroupMembership,
} from "../../../api/peerGroups";

type GroupEventCardProps = {
  event: PeerGroupEvent;
  stats: PeerGroupEventStats | { goingCount: number; interestedCount: number };
  membership: PeerGroupMembership | null;
  myRsvp: PeerGroupEventRsvp | null;
  isOwner: boolean;
  onRsvp: (event: PeerGroupEvent, status: "going" | "interested" | "not_going") => void;
};

function formatEventTimeRange(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);

  const sameDay =
    startDate.toDateString() === endDate.toDateString();

  const datePart = startDate.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const startTime = startDate.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  const endTime = endDate.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  if (sameDay) {
    return `${datePart} · ${startTime} – ${endTime}`;
  }
  const endDatePart = endDate.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return `${datePart} ${startTime} – ${endDatePart} ${endTime}`;
}

export default function GroupEventCard({
  event,
  stats,
  membership,
  myRsvp,
  isOwner,
  onRsvp,
}: GroupEventCardProps) {
  const isScheduled = event.status === "scheduled";
  const when = formatEventTimeRange(event.startTime, event.endTime);

  const myStatus = myRsvp?.status ?? null;

  const isOnline = event.locationType === "online";

  return (
    <Card className="p-3 space-y-2">
      {/* Header */}
      <div className="flex justify-between items-start gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm">{event.title}</h3>
            <span className="text-[10px] uppercase bg-gray-100 border rounded px-1.5 py-0.5 text-gray-600">
              {event.type === "group_coaching"
                ? "Coaching"
                : event.type === "webinar"
                ? "Webinar"
                : event.type === "office_hours"
                ? "Office hours"
                : "Session"}
            </span>
            {!isScheduled && (
              <span className="text-[10px] uppercase bg-gray-100 border rounded px-1.5 py-0.5 text-gray-500">
                {event.status}
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-600">{when}</p>
          <p className="text-[11px] text-gray-600">
            {isOnline ? "Online" : "In-person"}
            {event.locationText && ` · ${event.locationText}`}
          </p>
          {event.description && (
            <p className="text-xs text-gray-700 mt-1">{event.description}</p>
          )}
        </div>

        <div className="text-[11px] text-gray-500 text-right">
          <div>{stats.goingCount} going</div>
          <div>{stats.interestedCount} interested</div>
          {event.maxAttendees > 0 && (
            <div>Max {event.maxAttendees} attendees</div>
          )}
        </div>
      </div>

      {/* Join link */}
      {isOnline && event.joinUrl && (
        <div className="mt-1 text-[11px]">
          <a
            href={event.joinUrl}
            target="_blank"
            rel="noreferrer"
            className="underline text-blue-600"
          >
            Join session link
          </a>
        </div>
      )}

      {/* RSVP actions */}
      {membership ? (
        <div className="mt-2 flex flex-wrap gap-2 items-center text-[11px]">
          {isScheduled ? (
            <>
              <span className="text-gray-600">
                Your RSVP:{" "}
                <span className="font-medium">
                  {myStatus === "going"
                    ? "Going"
                    : myStatus === "interested"
                    ? "Interested"
                    : myStatus === "not_going"
                    ? "Not going"
                    : "None"}
                </span>
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={myStatus === "going" ? "primary" : "secondary"}
                  onClick={() => onRsvp(event, "going")}
                >
                  Going
                </Button>
                <Button
                  type="button"
                  variant={
                    myStatus === "interested" ? "primary" : "secondary"
                  }
                  onClick={() => onRsvp(event, "interested")}
                >
                  Interested
                </Button>
                <Button
                  type="button"
                  variant={
                    myStatus === "not_going" ? "primary" : "secondary"
                  }
                  onClick={() => onRsvp(event, "not_going")}
                >
                  Not going
                </Button>
              </div>
            </>
          ) : (
            <span className="text-gray-500">
              This session is {event.status}.
            </span>
          )}
        </div>
      ) : (
        <p className="text-[11px] text-gray-500 mt-1">
          Join this group to RSVP to sessions.
        </p>
      )}

      {/* (Optional) In future: attendees list here for isOwner */}
      {isOwner && (
        <p className="text-[10px] text-gray-400 mt-1">
          (Owner view: we can later add an attendee list here.)
        </p>
      )}
    </Card>
  );
}
