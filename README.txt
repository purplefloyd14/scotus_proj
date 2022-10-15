to activate virtual env useful
source venv/bin/activate (from scotus_rss dir)


to populate the feed:

1. set url to dev and then upload rss_streams/channel_template
  -that will grab every case from oldest to newest and fill it up in order
2. once this is done, you can manually copy it over to prod
3. Alternatively, you could just do this all in prod but that is dangerous

Note: rss_streams/prod_feed is 100% working and perfect as of 10/15/22


to get into Raspbery pi:

type: "ssh pi@scotuspi"

project lives in ~/scripts

to leave ssh: 'exit'

to shut down raspberry pi: 'shutdown -h now'





to run the main script
navigate to /scotus_rss/rasp_updater

"python3
import updater
updater.update()"        \or updater.populate(), depending on goal 
