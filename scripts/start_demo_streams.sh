#!/usr/bin/env bash
set -e
# Start MediaMTX first. These are synthetic test feeds; no external footage is required.
ffmpeg -re -f lavfi -i "testsrc2=size=1280x720:rate=15" -an -c:v libx264 -preset veryfast -tune zerolatency -pix_fmt yuv420p -f rtsp rtsp://localhost:8554/traffic-001 &
P1=$!
ffmpeg -re -f lavfi -i "smptebars=size=1280x720:rate=15" -an -c:v libx264 -preset veryfast -tune zerolatency -pix_fmt yuv420p -f rtsp rtsp://localhost:8554/traffic-002 &
P2=$!
trap 'kill $P1 $P2 2>/dev/null || true' INT TERM EXIT
wait
