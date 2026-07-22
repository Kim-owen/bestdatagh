-- Create phone_verifications table to track verified buyer numbers & active OTP codes
CREATE TABLE IF NOT EXISTS public.phone_verifications (
  phone VARCHAR(20) PRIMARY KEY,
  otp_code VARCHAR(10),
  expires_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;

-- Allow public read/insert via server functions
CREATE POLICY "Allow public select phone_verifications"
  ON public.phone_verifications FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert phone_verifications"
  ON public.phone_verifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update phone_verifications"
  ON public.phone_verifications FOR UPDATE
  USING (true);
