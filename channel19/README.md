# cb_proj
followed this tutorial: 

https://www.youtube.com/watch?v=MBOlZMLaQ8g

django channel docs : https://channels.readthedocs.io/en/latest/introduction.html 

localhost runserver is overridden by daphne which triggers asgi mode for websockets

the django admin is there to delete things

python3 manage.py runserver, python3 manage.py shell (to explore db) 

The db settings are there, db is postgres 

to expose to the world I used 

---------> 'ngrok http 8000'

there is a redis thing that needs to be active for this to work. The command for that is:


----------> 'docker run -p 6379:6379 -d redis:5'. 
 
    In order for that to work I need to run docker on my comptuer such that the desktop software is running and there is a symbol up near the other symbols (time, nord, volume, etc) on the top right of the screen. 

there is also a docker desktop client, and sometimes the task gets stale and has to be killed there before it is restarted cleanly 

here is the website where I have an account set up for a free turn Server: 

----------> https://dashboard.metered.ca/turnserver/app/63da0b1e217036507c2f976d the password is saved in chrome. 

if you want to go live on ngrok, you need to go into the room.html file and change the ws:// to wss:// because in the wild clients demand the extra s, which is the same extra s as https and I think stands for 'secure' 

You need to change ALLOWED_HOSTS and CSRF_TRUSTED_HOSTS in settings.py to use ngrok

1/23/23:
Ended at 1:37:00 (before chat was implemented)



ISSUES TO TEST (SOLVED OR WORKING ON):
Timing - different clients count at different speeds. A test should make sure that the clients are in sync over long time scales. 


gunicorn stuff: 
https://github.com/mitchtabian/HOWTO-django-channels-daphne#helpful-commands


debugging: 1:14:29
https://www.youtube.com/watch?v=14zdpWW6eqw


####---- Useful Server Commands: ----####

service gunicorn restart
sudo systemctl status gunicorn

service daphne restart
systemctl status daphne.service

sudo systemctl restart redis.service
sudo systemctl status redis

systemctl status on_boot.service

If you update js/css you need to become user 'django' and then cd into channel19 on server and then do 'python manage.py collectstatic' (as venv)
If you update anything else (html, python) you need to become user 'root' on server and then run 'service gunicorn restart' to restart the server 


sudo journalctl is where all the logs are consolidated to. That's usually where I check.
sudo tail -F /var/log/nginx/error.log View the last entries in the error log
sudo journalctl -u nginx Nginx process logs
sudo less /var/log/nginx/access.log Nginx access logs
sudo less /var/log/nginx/error.log Nginx error logs
sudo journalctl -u gunicorn gunicorn application logs
sudo journalctl -u gunicorn.socket check gunicorn socket logs


TO DELETE ALL ROOMS WITHOUT TALKERS:
Room.objects.filter(talker__isnull=True).delete()



TO DELETE ALL ROOMS OLDER THAN TWO HOURS: 
from django.utils import timezone
from myapp.models import Room

time_threshold = timezone.now() - timezone.timedelta(hours=2)
rooms_to_delete = Room.objects.filter(creation_date__lt=time_threshold)
rooms_to_delete.delete()
