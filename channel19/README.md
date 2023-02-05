# cb_proj
followed this tutorial: 

https://www.youtube.com/watch?v=MBOlZMLaQ8g


localhost runserver is overridden by daphne which triggers asgi mode for websockets

the django admin is there to delete things

python3 manage.py runserver, python3 manage.py shell (to explore db) 

The db settings are there, db is postgres 

to expose to the world I used 'ngrok http 8000'

there is a redis thing that needs to be active for this to work. The command for that is 'docker run -p 6379:6379 -d redis:5'. In order for that to work I need to run docker on my comptuer such that the desktop software is running and there is a symbol up near the other symbols (time, nord, volume, etc) on the top right of the screen. 

there is also a docker desktop client, and sometimes the task gets stale and has to be killed there before it is restarted cleanly 

here is the website where I have an account set up for a free turn Server: https://dashboard.metered.ca/turnserver/app/63da0b1e217036507c2f976d the password is saved in chrome. 

if you want to go live on ngrok, you need to go into the room.html file and change the ws:// to wss:// because in the wild clients demand the extra s, which is the same extra s as https and I think stands for 'secure' 

You need to change ALLOWED_HOSTS and CSRF_TRUSTED_HOSTS in settings.py to use ngrok

1/23/23:
Ended at 1:37:00 (before chat was implemented)

names: (.com)
ch31 - $400 
ch14 - min. $250 
ch48 - $400 
channel14 - 8k 
