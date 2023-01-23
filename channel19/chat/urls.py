from django.urls import path

from . import views

app_name = 'chat'
urlpatterns = [
    path('', views.index, name='index'),
    path('cb/<str:uuid>', views.instance, name='instance'),
    path('new/', views.generate, name='generate'),
]