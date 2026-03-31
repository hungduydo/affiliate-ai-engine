#!/bin/sh
# Start Xvfb virtual display so Chrome can run in non-headless mode inside Docker.
# This prevents Shopee's bot detection from triggering (it checks headless flags).
Xvfb :99 -screen 0 1440x900x24 -ac &
export DISPLAY=:99

# Wait for Xvfb to be ready
sleep 1

exec node server.mjs
