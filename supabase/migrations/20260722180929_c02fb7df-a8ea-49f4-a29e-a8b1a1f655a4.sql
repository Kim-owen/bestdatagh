
-- Audit log
CREATE TABLE public.withdrawal_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  withdrawal_id UUID NOT NULL REFERENCES public.withdrawals(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  from_status public.withdrawal_status,
  to_status public.withdrawal_status NOT NULL,
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.withdrawal_events TO authenticated;
GRANT ALL ON public.withdrawal_events TO service_role;

ALTER TABLE public.withdrawal_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and admins can view withdrawal events" ON public.withdrawal_events
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.withdrawals w WHERE w.id = withdrawal_events.withdrawal_id AND w.user_id = auth.uid())
  );

CREATE INDEX idx_withdrawal_events_withdrawal ON public.withdrawal_events(withdrawal_id, created_at DESC);

-- Notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own notifications" ON public.notifications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_notifications_user ON public.notifications(user_id, read, created_at DESC);

-- Trigger: log every status change and notify agent
CREATE OR REPLACE FUNCTION public.tg_withdrawal_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title TEXT;
  v_body TEXT;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status OR NEW.admin_note IS DISTINCT FROM OLD.admin_note THEN
    INSERT INTO public.withdrawal_events (withdrawal_id, actor_id, from_status, to_status, admin_note)
    VALUES (NEW.id, auth.uid(), OLD.status, NEW.status, NEW.admin_note);
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'approved' THEN
      v_title := 'Withdrawal approved';
      v_body := 'Your withdrawal of GH₵ ' || NEW.amount_ghs || ' has been approved and is queued for payout.';
    ELSIF NEW.status = 'paid' THEN
      v_title := 'Withdrawal paid';
      v_body := 'GH₵ ' || NEW.amount_ghs || ' was sent to ' || NEW.destination || '.';
    ELSIF NEW.status = 'rejected' THEN
      v_title := 'Withdrawal rejected';
      v_body := COALESCE('Reason: ' || NEW.admin_note, 'Your withdrawal request was rejected.');
    ELSE
      v_title := NULL;
    END IF;

    IF v_title IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (NEW.user_id, 'withdrawal_' || NEW.status, v_title, v_body, '/agent');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER withdrawals_status_change
  AFTER UPDATE ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.tg_withdrawal_status_change();

-- Also log the initial creation
CREATE OR REPLACE FUNCTION public.tg_withdrawal_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.withdrawal_events (withdrawal_id, actor_id, from_status, to_status, admin_note)
  VALUES (NEW.id, NEW.user_id, NULL, NEW.status, 'Request submitted');
  RETURN NEW;
END;
$$;

CREATE TRIGGER withdrawals_created
  AFTER INSERT ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.tg_withdrawal_created();
