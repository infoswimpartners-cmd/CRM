
const SPECIAL_EXCEPTION_RATE = 0.7000001;

interface MockLesson {
    id: string;
    lesson_date: string;
    lesson_masters: {
        unit_price: number;
        is_trial: boolean;
    };
    students?: {
        membership_types?: {
            reward_master?: {
                unit_price: number;
            };
        };
    };
}

interface MockProfile {
    role: string;
    override_coach_rank?: number;
}

function calculateRewardsMock(
    profile: MockProfile,
    averageLessonCount: number,
    currentLessons: MockLesson[]
) {
    const isOwner = profile.role === 'admin';
    let currentRank = 'Standard';
    let rate = 0.50;

    if (isOwner) {
        currentRank = 'Owner';
        rate = 1.0;
    } else if (profile.override_coach_rank) {
        rate = profile.override_coach_rank;
        if (rate >= 1.0) currentRank = 'Owner';
        else if (Math.abs(rate - SPECIAL_EXCEPTION_RATE) < 0.0000001) currentRank = 'Owner'; // Treat as Owner-ish/Special
        else if (rate >= 0.70) currentRank = 'Platinum';
        else if (rate >= 0.65) currentRank = 'Gold';
        else if (rate >= 0.60) currentRank = 'Silver';
        else if (rate >= 0.55) currentRank = 'Bronze';
        else currentRank = 'Standard';
    } else {
        if (averageLessonCount >= 30) {
            currentRank = 'Platinum';
            rate = 0.70;
        } else if (averageLessonCount >= 25) {
            currentRank = 'Gold';
            rate = 0.65;
        } else if (averageLessonCount >= 20) {
            currentRank = 'Silver';
            rate = 0.60;
        } else if (averageLessonCount >= 15) {
            currentRank = 'Bronze';
            rate = 0.55;
        }
    }

    console.log(`Profile Role: ${profile.role}, Override: ${profile.override_coach_rank}, Avg Lessons: ${averageLessonCount}`);
    console.log(`Determined Rank: ${currentRank}, Rate: ${rate}`);

    let totalReward = 0;
    let trialCount = 0;

    currentLessons.forEach(lesson => {
        const master = lesson.lesson_masters;
        const membershipRewardMaster = lesson.students?.membership_types?.reward_master;

        if (master.is_trial) {
            let amount = 4500;
            if (Math.abs(rate - SPECIAL_EXCEPTION_RATE) < 0.0000001) {
                amount = 5000;
            }
            totalReward += amount;
            trialCount++;
            console.log(`  Trial Lesson: ${amount}`);
        } else {
            const basePrice = membershipRewardMaster?.unit_price ?? master.unit_price;
            const amount = Math.floor(basePrice * rate);
            totalReward += amount;
            console.log(`  Normal Lesson: ${basePrice} * ${rate} = ${amount}`);
        }
    });

    console.log(`Total Reward: ${totalReward}\n`);
    return { currentRank, rate, totalReward };
}

// Test Cases
console.log('--- Test Cases ---\n');

// Case 1: Standard Coach, No Override, Low Lessons
calculateRewardsMock(
    { role: 'coach' },
    10,
    [{ id: '1', lesson_date: '2023-10-01', lesson_masters: { unit_price: 6000, is_trial: false } }]
);

// Case 2: Standard Coach, No Override, High Lessons (Platinum)
calculateRewardsMock(
    { role: 'coach' },
    35,
    [{ id: '2', lesson_date: '2023-10-01', lesson_masters: { unit_price: 6000, is_trial: false } }]
);

// Case 3: Coach with Override (Gold) - Should ignore lesson count
calculateRewardsMock(
    { role: 'coach', override_coach_rank: 0.65 },
    10, // Should be Bronze without override
    [{ id: '3', lesson_date: '2023-10-01', lesson_masters: { unit_price: 6000, is_trial: false } }]
);

// Case 4: Special Exception Rank
calculateRewardsMock(
    { role: 'coach', override_coach_rank: SPECIAL_EXCEPTION_RATE },
    10,
    [
        { id: '4', lesson_date: '2023-10-01', lesson_masters: { unit_price: 6000, is_trial: true } },
        { id: '5', lesson_date: '2023-10-02', lesson_masters: { unit_price: 6000, is_trial: false } }
    ]
);

// Case 5: Owner
calculateRewardsMock(
    { role: 'admin' },
    0,
    [{ id: '6', lesson_date: '2023-10-01', lesson_masters: { unit_price: 6000, is_trial: false } }]
);

// Case 6: Coach Role but Override 1.0 (Fix Validation)
calculateRewardsMock(
    { role: 'coach', override_coach_rank: 1.0 },
    0,
    [{ id: '7', lesson_date: '2023-10-01', lesson_masters: { unit_price: 6000, is_trial: false } }]
);
