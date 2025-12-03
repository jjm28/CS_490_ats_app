import NetworkingEvent from '../models/networkingEvent.js';
import Jobs from '../models/jobs.js';

/* ===========================================================
   CREATE NETWORKING EVENT
=========================================================== */
export async function createEvent(userId, eventData) {
    const event = new NetworkingEvent({
        userId,
        ...eventData
    });
    
    await event.save();
    return event;
}

/* ===========================================================
   GET ALL EVENTS FOR USER
=========================================================== */
export async function getUserEvents(userId, filters = {}) {
    const query = { userId };
    
    if (filters.eventType) {
        query.eventType = filters.eventType;
    }
    
    if (filters.startDate || filters.endDate) {
        query.eventDate = {};
        if (filters.startDate) query.eventDate.$gte = new Date(filters.startDate);
        if (filters.endDate) query.eventDate.$lte = new Date(filters.endDate);
    }
    
    const events = await NetworkingEvent.find(query).sort({ eventDate: -1 });
    return events;
}

/* ===========================================================
   GET SINGLE EVENT
=========================================================== */
export async function getEvent(eventId, userId) {
    const event = await NetworkingEvent.findOne({ _id: eventId, userId });
    return event;
}

/* ===========================================================
   UPDATE EVENT
=========================================================== */
export async function updateEvent(eventId, userId, updateData) {
    const event = await NetworkingEvent.findOneAndUpdate(
        { _id: eventId, userId },
        { $set: updateData },
        { new: true, runValidators: true }
    );
    
    return event;
}

/* ===========================================================
   DELETE EVENT
=========================================================== */
export async function deleteEvent(eventId, userId) {
    const result = await NetworkingEvent.deleteOne({ _id: eventId, userId });
    return result;
}

/* ===========================================================
   CALCULATE EVENT ROI
=========================================================== */
export async function calculateEventROI(eventId, userId) {
    const event = await NetworkingEvent.findOne({ _id: eventId, userId });
    if (!event) throw new Error('Event not found');
    
    // Get jobs from this event
    const jobsFromEvent = await Jobs.find({
        userId,
        'networkSource.eventId': eventId
    });
    
    // Calculate value generated
    let valueGenerated = 0;
    let offersCount = 0;
    let interviewsCount = 0;
    
    for (const job of jobsFromEvent) {
        if (job.status === 'offer' && job.finalSalary) {
            valueGenerated += job.finalSalary;
            offersCount++;
        } else if (job.status === 'interview' || job.status === 'phone_screen') {
            interviewsCount++;
        }
    }
    
    // Update event metrics
    event.jobApplicationsFromEvent = jobsFromEvent.map(j => j._id.toString());
    event.jobOpportunitiesGenerated = jobsFromEvent.length;
    event.interviewsFromEvent = interviewsCount;
    event.offersFromEvent = offersCount;
    
    // Calculate ROI
    const totalCost = event.totalCost || 0;
    if (totalCost > 0) {
        event.roi = ((valueGenerated - totalCost) / totalCost) * 100;
    } else {
        event.roi = valueGenerated > 0 ? Infinity : 0;
    }
    
    event.roiCalculatedAt = new Date();
    await event.save();
    
    return event;
}

/* ===========================================================
   ADD ATTENDEE TO EVENT
=========================================================== */
export async function addAttendeeToEvent(eventId, userId, attendeeData) {
    const event = await NetworkingEvent.findOne({ _id: eventId, userId });
    if (!event) throw new Error('Event not found');
    
    event.attendees.push(attendeeData);
    await event.save();
    
    return event;
}

/* ===========================================================
   UPDATE ATTENDEE IN EVENT
=========================================================== */
export async function updateAttendee(eventId, userId, contactId, updateData) {
    const event = await NetworkingEvent.findOne({ _id: eventId, userId });
    if (!event) throw new Error('Event not found');
    
    const attendee = event.attendees.find(a => a.contactId === contactId);
    if (!attendee) throw new Error('Attendee not found');
    
    Object.assign(attendee, updateData);
    await event.save();
    
    return event;
}