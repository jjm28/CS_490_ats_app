// server/services/networkRelationshipAnalytics.service.js

import Contact from "../models/contacts.js";

export async function getNetworkRelationshipAnalytics(userId) {
    const contacts = await Contact.find({ userid: userId });

    // Empty state
    if (!contacts.length) {
        return {
            summary: {
                totalContacts: 0,
                avgRelationshipStrength: 0,
                avgReciprocity: 0,
            },
            healthBreakdown: {
                excellent: 0,
                good: 0,
                needs_attention: 0,
                at_risk: 0,
            },
            engagement: {
                byFrequency: {
                    weekly: 0,
                    biweekly: 0,
                    monthly: 0,
                    quarterly: 0,
                    yearly: 0,
                },
                avgDaysSinceLastContact: 0,
            },
            highValueConnections: [],
            insights: ["Add contacts and interactions to start generating insights."],
            bestInteractionTypes: [],
            leaderboard: [],
        };
    }

    /* -------------------------
       Helpers
    ------------------------- */
    const normalize = (v) =>
        (v || "").toLowerCase().replace(/_/g, " ").trim();

    const getContactName = (c) =>
        c.name || c.fullname || `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Unknown";

    /* -------------------------
       SUMMARY
    ------------------------- */
    const summary = {
        totalContacts: contacts.length,
        avgRelationshipStrength:
            contacts.reduce((s, c) => s + (c.relationshipStrength || 0), 0) /
            contacts.length,
        avgReciprocity:
            contacts.reduce((s, c) => s + (c.reciprocityScore || 0), 0) /
            contacts.length,
    };

    /* -------------------------
       HEALTH BREAKDOWN
    ------------------------- */
    const healthBreakdown = {
        excellent: contacts.filter((c) => normalize(c.relationshipHealth) === "excellent").length,
        good: contacts.filter((c) => normalize(c.relationshipHealth) === "good").length,
        needs_attention: contacts.filter((c) => normalize(c.relationshipHealth) === "needs attention").length,
        at_risk: contacts.filter((c) => normalize(c.relationshipHealth) === "at risk").length,
    };

    /* -------------------------
       ENGAGEMENT PATTERNS
    ------------------------- */
    const engagement = {
        byFrequency: {
            weekly: contacts.filter((c) => c.engagementFrequency === "weekly").length,
            biweekly: contacts.filter((c) => c.engagementFrequency === "biweekly").length,
            monthly: contacts.filter((c) => c.engagementFrequency === "monthly").length,
            quarterly: contacts.filter((c) => c.engagementFrequency === "quarterly").length,
            yearly: contacts.filter((c) => c.engagementFrequency === "yearly").length,
        },

        avgDaysSinceLastContact:
            contacts.reduce((sum, c) => {
                if (!c.lastInteraction) return sum;
                return (
                    sum +
                    (Date.now() - new Date(c.lastInteraction)) / (1000 * 60 * 60 * 24)
                );
            }, 0) / contacts.length,
    };

    /* -------------------------
       HIGH VALUE CONNECTIONS
    ------------------------- */
    const highValueConnections = contacts
        .filter(
            (c) =>
                (c.relationshipStrength || 0) >= 75 ||
                (c.opportunitiesGenerated || 0) > 0
        )
        .map((c) => ({
            id: c._id,
            name: getContactName(c),
            company: c.company || "N/A",
            relationshipStrength: c.relationshipStrength || 0,
            reciprocityScore: c.reciprocityScore || 0,
            relationshipHealth: c.relationshipHealth,
            opportunitiesGenerated: c.opportunitiesGenerated || 0,
            daysSinceLastContact: c.lastInteraction
                ? Math.floor(
                    (Date.now() - new Date(c.lastInteraction)) /
                    (1000 * 60 * 60 * 24)
                )
                : null,
        }));

    /* -------------------------
       BEST INTERACTION TYPES
    ------------------------- */
    const interactionSuccessMap = {};

    contacts.forEach((c) => {
        if ((c.opportunitiesGenerated || 0) > 0) {
            (c.interactions || []).forEach((i) => {
                if (!interactionSuccessMap[i.type]) {
                    interactionSuccessMap[i.type] = 0;
                }
                interactionSuccessMap[i.type]++;
            });
        }
    });

    const bestInteractionTypes = Object.entries(interactionSuccessMap)
        .sort((a, b) => b[1] - a[1])
        .map(([type, score]) => ({ type, score }));

    /* -------------------------
       INSIGHTS
    ------------------------- */
    const insights = [];

    if (bestInteractionTypes.length > 0) {
        insights.push(
            `Your most effective interaction type is **${bestInteractionTypes[0].type}**.`
        );
    } else {
        insights.push("Not enough data yet to determine effective interaction types.");
    }

    if (summary.avgReciprocity > 60) {
        insights.push("You maintain strong mutual value exchange with your network.");
    }

    if (engagement.byFrequency.weekly > 0) {
        insights.push("Weekly engagement appears to drive stronger connections.");
    }

    if (highValueConnections.length > 0) {
        insights.push("Several contacts have generated real opportunities — keep nurturing them.");
    }

    /* -------------------------
       LEADERBOARD
    ------------------------- */
    const leaderboard = contacts
        .map((c) => ({
            id: c._id,
            name: c.name || c.fullname || "",
            company: c.company,
            strength: c.relationshipStrength || 0,
            opportunities: c.opportunitiesGenerated || 0,
            reciprocity: c.reciprocityScore || 0,
        }))
        .sort((a, b) => {
            if (b.opportunities !== a.opportunities)
                return b.opportunities - a.opportunities;
            return b.strength - a.strength;
        })
        .slice(0, 5);
    return {
        summary,
        healthBreakdown,
        engagement,
        highValueConnections,
        insights,
        bestInteractionTypes,
        leaderboard,
    };
}