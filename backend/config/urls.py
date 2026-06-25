"""
Корневая маршрутизация Django-проекта «config».

Префикс /api/ отдаёт приложению measures, внутри которого зарегистрированы
энерго-аудит мероприятия (см. docs/API.md, docs/ARCHITECTURE.md).
"""
from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import SimpleRouter
from measures.views import TaskViewSet, GeoObjectViewSet, BuildingViewSet, WindowViewSet, DoorViewSet, BuildingSectionViewSet

router = SimpleRouter()
router.register(r'tasks', TaskViewSet, basename='task')
router.register(r'objects', GeoObjectViewSet, basename='geoobject')
router.register(r'buildings', BuildingViewSet, basename='building')
router.register(r'windows', WindowViewSet, basename='window')
router.register(r'doors', DoorViewSet, basename='door')
router.register(r'building-sections', BuildingSectionViewSet, basename='buildingsection')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('measures.auth_urls')),
    path('api/measures/', include('measures.urls')),
    path('api/', include(router.urls)),
]
