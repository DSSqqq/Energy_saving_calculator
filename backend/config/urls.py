"""
Корневая маршрутизация Django-проекта «config».

Префикс /api/ отдаёт приложению measures, внутри которого зарегистрированы
энерго-аудит мероприятия (см. docs/API.md, docs/ARCHITECTURE.md).
"""
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/measures/', include('measures.urls')),
]
