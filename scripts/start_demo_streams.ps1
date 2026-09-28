# Start MediaMTX first. These are synthetic test feeds; no external footage is required.
$jobs = @(
  Start-Process ffmpeg -ArgumentList '-re -f lavfi -i "testsrc2=size=1280x720:rate=15" -an -c:v libx264 -preset veryfast -tune zerolatency -pix_fmt yuv420p -f rtsp rtsp://localhost:8554/traffic-001' -PassThru,
  Start-Process ffmpeg -ArgumentList '-re -f lavfi -i "smptebars=size=1280x720:rate=15" -an -c:v libx264 -preset veryfast -tune zerolatency -pix_fmt yuv420p -f rtsp rtsp://localhost:8554/traffic-002' -PassThru
)
Wait-Process -Id ($jobs.Id)
