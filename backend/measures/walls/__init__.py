"""
Мероприятие «Улучшение теплозащитных свойств стен».

Считает экономию тепловой энергии (Гкал/год) по теплопередаче через стены
для произвольного числа зданий, переводит её в денежный эквивалент и оценивает
экономику проекта (NPV/IRR/DPI/PBP/DPBP). Также строит .docx с разделом отчёта.

Отличие от «Окна»: нет инфильтрации — только теплопередача через ограждающую конструкцию.
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
