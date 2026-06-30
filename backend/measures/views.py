"""
Generic-вьюхи для всех мероприятий.

Контракт:
- `GET  /api/measures/`                  — список зарегистрированных мероприятий.
- `POST /api/measures/<slug>/calculate/` — JSON с расчётом по slug мероприятия.
- `POST /api/measures/<slug>/export/`    — .docx со сгенерированным разделом.

Тело запроса валидируется сериализатором конкретного мероприятия.
"""
from __future__ import annotations

from django.http import HttpResponse
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from .registry import get_measure, list_measures
from .models import Task, GeoObject, Building, Window, Door, BuildingSection
from .serializers import TaskSerializer, GeoObjectSerializer, BuildingSerializer, WindowSerializer, DoorSerializer, BuildingSectionSerializer
from rest_framework.pagination import PageNumberPagination
from rest_framework.exceptions import PermissionDenied


class MeasuresListView(APIView):
    """Каталог мероприятий — для интроспекции UI и интеграций."""

    def get(self, request):
        return Response(
            [{"slug": m.slug, "title": m.title} for m in list_measures()],
            status=status.HTTP_200_OK,
        )


def _resolve_or_404(slug: str):
    measure = get_measure(slug)
    if measure is None:
        return None, Response(
            {"detail": f"Unknown measure: {slug}"}, status=status.HTTP_404_NOT_FOUND
        )
    return measure, None


class MeasureCalculateView(APIView):
    """Возвращает результат расчёта в JSON."""

    def post(self, request, slug: str):
        measure, err = _resolve_or_404(slug)
        if err is not None:
            return err
        ser = measure.input_serializer_cls(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        results = measure.calculate(ser.validated_data)
        return Response(results, status=status.HTTP_200_OK)


class MeasureExportDocxView(APIView):
    """Возвращает готовый .docx как attachment."""

    def post(self, request, slug: str):
        measure, err = _resolve_or_404(slug)
        if err is not None:
            return err
        ser = measure.input_serializer_cls(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        payload = ser.validated_data
        results = measure.calculate(payload)
        docx_bytes = measure.build_docx(payload, results)
        response = HttpResponse(
            docx_bytes,
            content_type=(
                "application/vnd.openxmlformats-officedocument."
                "wordprocessingml.document"
            ),
        )
        response["Content-Disposition"] = (
            f'attachment; filename="{measure.docx_filename}"'
        )
        return response


class TaskViewSet(ModelViewSet):
    """ViewSet для полноценного управления задачами (CRUD)."""

    serializer_class = TaskSerializer

    def get_queryset(self):
        return Task.objects.filter(user=self.request.user).order_by("id")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class GeoObjectPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class BuildingPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class GeoObjectViewSet(ModelViewSet):
    serializer_class = GeoObjectSerializer
    pagination_class = GeoObjectPagination

    def get_queryset(self):
        return GeoObject.objects.filter(user=self.request.user).order_by('-id')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class BuildingViewSet(ModelViewSet):
    serializer_class = BuildingSerializer
    pagination_class = BuildingPagination

    def get_queryset(self):
        object_id = self.request.query_params.get('object')
        queryset = Building.objects.filter(object__user=self.request.user)
        if object_id:
            queryset = queryset.filter(object_id=object_id)
        return queryset.order_by('id')

    def perform_create(self, serializer):
        object_val = serializer.validated_data.get('object')
        if object_val.user != self.request.user:
            raise PermissionDenied("У вас нет прав для добавления здания в этот объект.")
        serializer.save()

class WindowViewSet(ModelViewSet):
    serializer_class = WindowSerializer
    pagination_class = None

    def get_queryset(self):
        building_id = self.request.query_params.get('building')
        queryset = Window.objects.filter(building__object__user=self.request.user)
        if building_id:
            queryset = queryset.filter(building_id=building_id)
        return queryset.order_by('id')

    def perform_create(self, serializer):
        building = serializer.validated_data.get('building')
        if building.object.user != self.request.user:
            raise PermissionDenied("У вас нет прав для добавления окна в это здание.")
        serializer.save()

class DoorViewSet(ModelViewSet):
    serializer_class = DoorSerializer
    pagination_class = None

    def get_queryset(self):
        building_id = self.request.query_params.get('building')
        queryset = Door.objects.filter(building__object__user=self.request.user)
        if building_id:
            queryset = queryset.filter(building_id=building_id)
        return queryset.order_by('id')

    def perform_create(self, serializer):
        building = serializer.validated_data.get('building')
        if building.object.user != self.request.user:
            raise PermissionDenied("У вас нет прав для добавления двери в это здание.")
        serializer.save()

class BuildingSectionViewSet(ModelViewSet):
    serializer_class = BuildingSectionSerializer
    pagination_class = None

    def get_queryset(self):
        building_id = self.request.query_params.get('building')
        queryset = BuildingSection.objects.filter(building__object__user=self.request.user)
        if building_id:
            queryset = queryset.filter(building_id=building_id)
        return queryset.order_by('id')

    def perform_create(self, serializer):
        building = serializer.validated_data.get('building')
        if building.object.user != self.request.user:
            raise PermissionDenied("У вас нет прав для добавления секции в это здание.")
        serializer.save()

    def perform_update(self, serializer):
        building = serializer.instance.building
        if building.object.user != self.request.user:
            raise PermissionDenied("У вас нет прав для изменения этой секции.")
        serializer.save()
