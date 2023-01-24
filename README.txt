

-----WELCOME TO SUPREME COURT PODCAST-----

STEP 0: CRONTAB COMMAND: 
crontab -e


A. Main script for running at ~/scripts/podcast_update.sh
   To run the script manually, navigate to ~/scripts and enter './podcast_update.sh'

B. Logging at scripts/scotus_rss/prod.log AND ~/scripts/shell.log

C. to change into dev:
	1. go to ~/scripts/scotus_rss/rasp_updater/updater.py 
	2. change url to /dev.xml


D. XML hosted at:
	purplefloyd14.github.io/prod.xml

E. To activate virtual env (not really needed so far, maybe just for mac):
	'source venv/bin/activate' (from scotus_rss dir)


F. To populate the feed (from scratch):

	1. set url to dev and then upload rss_streams/channel_template
	 -->that will grab every case from oldest to newest and fill it up in order
	2. once this is done, you can manually copy it over to prod
	3. Alternatively, you could just do this all in prod but that is dangerous

G. Note: rss_streams/prod_feed is 100% working and perfect as of 10/15/22


H. To get into Raspbery pi: 

	*must close VPN before attemping* 

	type: "ssh pi@scotuspi"

	project lives in ~/scripts

	to leave ssh: 'exit'

I. To shut down raspberry pi: 'shutdown -h now'


J. to run the main script in python
	navigate to '/scotus_rss/rasp_updater'

	1. 'python3'
	2. 'import updater
	3. 'updater.update()'        \or updater.populate(), depending on goal 

	^ this is called from podcast_updater.sh which the crontab hits 


