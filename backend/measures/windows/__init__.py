"""
Мероприятие «Улучшение теплозащитных свойств оконных блоков».

Считает экономию тепловой энергии (Гкал/год) по теплопередаче и инфильтрации
для произвольного числа зданий, переводит её в денежный эквивалент и оценивает
экономику проекта (NPV/IRR/DPI/PBP/DPBP). Также строит .docx с разделом отчёта.
"""
from __future__ import annotations

from ..registry import MeasureDefinition, register_measure
from .docx_export import build_docx
from .engine import calculate
from .serializers import WindowsInputSerializer


def register() -> None:
    register_measure(
        MeasureDefinition(
            slug="windows",
            title="Улучшение теплозащитных свойств оконных блоков",
            input_serializer_cls=WindowsInputSerializer,
            calculate=calculate,
            build_docx=build_docx,
            docx_filename="windows_thermal_insulation.docx",
        )
    )


# Регистрируем при импорте пакета (apps.py делает импорт в ready()).
register()
