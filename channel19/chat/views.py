from django.shortcuts import render
from chat.models import Room
from django.http import Http404
from django.http import HttpResponseRedirect
from django.urls import reverse
from django.http import JsonResponse

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


def fetch_active(request, uuid):
    try: 
        room = Room.objects.get(uuid=uuid)
        number_of_talkers = len(room.talker_set.all())
    except Room.DoesNotExist:
        return render(request, 'chat/404.html')
    context = {'room_name': room.uuid,
            'talker_count': number_of_talkers}
    return JsonResponse(context)

def index(request):
    template_name = 'chat/index.html'
    return render(request, template_name)

    
def instance(request, uuid):
    try: 
        room = Room.objects.get(uuid=uuid)
        number_of_talkers = len(room.talker_set.all())
    except Room.DoesNotExist:
        return render(request, 'chat/404.html')
    context = {'room_name': room.uuid,
            'talker_count': number_of_talkers}
    return render(request, 'chat/room.html', context=context) 
