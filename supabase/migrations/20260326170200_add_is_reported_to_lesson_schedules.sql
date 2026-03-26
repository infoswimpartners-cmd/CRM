-- Migration: Add is_reported to lesson_schedules
ALTER TABLE lesson_schedules ADD COLUMN is_reported boolean DEFAULT false;
