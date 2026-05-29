"""
Расчёт мероприятия «АТП»: организация (модернизация) автоматизированного теплового пункта.
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


def calculate(payload: Dict[str, Any]) -> Dict[str, Any]:
    finance = payload.get("finance", {})
    horizon = int(finance.get("horizon_years", 10))
    rate = float(finance.get("discount_rate", 0.09))

    buildings_out: List[Dict[str, Any]] = []
    total_q_base = 0.0
    total_q_new = 0.0
    total_delta_q = 0.0
    total_money_savings = 0.0
    total_investment_from_buildings = 0.0

    for b in payload["buildings"]:
        q_base = b["q_annual"]
        t_inside = b["t_inside"]
        t_standby = b["t_standby"]
        t_outside_avg = b["t_outside_avg"]
        t_outside_design = b["t_outside_design"]
        period_days = b["period_days"]
        weekend_days = b["weekend_days"]
        day_hours = b["day_hours"]
        tariff = b["fuel_tariff"]
        b_invest = b["investment"]

        # Math logic:
        # Nр.от = Nот - Nв.от
        work_days = period_days - weekend_days
        # ночь = 24 - день
        night_hours = 24.0 - day_hours

        # q0_max = Q / (Nот * 24 * (tвн - tср.нар) / (tвн - tнар))
        # Сперва коэффициент соотношения температур для нормального режима:
        temp_ratio_norm = (t_inside - t_outside_avg) / (t_inside - t_outside_design) if (t_inside - t_outside_design) else 1.0
        q0_max = q_base / (period_days * 24.0 * temp_ratio_norm) if (period_days * 24.0 * temp_ratio_norm) else 0.0

        # Qр = Nр.от * день * ((tвн - tср.нар) / (tвн - tнар)) * q0_max
        q_p = work_days * day_hours * temp_ratio_norm * q0_max

        # Qв = (Nр.от * ночь + Nв.от * 24) * ((tд - tср.нар) / (tд - tнар)) * q0_max
        temp_ratio_standby = (t_standby - t_outside_avg) / (t_standby - t_outside_design) if (t_standby - t_outside_design) else 1.0
        q_v = (work_days * night_hours + weekend_days * 24.0) * temp_ratio_standby * q0_max

        # Qоб = Qр + Qв
        q_ob = q_p + q_v

        # Q_new = Qоб * 0.91 (учитывая снижение теплопотребления на 9% за счет устранения перетопов)
        q_new = q_ob * 0.91

        # ΔQ = Q - Q_new
        delta_q = q_base - q_new

        # Э_money = ΔQ * Tariff
        b_money_savings = delta_q * tariff

        # Простой срок окупаемости здания
        b_pbp = b_invest / b_money_savings if b_money_savings > 0 else None

        total_q_base += q_base
        total_q_new += q_new
        total_delta_q += delta_q
        total_money_savings += b_money_savings
        total_investment_from_buildings += b_invest

        buildings_out.append(
            {
                "name": b["name"],
                "q_annual": q_base,
                "t_inside": t_inside,
                "t_standby": t_standby,
                "t_outside_avg": t_outside_avg,
                "t_outside_design": t_outside_design,
                "period_days": period_days,
                "weekend_days": weekend_days,
                "day_hours": day_hours,
                "work_days": work_days,
                "night_hours": night_hours,
                "fuel_tariff": tariff,
                "investment": b_invest,
                "q0_max": q0_max,
                "q_p": q_p,
                "q_v": q_v,
                "q_ob": q_ob,
                "q_new": q_new,
                "delta_q": delta_q,
                "money_savings_tg": b_money_savings,
                "pbp_years": b_pbp,
                "temp_ratio_norm": temp_ratio_norm,
                "temp_ratio_standby": temp_ratio_standby,
            }
        )

    # Инвестиции: если во входных параметрах передан список сметных строк, берем его.
    # Иначе автоматически строим смету из инвестиций по зданиям.
    investment_rows: List[Dict[str, Any]] = []
    investment_total = 0.0

    input_items = payload.get("investment_items", [])
    if input_items:
        for item in input_items:
            qty = item["quantity"]
            cost = item["price_per_unit"] * qty
            investment_total += cost
            investment_rows.append(
                {
                    "name": item["name"],
                    "quantity": qty,
                    "price_per_unit": item["price_per_unit"],
                    "cost_tg": cost,
                }
            )
    else:
        # Автозаполнение сметы по зданиям
        for b_out in buildings_out:
            investment_total += b_out["investment"]
            investment_rows.append(
                {
                    "name": f"Модернизация и наладка АТП — {b_out['name']}",
                    "quantity": 1.0,
                    "price_per_unit": b_out["investment"],
                    "cost_tg": b_out["investment"],
                }
            )

    # Финансовая модель проекта в целом
    cash_flow = total_money_savings
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

    return {
        "buildings": buildings_out,
        "totals": {
            "q_base_gcal": total_q_base,
            "q_new_gcal": total_q_new,
            "q_total_gcal": total_delta_q,  # Общая сэкономленная энергия
            "fuel_savings": total_delta_q,  # Сэкономленная тепловая энергия в натуре
            "fuel_unit": "Гкал",
            "money_savings_tg": total_money_savings,
            "investment_total_tg": investment_total,
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
