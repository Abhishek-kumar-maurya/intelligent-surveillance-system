# Analytics simulator

Send a deterministic ANPR event to the API. Start the API first.

```bash
python simulator/send_event.py
```

The default event uses `GJ01XX0001`, which is seeded into the synthetic watchlist. This makes the real-time alert path reproducible for the hiring demo.
