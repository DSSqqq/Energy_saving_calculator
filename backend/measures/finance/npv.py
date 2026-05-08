"""
Финансовые показатели для энерго-сберегающих мероприятий.

Все функции работают с упрощённой моделью: есть инвестиция в год 0
и постоянный годовой денежный поток (экономия) в годах 1..T.
Это типично для энерго-аудита; при необходимости легко расширить под
переменный CF (передавать список вместо скаляра).

Реализовано без внешних финансовых библиотек, чтобы минимизировать зависимости.
"""
from __future__ import annotations

from typing import List


def npv(*, rate: float, cash_flow: float, years: int, investment: float) -> float:
    """Чистая приведённая стоимость: -investment + Σ CF/(1+r)^t, t=1..years."""
    s = 0.0
    for t in range(1, years + 1):
        s += cash_flow / ((1.0 + rate) ** t)
    return s - investment


def dpi(*, rate: float, cash_flow: float, years: int, investment: float) -> float:
    """Дисконтированный индекс доходности: (NPV + investment) / investment."""
    if investment <= 0:
        return float("inf")
    pv_inflows = npv(rate=rate, cash_flow=cash_flow, years=years, investment=0.0)
    return pv_inflows / investment


def simple_payback_period(*, cash_flow: float, investment: float) -> float:
    """Простой срок окупаемости (лет). Бесконечность, если CF <= 0."""
    if cash_flow <= 0:
        return float("inf")
    return investment / cash_flow


def discounted_payback_period(
    *, rate: float, cash_flow: float, years: int, investment: float
) -> float:
    """
    Дисконтированный срок окупаемости с линейной интерполяцией внутри последнего года.
    Возвращает inf, если за горизонт проект не окупается.
    """
    cumulative = 0.0
    for t in range(1, years + 1):
        dcf = cash_flow / ((1.0 + rate) ** t)
        new_cum = cumulative + dcf
        if new_cum >= investment:
            # Линейная интерполяция внутри года t.
            need = investment - cumulative
            return (t - 1) + (need / dcf if dcf else 0.0)
        cumulative = new_cum
    return float("inf")


def irr(
    *,
    cash_flow: float,
    years: int,
    investment: float,
    low: float = -0.99,
    high: float = 10.0,
    tol: float = 1e-7,
    max_iter: int = 200,
) -> float | None:
    """
    Внутренняя норма доходности через бисекцию для постоянного CF.

    Возвращает None, если корня нет в интервале (например, экономия = 0).
    """
    if cash_flow <= 0:
        return None

    def f(r: float) -> float:
        return npv(rate=r, cash_flow=cash_flow, years=years, investment=investment)

    f_low = f(low)
    f_high = f(high)
    # Расширяем верхнюю границу, если NPV всё ещё положителен (очень доходный проект).
    iters = 0
    while f_high > 0 and iters < 50:
        high *= 2
        f_high = f(high)
        iters += 1
    if f_low * f_high > 0:
        return None
    for _ in range(max_iter):
        mid = (low + high) / 2.0
        f_mid = f(mid)
        if abs(f_mid) < tol:
            return mid
        if f_low * f_mid < 0:
            high = mid
            f_high = f_mid
        else:
            low = mid
            f_low = f_mid
    return (low + high) / 2.0


def cumulative_discounted_series(
    *, rate: float, cash_flow: float, years: int, investment: float
) -> List[dict]:
    """
    Ряд кумулятивной дисконтированной NPV по годам 0..years (для графика).

    Год 0 — `-investment` (отток); далее каждый год прибавляется дисконтированный CF.
    """
    series = [{"year": 0, "discounted_cf": -investment, "cumulative_npv": -investment}]
    cumulative = -investment
    for t in range(1, years + 1):
        dcf = cash_flow / ((1.0 + rate) ** t)
        cumulative += dcf
        series.append({"year": t, "discounted_cf": dcf, "cumulative_npv": cumulative})
    return series
