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
from .models import Task
from .serializers import TaskSerializer


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

    queryset = Task.objects.all().order_by("id")
    serializer_class = TaskSerializer
