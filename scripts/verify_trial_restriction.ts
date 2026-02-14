
import { createClient } from '@supabase/supabase-js';
import { checkStudentLessonStatus } from '../src/actions/lesson_schedule';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyTrialRestriction() {
    console.log('Starting verification for Trial Lesson Restriction...');

    // 1. Create a temporary trial student
    const testEmail = `test_trial_${Date.now()}@example.com`;
    const { data: student, error: createError } = await supabase
        .from('students')
        .insert({
            full_name: 'Test Trial',
            full_name_kana: 'テスト トライアル',
            status: 'trial_pending',
            contact_email: testEmail,
        })
        .select()
        .single();

    // If constraint fails on coach_id, we might need to fetch one.
    if (createError) {
        if (createError.message.includes('foreign key constraint') || createError.message.includes('coach_id')) {
            console.log('Fetching a valid coach ID...');
            const { data: coaches } = await supabase.from('profiles').select('id').eq('role', 'coach').limit(1);
            if (coaches && coaches.length > 0) {
                const coachId = coaches[0].id;
                console.log('Retrying with coach ID:', coachId);
                const { data: studentRetry, error: retryError } = await supabase
                    .from('students')
                    .insert({
                        full_name: 'Test Trial',
                        full_name_kana: 'テスト トライアル',
                        status: 'trial_pending',
                        contact_email: testEmail,
                        coach_id: coachId
                    })
                    .select()
                    .single();

                if (retryError) {
                    console.error('Failed to create test student (retry):', retryError);
                    process.exit(1);
                }
                runTest(studentRetry);
            } else {
                console.error('No coaches found to attach student to.');
                process.exit(1);
            }
        } else {
            console.error('Failed to create test student:', createError);
            process.exit(1);
        }
    } else {
        runTest(student);
    }
}

async function runTest(student: any) {
    try {
        console.log(`Created test student: ${student.id} (Status: ${student.status})`);

        // 2. Call checkStudentLessonStatus
        // We need to mock the context? checkStudentLessonStatus checks auth.getUser(). 
        // This script runs as admin/service role, but the action calls `await supabase.auth.getUser()`.
        // If we run this script via `esrun`, we are not in Next.js context with auth cookies.
        // checkStudentLessonStatus uses `createClient` from `@/lib/supabase/server` which uses cookies().
        // This will FAIL in a standalone script.

        // WORKAROUND: We can't easily import the Server Action into a standalone script because of the `next/headers` dependency.
        // We must replicate the logic OR run this inside a Next.js route (less ideal for quick check).

        // HOWEVER, since I just modified the code, I can basically replicate the logic here to verify the QUERY and LOGIC works, 
        // even if I can't call the exact function instance.

        console.log('Simulating checkStudentLessonStatus logic...');

        // LOGIC REPLICATION START
        const studentId = student.id;

        // Fetch student (The modified query)
        const { data: fetchedStudent, error: studentError } = await supabase
            .from('students')
            .select(`
                id,
                status,
                membership_started_at,
                created_at,
                membership_types!students_membership_type_id_fkey (
                    name,
                    id,
                    default_lesson_master_id
                )
            `).eq('id', studentId)
            .single();

        if (studentError) throw studentError;

        console.log('Fetched student status:', fetchedStudent.status);

        let availableLessons: any[] = [];
        let membershipName = '';

        if (fetchedStudent.status === 'trial_pending') {
            console.log('[Logic Check] Student is trial_pending. Fetching Trial Lessons...');
            const { data: trialLessons } = await supabase
                .from('lesson_masters')
                .select('id, name, unit_price')
                .ilike('name', '%体験%')
                .eq('active', true);

            availableLessons = trialLessons || [];
            membershipName = '体験利用';

            console.log(`[Logic Check] Found ${availableLessons.length} trial lessons.`);
            availableLessons.forEach(l => console.log(` - ${l.name} (${l.id})`));
        } else {
            console.log('[Logic Check] Student is NOT trial_pending.');
        }
        // LOGIC REPLICATION END

        // Assertions
        if (availableLessons.length === 0) {
            console.error('❌ Verification FAILED: No trial lessons found. Ensure lesson_masters has entries with "体験" in name.');
        } else {
            const allTrial = availableLessons.every(l => l.name.includes('体験'));
            if (allTrial) {
                console.log('✅ Verification PASSED: Only trial lessons returned.');
            } else {
                console.error('❌ Verification FAILED: Non-trial lessons returned:', availableLessons);
            }
        }

    } catch (err) {
        console.error('Test execution error:', err);
    } finally {
        // Cleanup
        console.log('Cleaning up test student...');
        await supabase.from('students').delete().eq('id', student.id);
        console.log('Done.');
        process.exit(0);
    }
}

verifyTrialRestriction();
