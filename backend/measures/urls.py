"""URL приложения measures; подключается в config.urls с префиксом /api/measures/."""
from django.urls import path

from .views import MeasureCalculateView, MeasureExportDocxView, MeasuresListView

urlpatterns = [
    path("", MeasuresListView.as_view(), name="measures-list"),
    path("<slug:slug>/calculate/", MeasureCalculateView.as_view(), name="measure-calculate"),
    path("<slug:slug>/export/", MeasureExportDocxView.as_view(), name="measure-export"),
]
