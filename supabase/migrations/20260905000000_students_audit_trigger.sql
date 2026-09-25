-- Students had no deletion logging at all -- invoices, payments, and
-- user_roles all get one (audit_invoices, audit_payments, audit_user_roles),
-- but a student row could vanish with zero trace. Worse: attendance, marks,
-- remarks, and enrollment_history all cascade-delete with their student, so
-- a hard delete used to erase the underlying data too, not just the roster
-- entry. This closes that gap the same way the other three tables did.
--
-- DELETE is deliberately a BEFORE trigger, not AFTER like the other three
-- audit triggers. Postgres implements ON DELETE CASCADE as its own
-- constraint trigger on the referenced table (students), and by the time an
-- AFTER DELETE trigger on students runs, whether that cascade has already
-- removed the attendance/marks rows is a matter of trigger-name ordering,
-- not something to rely on. A BEFORE trigger runs before anything cascades,
-- so the counts below are always accurate.
CREATE OR REPLACE FUNCTION public.audit_students()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  actor_email text;
  actor_label text;
  sch_id uuid;
  sch_name text;
  sch_id_old uuid;
  sch_name_old text;
  grade_val int;
  grade_val_old int;
  att_count int;
  mrk_count int;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    SELECT email INTO actor_email FROM auth.users WHERE id = auth.uid();
    actor_label := COALESCE(actor_email, auth.uid()::text);
  ELSE
    actor_label := 'direct database access (service-role or SQL editor — no authenticated actor)';
  END IF;

  IF TG_OP = 'INSERT' THEN
    SELECT sec.school_id, sch.name, sec.grade INTO sch_id, sch_name, grade_val
      FROM public.sections sec LEFT JOIN public.schools sch ON sch.id = sec.school_id
      WHERE sec.id = NEW.section_id;

    INSERT INTO public.audit_log(actor_user_id, action_type, target_type, target_id, details)
    VALUES (auth.uid(), 'student_created', 'student', NEW.id::text,
      jsonb_build_object(
        'roll_number', NEW.roll_number, 'full_name', NEW.full_name,
        'school_id', sch_id, 'school_name', sch_name,
        'section_id', NEW.section_id, 'grade', grade_val,
        'is_active', NEW.is_active, 'actor', actor_label
      ));
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    SELECT sec.school_id, sch.name, sec.grade INTO sch_id, sch_name, grade_val
      FROM public.sections sec LEFT JOIN public.schools sch ON sch.id = sec.school_id
      WHERE sec.id = NEW.section_id;
    SELECT sec.school_id, sch.name, sec.grade INTO sch_id_old, sch_name_old, grade_val_old
      FROM public.sections sec LEFT JOIN public.schools sch ON sch.id = sec.school_id
      WHERE sec.id = OLD.section_id;

    INSERT INTO public.audit_log(actor_user_id, action_type, target_type, target_id, details)
    VALUES (auth.uid(), 'student_updated', 'student', NEW.id::text,
      jsonb_build_object(
        'roll_number_before', OLD.roll_number, 'roll_number_after', NEW.roll_number,
        'full_name_before', OLD.full_name, 'full_name_after', NEW.full_name,
        'school_id_before', sch_id_old, 'school_name_before', sch_name_old,
        'school_id_after', sch_id, 'school_name_after', sch_name,
        'section_id_before', OLD.section_id, 'section_id_after', NEW.section_id,
        'grade_before', grade_val_old, 'grade_after', grade_val,
        'is_active_before', OLD.is_active, 'is_active_after', NEW.is_active,
        'actor', actor_label
      ));
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    SELECT sec.school_id, sch.name, sec.grade INTO sch_id_old, sch_name_old, grade_val_old
      FROM public.sections sec LEFT JOIN public.schools sch ON sch.id = sec.school_id
      WHERE sec.id = OLD.section_id;
    SELECT count(*) INTO att_count FROM public.attendance WHERE student_id = OLD.id;
    SELECT count(*) INTO mrk_count FROM public.marks WHERE student_id = OLD.id;

    INSERT INTO public.audit_log(actor_user_id, action_type, target_type, target_id, details)
    VALUES (auth.uid(), 'student_deleted', 'student', OLD.id::text,
      jsonb_build_object(
        'roll_number', OLD.roll_number, 'full_name', OLD.full_name,
        'school_id', sch_id_old, 'school_name', sch_name_old,
        'section_id', OLD.section_id, 'grade', grade_val_old,
        'is_active', OLD.is_active,
        'attendance_rows_deleted', att_count, 'marks_rows_deleted', mrk_count,
        'actor', actor_label
      ));
    RETURN OLD;
  END IF;
END;
$function$;

CREATE TRIGGER audit_students_ins_upd_trg
  AFTER INSERT OR UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.audit_students();

CREATE TRIGGER audit_students_del_trg
  BEFORE DELETE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.audit_students();
