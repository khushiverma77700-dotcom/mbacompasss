-- Clear stale LOVABLE_API_KEY from api_credentials so functions fall back to the fresh env var provisioned in this workspace.
DELETE FROM public.api_credentials WHERE key_name = 'LOVABLE_API_KEY';