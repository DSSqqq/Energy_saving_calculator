"""
Расчёт мероприятия «Окна»: формулы из шаблона аудита.

Все функции — чистые (не знают про Django/HTTP), легко покрываются юнит-тестами.

Обозначения:
- L        — длина проблемных участков, м.п.
- z        — продолжительность отопительного периода, сут.
- t_in     — температура внутри помещения, °C
- t_out    — средняя температура наружного воздуха за период, °C
- R_до/R_после — сопротивление теплопередаче, м.п.·°C/Вт
- g_inf    — коэффициент воздухопроницаемости, кг/(м.п.·ч)
- c        — удельная теплоёмкость воздуха, ккал/(кг·°С)
- k        — коэф. влияния встречного теплового потока

Формулы (в Гкал/год):
- ΔT      = t_in − t_out
- Q_т     = L · ΔT · z · 24 · (1/R_до − 1/R_после) / 10⁶
- q_inf   = 0,28 · c · g_inf · k · ΔT          [ккал/(м.п.·ч)]
- Q_inf   = (q_до − q_после) · L · z · 24 / 10⁶

Перевод в природный газ: V_газа [тыс. м³] = ΣQ / a, где a — теплотворная (Гкал/тыс.м³).
Деньги: CF = V_газа · 1000 · тариф [тг/м³].
"""
from __future__ import annotations

from typing import Any, Dict, List

from ..finance.npv import (
    cumulative_discounted_series,
    discounted_payback_period,
    dpi,
    irr,
    npv,
    simple_payback_period,
)


# --- Per-building helpers ------------------------------------------------------

def _q_kwh(*, area, dt, period_days, r) -> float:
    return (area / r) * dt * 0.001 * period_days * 24.0


def _q_transmission_gcal(*, q1_kwh, q2_kwh) -> float:
    return (q1_kwh - q2_kwh) * 860.421 / 1_000_000.0


def _q_specific_inf_kcal_per_m2_h(*, c_air, g_inf, k_factor, dt) -> float:
    # 0,28 — переводной коэффициент в ккал/(м.п.·ч) для удельных теплопотерь на инфильтрацию.
    return 0.28 * c_air * g_inf * k_factor * dt


def _q_infiltration_gcal(*, q_before, q_after, area, period_days) -> float:
    return (q_before - q_after) * area * period_days * 24.0 / 1_000_000.0


# --- Main entry point ---------------------------------------------------------

def calculate(payload: Dict[str, Any]) -> Dict[str, Any]:
    shared = payload["shared"]
    finance = payload["finance"]
    c_air = shared["c_air"]
    k_factor = shared["k_factor"]
    a_gas = shared["gas_calorific_gcal_per_thousand_m3"]
    tariff = shared["tariff_tg_per_m3"]

    buildings_out: List[Dict[str, Any]] = []
    total_area = 0.0
    total_q_gcal = 0.0
    for b in payload["buildings"]:
        t_in = b["t_inside"]
        dt = t_in - b["t_outside_avg"]
        q1_kwh = _q_kwh(
            area=b["area_m2"], dt=dt, period_days=b["period_days"], r=b["r_before"]
        )
        q2_kwh = _q_kwh(
            area=b["area_m2"], dt=dt, period_days=b["period_days"], r=b["r_after"]
        )
        q_t = _q_transmission_gcal(q1_kwh=q1_kwh, q2_kwh=q2_kwh)
        q_inf_before = _q_specific_inf_kcal_per_m2_h(
            c_air=c_air, g_inf=b["g_inf_before"], k_factor=k_factor, dt=dt
        )
        q_inf_after = _q_specific_inf_kcal_per_m2_h(
            c_air=c_air, g_inf=b["g_inf_after"], k_factor=k_factor, dt=dt
        )
        q_inf = _q_infiltration_gcal(
            q_before=q_inf_before,
            q_after=q_inf_after,
            area=b["area_m2"],
            period_days=b["period_days"],
        )
        q_total = q_t + q_inf
        total_area += b["area_m2"]
        total_q_gcal += q_total
        buildings_out.append(
            {
                "name": b["name"],
                "type": b["type"],
                "area_m2": b["area_m2"],
                "period_days": b["period_days"],
                "t_outside_avg": b["t_outside_avg"],
                "t_inside": b["t_inside"],
                "r_before": b["r_before"],
                "r_after": b["r_after"],
                "g_inf_before": b["g_inf_before"],
                "g_inf_after": b["g_inf_after"],
                "delta_t": dt,
                "q1_kwh": q1_kwh,
                "q2_kwh": q2_kwh,
                "q_transmission_gcal": q_t,
                "q_inf_specific_before": q_inf_before,
                "q_inf_specific_after": q_inf_after,
                "q_infiltration_gcal": q_inf,
                "q_total_gcal": q_total,
            }
        )

    gas_thousand_m3 = total_q_gcal / a_gas if a_gas else 0.0
    money_savings_tg = gas_thousand_m3 * 1000.0 * tariff

    # Денежная экономия по зданиям пропорционально доле энергии.
    for row in buildings_out:
        share = row["q_total_gcal"] / total_q_gcal if total_q_gcal else 0.0
        row["money_savings_tg"] = money_savings_tg * share

    # Инвестиции: каждая строка сметы — цена за единицу × количество (м.п.).
    investment_rows: List[Dict[str, Any]] = []
    investment_total = 0.0
    for item in payload["investment_items"]:
        quantity = item["quantity"]
        cost = item["price_per_unit"] * quantity
        investment_total += cost
        investment_rows.append(
            {
                "name": item["name"],
                "quantity": quantity,
                "price_per_unit": item["price_per_unit"],
                "cost_tg": cost,
            }
        )

    # Финансовая модель: постоянный денежный поток = годовая экономия в тенге.
    horizon = int(finance["horizon_years"])
    rate = float(finance["discount_rate"])
    cash_flow = money_savings_tg
    project_npv = npv(rate=rate, cash_flow=cash_flow, years=horizon, investment=investment_total)
    project_irr = irr(cash_flow=cash_flow, years=horizon, investment=investment_total)
    project_dpi = dpi(rate=rate, cash_flow=cash_flow, years=horizon, investment=investment_total)
    project_pbp = simple_payback_period(cash_flow=cash_flow, investment=investment_total)
    project_dpbp = discounted_payback_period(
        rate=rate, cash_flow=cash_flow, years=horizon, investment=investment_total
    )
    npv_series = cumulative_discounted_series(
        rate=rate, cash_flow=cash_flow, years=horizon, investment=investment_total
    )

    # Суммарное количество м.п. (для таблицы 3.3.6.4).
    total_quantity_lm = sum(r["quantity"] for r in investment_rows)

    return {
        "buildings": buildings_out,
        "totals": {
            "area_m2": total_area,
            "quantity_lm": total_quantity_lm,
            "q_total_gcal": total_q_gcal,
            "gas_thousand_m3": gas_thousand_m3,
            "money_savings_tg": money_savings_tg,
        },
        "investment": {
            "items": investment_rows,
            "total_tg": investment_total,
        },
        "finance": {
            "discount_rate": rate,
            "horizon_years": horizon,
            "annual_cash_flow_tg": cash_flow,
            "npv_tg": project_npv,
            "irr": project_irr,
            "dpi": project_dpi,
            "pbp_years": project_pbp,
            "dpbp_years": project_dpbp,
            "npv_by_year": npv_series,
        },
    }
