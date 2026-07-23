-- Migration for User & Agent Wallet System

CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    balance_ghs NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet"
    ON public.wallets FOR SELECT
    USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    amount_ghs NUMERIC(12,2) NOT NULL,
    type TEXT NOT NULL, -- 'deposit', 'purchase', 'agent_commission', 'refund'
    reference TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'completed', -- 'pending', 'completed', 'failed'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet transactions"
    ON public.wallet_transactions FOR SELECT
    USING (auth.uid() = user_id);

-- Atomic Function to credit wallet
CREATE OR REPLACE FUNCTION public.credit_wallet(p_user_id UUID, p_amount NUMERIC, p_reference TEXT, p_description TEXT)
RETURNS NUMERIC AS $$
DECLARE
    v_new_balance NUMERIC;
BEGIN
    INSERT INTO public.wallets (user_id, balance_ghs)
    VALUES (p_user_id, p_amount)
    ON CONFLICT (user_id) DO UPDATE
    SET balance_ghs = public.wallets.balance_ghs + p_amount,
        updated_at = now()
    RETURNING balance_ghs INTO v_new_balance;

    INSERT INTO public.wallet_transactions (user_id, amount_ghs, type, reference, status, description)
    VALUES (p_user_id, p_amount, 'deposit', p_reference, 'completed', p_description)
    ON CONFLICT (reference) DO NOTHING;

    RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic Function to deduct wallet for purchases
CREATE OR REPLACE FUNCTION public.deduct_wallet(p_user_id UUID, p_amount NUMERIC, p_reference TEXT, p_description TEXT)
RETURNS NUMERIC AS $$
DECLARE
    v_cur_balance NUMERIC;
    v_new_balance NUMERIC;
BEGIN
    SELECT balance_ghs INTO v_cur_balance
    FROM public.wallets
    WHERE user_id = p_user_id FOR UPDATE;

    IF v_cur_balance IS NULL OR v_cur_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient wallet balance';
    END IF;

    UPDATE public.wallets
    SET balance_ghs = balance_ghs - p_amount,
        updated_at = now()
    WHERE user_id = p_user_id
    RETURNING balance_ghs INTO v_new_balance;

    INSERT INTO public.wallet_transactions (user_id, amount_ghs, type, reference, status, description)
    VALUES (p_user_id, -p_amount, 'purchase', p_reference, 'completed', p_description);

    RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
