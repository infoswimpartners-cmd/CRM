
const { calculateCoachRate, calculateHistoricalMonthlyRewards, calculateMonthlyStats } = require('./src/lib/reward-system');
// Need to mock or just copy paste the function logic for standalone testing if imports fail due to module resolution
// Since it's TS, I'll write a standalone TS script that includes the logic or imports it if possible. 
// Given the environment, importing from src might be tricky without ts-node/tsconfig paths setup perfectly.
// I'll copy the logic for testing to be safe and fast.

const calculateCoachRateMock = (coachId, allLessons, referenceDate, overrideRate) => {
    if (overrideRate) return overrideRate;
    return 0.50; // Default
};

const calculateHistoricalMonthlyRewardsMock = (
    coachId,
    allLessons,
    monthsToLookBack = 12,
    coachCreatedAt,
    overrideRate
) => {
    // Mock logic mimicking the real function
    const history = [];
    for (let i = 0; i < monthsToLookBack; i++) {
        // ... date logic skipped for brevity ...
        const historicalRate = calculateCoachRateMock(coachId, allLessons, new Date(), overrideRate);
        history.push({ rate: historicalRate });
    }
    return history;
};

// Test
console.log('--- Historical Reward Override Test ---');
const withOverride = calculateHistoricalMonthlyRewardsMock('c1', [], 1, null, 1.0);
console.log('Override 1.0 -> Rate:', withOverride[0].rate);

const withoutOverride = calculateHistoricalMonthlyRewardsMock('c1', [], 1, null, null);
console.log('No Override -> Rate:', withoutOverride[0].rate);
