
import { calculateLessonReward, LessonData } from '../src/lib/reward-system';

const mockLessonNormal: LessonData = {
    id: '1',
    lesson_date: '2024-01-01',
    price: 6000,
    coach_id: 'coach-1',
    lesson_masters: {
        id: 'lm-1',
        unit_price: 8000,
        is_trial: false
    },
    students: {
        full_name: 'Test Student',
        is_two_person_lesson: false,
        membership_types: {
            id: 'mt-1',
            membership_type_lessons: []
        }
    }
};

const mockLessonTwoPerson: LessonData = {
    ...mockLessonNormal,
    students: {
        ...mockLessonNormal.students!,
        full_name: 'Two Person Student',
        is_two_person_lesson: true
    }
};

const rate = 0.60; // Example rate

console.log('--- Verification: 2-Person Lesson Reward ---\n');

// 1. Normal Lesson
const rewardNormal = calculateLessonReward(mockLessonNormal, rate);
console.log(`Normal Lesson (Rate ${rate}, Price ${mockLessonNormal.lesson_masters!.unit_price}):`);
console.log(`Expected: ${mockLessonNormal.lesson_masters!.unit_price * rate}`);
console.log(`Actual:   ${rewardNormal}`);
console.log(`Result:   ${rewardNormal === Math.floor(8000 * rate) ? 'PASS' : 'FAIL'}\n`);

// 2. Two Person Lesson
const rewardTwoPerson = calculateLessonReward(mockLessonTwoPerson, rate);
const expectedTwoPerson = Math.floor(8000 * rate) + 1000;
console.log(`Two Person Lesson (Rate ${rate}, Price ${mockLessonTwoPerson.lesson_masters!.unit_price}):`);
console.log(`Expected: ${expectedTwoPerson} (Base + 1000)`);
console.log(`Actual:   ${rewardTwoPerson}`);
console.log(`Result:   ${rewardTwoPerson === expectedTwoPerson ? 'PASS' : 'FAIL'}\n`);

if (rewardTwoPerson === expectedTwoPerson) {
    console.log('SUCCESS: Logic verified.');
    process.exit(0);
} else {
    console.error('FAILURE: Logic check failed.');
    process.exit(1);
}
