DROP POLICY IF EXISTS "Anyone can submit reviews" ON public.reviews;

CREATE POLICY "Anyone can submit valid reviews"
ON public.reviews
FOR INSERT
TO public
WITH CHECK (
  rating BETWEEN 1 AND 5
  AND char_length(btrim(name)) BETWEEN 1 AND 80
  AND char_length(btrim(message)) BETWEEN 3 AND 1000
  AND char_length(target_type) BETWEEN 1 AND 32
  AND char_length(target_id) BETWEEN 1 AND 128
);