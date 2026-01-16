-- Promote info.swimpartners@gmail.com to admin
UPDATE profiles
SET role = 'admin'
WHERE email = 'info.swimpartners@gmail.com';

-- Ensure shinshin980312kodai@gmail.com is also admin (redundant but safe)
UPDATE profiles
SET role = 'admin'
WHERE email = 'shinshin980312kodai@gmail.com';
