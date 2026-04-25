DO $$
BEGIN
  PERFORM cron.unschedule('bulk-jobs-watchdog-every-minute');
EXCEPTION WHEN others THEN
  NULL;
END $$;

SELECT cron.schedule(
  'bulk-jobs-watchdog-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://mttoiqruzzxooveooldo.supabase.co/functions/v1/bulk-jobs-watchdog',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10dG9pcXJ1enp4b292ZW9vbGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2OTM5NjUsImV4cCI6MjA5MDI2OTk2NX0.1IqkcJqW9Lzk5QnmToyQbnGxqMwO-ykTRlSnOv_cTxE","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10dG9pcXJ1enp4b292ZW9vbGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2OTM5NjUsImV4cCI6MjA5MDI2OTk2NX0.1IqkcJqW9Lzk5QnmToyQbnGxqMwO-ykTRlSnOv_cTxE"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);