"""
Мероприятие «Улучшение теплозащитных свойств стен».
"""
from __future__ import annotations

from ..registry import MeasureDefinition, register_measure
from .docx_export import build_docx
from .engine import calculate
from .serializers import WallsInputSerializer


def register() -> None:
    register_measure(
        MeasureDefinition(
            slug="walls",
            title="Улучшение теплозащитных свойств стен",
            input_serializer_cls=WallsInputSerializer,
            calculate=calculate,
            build_docx=build_docx,
            docx_filename="walls_thermal_insulation.docx",
        )
    )


# Регистрируем при импорте пакета (apps.py делает импорт в ready()).
register()
