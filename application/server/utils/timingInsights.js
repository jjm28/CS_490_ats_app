const SIGNIFICANCE_GAP = 10;

export function buildTimingInsights(dayStats) {

    if (!dayStats || dayStats.length === 0) {
        return {
            bestDays: ["No data"],
            worstDays: ["No data"],
            recommendations: []
        };
    }

    // Compute offer rate for every day, even if applied = 0
    const rates = dayStats.map(d => ({
        ...d,
        rate: d.applied > 0 ? Math.round((d.offers / d.applied) * 100) : 0
    }));

    // If ALL days have applied = 0 → no data at all
    const totalApplied = rates.reduce((sum, d) => sum + d.applied, 0);
    if (totalApplied === 0) {
        return {
            bestDays: ["No data"],
            worstDays: ["No data"],
            recommendations: []
        };
    }

    // Sort by conversion rate (0% days included)
    const sorted = [...rates].sort((a, b) => b.rate - a.rate);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];

    const diff = best.rate - worst.rate;

    // If the difference is too small → no meaningful pattern
    if (diff < SIGNIFICANCE_GAP) {
        return {
            bestDays: ["No statistically significant timing pattern"],
            worstDays: ["No statistically significant timing pattern"],
            recommendations: []
        };
    }

    // Convert short → full day name
    const shortToLong = {
        Sun: "Sunday",
        Mon: "Monday",
        Tue: "Tuesday",
        Wed: "Wednesday",
        Thu: "Thursday",
        Fri: "Friday",
        Sat: "Saturday"
    };

    return {
        bestDays: [shortToLong[best.day]],
        worstDays: [shortToLong[worst.day]],
        recommendations: [
            `Your strongest conversion rate occurs on <strong>${shortToLong[best.day]}</strong>, outperforming <strong>${shortToLong[worst.day]}</strong> by ${diff}%.`,
            `Prioritize applying on <strong>${shortToLong[best.day]}</strong>.`,
            `Avoid relying on <strong>${shortToLong[worst.day]}</strong>, which shows the lowest conversion in your data.`
        ]
    };
}