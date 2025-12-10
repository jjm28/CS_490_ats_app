// src/utils/goalInsightsEngine.ts
import type { Goal } from "../api/smartGoals";

interface CareerSuccessMetrics {
    goalsLeadingToInterviews: number;
    goalsLeadingToOffers: number;
    offerConversionRate: number; // % of linked goals that reached an offer
}

export interface GoalInsights {
    completionRate: number;
    avgMilestones: number;
    avgOnTimeRate: number;
    avgLateRate: number;
    avgSpacingDays: number | null;
    recommendations: string[];
    careerSuccess: CareerSuccessMetrics;
}

export function analyzeGoals(goals: Goal[], jobs: any[]): GoalInsights {
    // Handle empty state
    if (!goals || goals.length === 0) {
        return {
            completionRate: 0,
            avgMilestones: 0,
            avgOnTimeRate: 0,
            avgLateRate: 0,
            avgSpacingDays: null,
            recommendations: ["Start by creating your first goal!"],
            careerSuccess: {
                goalsLeadingToInterviews: 0,
                goalsLeadingToOffers: 0,
                offerConversionRate: 0,
            },
        };
    }

    let totalGoals = goals.length;
    let completedGoals = 0;

    let milestoneCounts: number[] = [];
    let onTimeCompletions = 0;
    let lateCompletions = 0;
    let spacingDurations: number[] = [];

    // ===== SUCCESS SCORING METRICS =====
    const jobsById: Record<string, any> = {};
    jobs?.forEach((job) => {
        if (job?._id) jobsById[job._id] = job;
    });

    let linkedGoalsCount = 0; // OPTION A: only goals that are actually linked
    let goalsLeadingToInterviews = 0;
    let goalsLeadingToOffers = 0;

    goals.forEach((g) => {
        const shorts = g.shortTermGoals;
        if (!shorts || shorts.length === 0) return;

        // ----- goal completion -----
        milestoneCounts.push(shorts.length);
        if (shorts.every((s) => s.completed)) completedGoals++;

        // ----- timing + spacing -----
        const sorted = [...shorts].sort(
            (a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
        );

        sorted.forEach((m, index) => {
            if (m.completed) {
                const due = new Date(m.deadline).getTime();
                const done = m.completedAt
                    ? new Date(m.completedAt).getTime()
                    : Date.now();

                if (done <= due) onTimeCompletions++;
                else lateCompletions++;
            }

            if (index > 0) {
                const prevDue = new Date(sorted[index - 1].deadline).getTime();
                const currentDue = new Date(m.deadline).getTime();
                spacingDurations.push(currentDue - prevDue);
            }
        });

        // ----- SUCCESS: job outcome for this goal -----
        if (g.linkedJobId) {
            const job = jobsById[g.linkedJobId];
            if (job) {
                linkedGoalsCount++;

                switch (job.stage) {
                    case "offer":
                        goalsLeadingToOffers++;
                        goalsLeadingToInterviews++; // offer implies interviews
                        break;
                    case "final-round":
                    case "onsite":
                    case "interview":
                    case "technical":
                        goalsLeadingToInterviews++;
                        break;
                    case "phone-screen":
                    case "recruiter":
                    case "applied":
                    default:
                        // counts as linked but not yet an “interview / offer” success
                        break;
                }
            }
        }
    });

    const completionRate = Math.round((completedGoals / totalGoals) * 100);

    const avgMilestones =
        milestoneCounts.length > 0
            ? milestoneCounts.reduce((a, b) => a + b, 0) / milestoneCounts.length
            : 0;

    const onTimeRate = Math.round(
        (onTimeCompletions / (onTimeCompletions + lateCompletions || 1)) * 100
    );
    const lateRate = 100 - onTimeRate;

    const avgSpacingDays =
        spacingDurations.length > 0
            ? Math.round(
                spacingDurations.reduce((a, b) => a + b, 0) /
                spacingDurations.length /
                (1000 * 60 * 60 * 24)
            )
            : null;

    // ===== SMART RECOMMENDATION ENGINE =====
    let recs: string[] = [];

    // Completion rate
    if (completionRate < 40) {
        recs.push(
            "Your completion rate is low. Try reducing the number of active goals and focusing on 1–2 high-impact ones at a time."
        );
    } else if (completionRate >= 70) {
        recs.push(
            "Strong completion rate! You're following through on your goals. Keep using the same structure!"
        );
    }

    // Milestone count
    if (avgMilestones >= 5) {
        recs.push(
            `Your goals average ${Math.round(
                avgMilestones
            )} milestones, which might be too complex. Try limiting future goals to 3–4 milestones for better momentum.`
        );
    } else if (avgMilestones > 0 && avgMilestones <= 2) {
        recs.push(
            "Your goals tend to have very few milestones. Consider breaking goals into 3–4 steps for clearer progress markers."
        );
    }

    // Timing
    if (lateRate >= 50) {
        recs.push(
            "Most of your milestones are completed late. Try extending deadlines or scheduling smaller steps."
        );
    } else if (onTimeRate >= 80) {
        recs.push(
            "You're completing milestones on time consistently — great discipline!"
        );
    }

    // Spacing
    if (avgSpacingDays !== null) {
        if (avgSpacingDays < 5) {
            recs.push(
                "Your milestones are spaced very close together. Try giving yourself more room (7–14 days) to avoid burnout."
            );
        } else if (avgSpacingDays > 21) {
            recs.push(
                "Milestones are spaced far apart. Smaller, more frequent milestones could help you stay engaged."
            );
        } else {
            recs.push(
                `Your milestones tend to be spaced about ${avgSpacingDays} days apart — this is a healthy pace.`
            );
        }
    }

    if (recs.length === 0) {
        recs.push(
            "Keep tracking your goals and adjusting milestones as needed. Small, consistent progress leads to big results."
        );
    }

    // OPTION A: only goals that are actually linked to jobs are in the denominator
    const offerConversionRate =
        linkedGoalsCount > 0
            ? Math.round((goalsLeadingToOffers / linkedGoalsCount) * 100)
            : 0;

    return {
        completionRate,
        avgMilestones,
        avgOnTimeRate: onTimeRate,
        avgLateRate: lateRate,
        avgSpacingDays,
        recommendations: recs,
        careerSuccess: {
            goalsLeadingToInterviews,
            goalsLeadingToOffers,
            offerConversionRate:
                goalsLeadingToOffers === 0
                    ? 0
                    : Math.round((goalsLeadingToOffers / goals.length) * 100),
        }
    };
}