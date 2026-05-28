"""
Корневая маршрутизация Django-проекта «config».

Префикс /api/ отдаёт приложению measures, внутри которого зарегистрированы
энерго-аудит мероприятия (см. docs/API.md, docs/ARCHITECTURE.md).
"""
from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import SimpleRouter
from measures.views import TaskViewSet

router = SimpleRouter()
router.register(r'tasks', TaskViewSet, basename='task')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/measures/', include('measures.urls')),
    path('api/', include(router.urls)),
]
