#!/bin/sh
now=$(date)
echo "$now | Running podcast_update.sh" >> /home/pi/scripts/scotus_rss/shell.log
cd /home/pi/scripts/scotus_rss/rasp_updater/
/usr/bin/python3 kickoff.py
echo "$now | Run Complete." >> /home/pi/scripts/scotus_rss/shell.log

