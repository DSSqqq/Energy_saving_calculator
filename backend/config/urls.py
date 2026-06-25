"""
Корневая маршрутизация Django-проекта «config».

Префикс /api/ отдаёт приложению measures, внутри которого зарегистрированы
энерго-аудит мероприятия (см. docs/API.md, docs/ARCHITECTURE.md).
"""
from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import SimpleRouter
from measures.views import TaskViewSet, GeoObjectViewSet, BuildingViewSet

router = SimpleRouter()
router.register(r'tasks', TaskViewSet, basename='task')
router.register(r'objects', GeoObjectViewSet, basename='geoobject')
router.register(r'buildings', BuildingViewSet, basename='building')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('measures.auth_urls')),
    path('api/measures/', include('measures.urls')),
    path('api/', include(router.urls)),
]
