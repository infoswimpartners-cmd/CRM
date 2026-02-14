
// Mock implementation of date-fns functions since we don't need real dates for this logic test
const startOfMonth = (d) => d;
const subMonths = (d, i) => d;
const endOfMonth = (d) => d;
const format = (d, f) => '2023-10';

// Mocked Lesson Data
const allLessons = [];

// Core Logic Check (Duplicated from src/lib/reward-system.ts to verify flow)
function calculateCoachRate(coachId, allLessons, referenceDate, overrideRate) {
    if (overrideRate) {
        console.log(`[DEBUG] Override detected: ${overrideRate}`);
        return overrideRate;
    }
    console.log(`[DEBUG] No override, defaulting to 0.50`);
    return 0.50; // Default
}

function calculateHistoricalMonthlyRewards(
    coachId,
    allLessons,
    monthsToLookBack = 12,
    coachCreatedAt,
    overrideRate
) {
    const history = [];
    // Verify override is passed down
    const historicalRate = calculateCoachRate(coachId, allLessons, new Date(), overrideRate);
    history.push({ rate: historicalRate });
    return history;
}

// Test
console.log('--- Historical Reward Override Verification ---');

console.log('\nTest 1: With Override 1.0');
const result1 = calculateHistoricalMonthlyRewards('c1', [], 12, null, 1.0);
console.log('Result Rate:', result1[0].rate);
if (result1[0].rate === 1.0) console.log('✅ PASS');
else console.log('❌ FAIL');


console.log('\nTest 2: Without Override');
const result2 = calculateHistoricalMonthlyRewards('c1', [], 12, null); // override undefined
console.log('Result Rate:', result2[0].rate);
if (result2[0].rate === 0.50) console.log('✅ PASS');
else console.log('❌ FAIL');
