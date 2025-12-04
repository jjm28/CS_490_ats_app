export function calculateROIScore(event) {
  let score = 0;

  // 1. Attendance Weight
  if (event.attendanceStatus === "attended") score += 20;
  if (event.attendanceStatus === "missed") score -= 10;

  // 2. Connections Weight
  const connectionCount = event.connections?.length || 0;
  score += Math.min(connectionCount * 10, 30); // max +30

  // 3. Follow-Ups Weight
  const completedFollowups =
    event.followUps?.filter((fu) => fu.completed).length || 0;
  score += Math.min(completedFollowups * 10, 30); // max +30

  // 4. Pre-Event Prep Weight
  if (event.prep && event.prep.summary) score += 10;

  // 5. Virtual vs In-Person Weight
  if (event.type === "in-person") score += 10;
  if (event.type === "virtual") score += 5;

  // Score boundaries
  if (score < 0) score = 0;
  if (score > 100) score = 100;

  return score;
}
