from django.urls import path

from . import views

app_name = 'chat'
urlpatterns = [
    path('', views.index, name='index'),
    path('cb/<str:room_uuid>', views.instance, name='instance'),
    path('new/', views.generate, name='generate'),
    path('cb/<str:room_uuid>/get_active', views.fetch_active, name='fetch_active'),
    path('cb/<str:room_uuid>/get_available_username', views.get_available_username, name='get_available_username'),
]