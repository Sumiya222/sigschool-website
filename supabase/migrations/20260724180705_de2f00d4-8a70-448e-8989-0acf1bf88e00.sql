-- Verification pass: revoke instructor.alpha and deactivate Beaconhouse school
UPDATE public.whitelist SET status='revoked' WHERE lower(email)='instructor.alpha@astrobot.demo';
UPDATE public.schools SET is_active=false WHERE id='22222222-0000-0000-0000-000000000001';