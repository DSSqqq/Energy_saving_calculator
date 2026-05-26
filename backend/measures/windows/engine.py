"""
Расчёт мероприятия «Окна»: формулы из шаблона аудита.
Поддерживает множественные виды топлива (газ, электричество, уголь, дизель, центральное отопление).
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

    buildings_out: List[Dict[str, Any]] = []
    total_area = 0.0
    total_q_gcal = 0.0
    total_money_savings_tg = 0.0

    FUEL_UNITS = {
        "gas": "тыс. м³",
        "electricity": "тыс. кВт·ч",
        "coal": "тонн",
        "diesel": "тонн",
        "gcal": "Гкал",
    }

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

        # Individual building fuel and cost savings
        b_fuel_type = b.get("fuel_type", "gas")
        b_fuel_tariff = b.get("fuel_tariff", 0.0)
        b_fuel_calorific = b.get("fuel_calorific", 1.0)

        b_fuel_savings = q_total / b_fuel_calorific if b_fuel_calorific else 0.0
        multiplier = 1000.0 if b_fuel_type in ("gas", "electricity") else 1.0
        b_money_savings_tg = b_fuel_savings * multiplier * b_fuel_tariff
        total_money_savings_tg += b_money_savings_tg

        b_fuel_unit = FUEL_UNITS.get(b_fuel_type, "Гкал")

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
                "fuel_type": b_fuel_type,
                "fuel_tariff": b_fuel_tariff,
                "fuel_calorific": b_fuel_calorific,
                "delta_t": dt,
                "q1_kwh": q1_kwh,
                "q2_kwh": q2_kwh,
                "q_transmission_gcal": q_t,
                "q_inf_specific_before": q_inf_before,
                "q_inf_specific_after": q_inf_after,
                "q_infiltration_gcal": q_inf,
                "q_total_gcal": q_total,
                "fuel_savings": b_fuel_savings,
                "fuel_unit": b_fuel_unit,
                "money_savings_tg": b_money_savings_tg,
            }
        )

    # Determine totals
    first_fuel = buildings_out[0]["fuel_type"] if buildings_out else "gas"
    all_same_fuel = all(row["fuel_type"] == first_fuel for row in buildings_out)

    if all_same_fuel:
        fuel_savings = sum(row["fuel_savings"] for row in buildings_out)
        fuel_unit = FUEL_UNITS.get(first_fuel, "Гкал")
    else:
        fuel_savings = 0.0
        fuel_unit = "Смешанный"

    money_savings_tg = total_money_savings_tg

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
            "fuel_savings": fuel_savings,
            "fuel_unit": fuel_unit,
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
