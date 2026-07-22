
drop policy if exists "Anyone reads active bundles" on public.bundles;
create policy "Public reads active bundles" on public.bundles
  for select to anon, authenticated using (active = true);
create policy "Admins read all bundles" on public.bundles
  for select to authenticated using (public.has_role(auth.uid(),'admin'));
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
