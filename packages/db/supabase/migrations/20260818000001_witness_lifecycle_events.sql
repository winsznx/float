-- The witness lifecycle scheduler (T-24h reminder, at-deadline notification)
-- needs an idempotency ledger so a cron tick never re-sends what an earlier
-- tick already delivered. pledge_events IS the pledge lifecycle ledger, so the
-- two notification moments become event types rather than a new table.
alter table public.pledge_events
  drop constraint pledge_events_event_type_check;

alter table public.pledge_events
  add constraint pledge_events_event_type_check check (event_type in (
    'created', 'witness_confirmed_success', 'witness_confirmed_failure',
    'expired_slashed', 'funds_released', 'slash_fired',
    'witness_reminded_24h', 'witness_notified_deadline'
  ));
