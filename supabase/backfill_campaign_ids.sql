-- Backfill campaign_id in email_logs for campaigns sent with old code.
-- Matches email_logs to campaigns via workspace_id + sent_at time window (±30 min).
-- Safe to run multiple times (only updates NULL rows).

UPDATE public.email_logs el
SET campaign_id = c.id
FROM public.email_campaigns c
WHERE el.campaign_id IS NULL
  AND el.workspace_id = c.workspace_id
  AND c.sent_at IS NOT NULL
  AND el.sent_at BETWEEN c.sent_at - interval '30 minutes'
                     AND c.sent_at + interval '30 minutes';

-- Show what was updated
SELECT
  c.name        AS campaign_name,
  c.sent_at     AS campaign_sent_at,
  COUNT(el.id)  AS email_logs_linked
FROM public.email_campaigns c
JOIN public.email_logs el ON el.campaign_id = c.id
GROUP BY c.id, c.name, c.sent_at
ORDER BY c.sent_at DESC;
