# Inquiry System Implementation Plan

## Database Schema
### `inquiries`
- `id` (uuid, PK)
- `user_id` (uuid, FK to students.auth_user_id or profiles.id?) -> `students` table has `id` (uuid). Is it linked to auth? `students` has `contact_email`. `profiles` has `id` (auth.users).
  - Let's link to `students` id if possible for easy admin lookup. But `auth.uid()` gives us the user ID.
  - Required: Map `auth.uid()` to `student_id`.
- `subject` (text)
- `status` (text: 'open', 'closed', 'replied')
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### `inquiry_messages`
- `id` (uuid, PK)
- `inquiry_id` (uuid, FK)
- `sender_id` (uuid, FK to profiles.id? or nullable if system?)
- `is_admin` (boolean) - To easily distinguish sender type.
- `body` (text)
- `created_at` (timestamptz)

## UI Components
### Member Side
- `/member/contact`: List of past inquiries + "New Inquiry" button.
- `/member/contact/new`: Form (Subject, Body).
- `/member/contact/[id]`: Chat-like view of the thread.

### Admin Side
- `/admin/inquiries`: List of inquiries (Filter by status).
- `/admin/inquiries/[id]`: Detail view + Reply form.

## Actions
- `createInquiry(subject, body)`
- `replyInquiry(inquiryId, body)`
- `closeInquiry(inquiryId)`

## Notifications
- Send email to Admin on new inquiry.
- Send email to User on Admin reply.
