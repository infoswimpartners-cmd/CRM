-- Add next_next_membership_type_id to students table
ALTER TABLE students ADD COLUMN next_next_membership_type_id UUID REFERENCES membership_types(id);
