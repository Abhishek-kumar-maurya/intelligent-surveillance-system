# 3–5 minute demo script

1. Login as admin.
2. Show camera registry and the three seeded cameras on the GIS map.
3. Start MediaMTX and `scripts/start_demo_streams` to show two synthetic RTSP sources in the camera grid.
4. Run `python simulator/send_event.py`.
5. Show the ANPR event arriving without refresh.
6. Show the watchlist match for `GJ01XX0001` and the real-time alert.
7. Acknowledge and resolve the alert.
8. Search `GJ01XX0001` and show the chronological movement route.
9. Open `/docs` to demonstrate the API contract.
10. Briefly explain media plane vs intelligence/data plane and the scale-out path.
