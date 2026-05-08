"""
Локализованное форматирование чисел для русской документации.

Соглашения шаблона: разделитель тысяч — неразрывный пробел, дробной части — запятая.
Отдельная функция для денег: больше десятичных в тенге не нужно (округляем до целых).
"""
from __future__ import annotations


NBSP = "\u00a0"


def fmt_num(value: float, decimals: int = 2) -> str:
    if value is None:
        return "—"
    formatted = f"{value:,.{decimals}f}"
    integer_part, _, frac_part = formatted.partition(".")
    integer_part = integer_part.replace(",", NBSP)
    return f"{integer_part},{frac_part}" if frac_part else integer_part


def fmt_money(value: float) -> str:
    return fmt_num(value, 0)


def fmt_percent(value: float, decimals: int = 2) -> str:
    if value is None:
        return "—"
    return f"{fmt_num(value * 100.0, decimals)}%"


def fmt_years(value: float) -> str:
    if value is None or value == float("inf"):
        return "не окупается"
    return fmt_num(value, 2)
