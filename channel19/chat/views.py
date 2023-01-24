from django.shortcuts import render
from chat.models import Room
from django.http import Http404
from django.http import HttpResponseRedirect
from django.urls import reverse


def generate(request):
    # try:
        
    # except:
    #     raise Http404("Issue creating new room.")
    # else:
    new_rm= Room()
    new_uuid = new_rm.uuid
    new_rm.save()
    # Always return an HttpResponseRedirect after successfully dealing
    # with POST data. This prevents data from being posted twice if a
    # user hits the Back button.
    return HttpResponseRedirect(reverse('chat:instance', args=(new_uuid,)))

def index(request):
    template_name = 'chat/index.html'
    return render(request, template_name)

    
def instance(request, uuid):
    try: 
        room = Room.objects.get(uuid=uuid)
    except Room.DoesNotExist:
        raise Http404("Room does not exist!")
    context = {'room_name': room.uuid,}
    return render(request, 'chat/room.html', context=context) 
