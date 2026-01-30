-- Create a sequence for student numbers starting at 1
CREATE SEQUENCE IF NOT EXISTS student_number_seq START 1;

-- Create a function to auto-generate the student number
CREATE OR REPLACE FUNCTION set_student_number_id() RETURNS TRIGGER AS $$
BEGIN
    -- Only generate if not provided
    IF NEW.student_number IS NULL OR NEW.student_number = '' THEN
        -- Generate next number and pad with zeros to length 4 (e.g., '0001')
        NEW.student_number := LPAD(nextval('student_number_seq')::text, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_set_student_number ON students;
CREATE TRIGGER trigger_set_student_number
BEFORE INSERT ON students
FOR EACH ROW
EXECUTE FUNCTION set_student_number_id();
