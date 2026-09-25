UPDATE public.leadership SET bio = 'Placeholder biography — sets direction for AstroBot''s curriculum, partnerships and national expansion across school networks.', bio_confirmed = true WHERE name = 'Qurt-ul-Ain Haider';
UPDATE public.leadership SET bio = 'Placeholder biography — oversees day-to-day delivery, instructor deployment and school operations across all active campuses.', bio_confirmed = true WHERE name = 'Shameer Zeeshan';

INSERT INTO public.leadership (name, title, bio, bio_confirmed, tier, "order", visible) VALUES
('Ayesha Khan', 'Head of Curriculum', 'Placeholder description — designs the module architecture and keeps every grade''s content non-repetitive year to year.', true, 'team', 1, true),
('Bilal Ahmed', 'Lead Robotics Instructor', 'Placeholder description — runs build sessions, kit maintenance and instructor training for the robotics track.', true, 'team', 2, true),
('Hina Raza', 'AI Programme Lead', 'Placeholder description — leads the applied AI track and supervises student model-building projects.', true, 'team', 3, true),
('Usman Tariq', 'Space Systems Instructor', 'Placeholder description — teaches orbital mechanics and payload design through hands-on classroom missions.', true, 'team', 4, true),
('Sana Malik', 'School Partnerships Manager', 'Placeholder description — onboards partner schools and coordinates term schedules with academic teams.', true, 'team', 5, true),
('Faizan Sheikh', 'Assessment & Reporting', 'Placeholder description — maintains the marking framework and prepares term reports for partner schools.', true, 'team', 6, true),
('Maryam Iqbal', 'Instructor Trainer', 'Placeholder description — certifies new instructors and audits session quality across campuses.', true, 'team', 7, true),
('Ahsan Javed', 'Operations Coordinator', 'Placeholder description — manages logistics, kit distribution and scheduling for all active sections.', true, 'team', 8, true);