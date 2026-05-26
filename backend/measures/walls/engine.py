from __future__ import annotations

from backend.measures.finance.metrics import (
    calculate_dpbp,
    calculate_dpi,
    calculate_irr,
    calculate_npv,
    calculate_pbp,
)


def calculate(data: dict) -> dict:
    """
    Основной движок расчёта мероприятия «Стены».
    Без привязки к HTTP/Request/Response — чистая функция.
    """
    shared = data["shared"]
    finance = data["finance"]
    buildings = data["buildings"]
    investment_items = data.get("investment_items", [])

    tariff = shared["tariff_tg_per_m3"]
    calorific = shared["gas_calorific_gcal_per_thousand_m3"]
    price_per_gcal = tariff * 1000 / calorific

    # 1. Расчёт стоимости (инвестиции)
    total_cost = sum(item["quantity"] * item["price_per_unit"] for item in investment_items)

    # 2. Расчёт по зданиям
    results_buildings = []
    total_q_before_kwh = 0.0
    total_q_after_kwh = 0.0

    for b in buildings:
        # Для стен считаем только трансмиссионные потери:
        # Q = S / R * (t_вн - t_н) * 24 * N_от * 10^-3, кВт·ч

        dt = b["t_inside"] - b["t_outside_avg"]
        factor = b["area_m2"] * dt * 24 * b["period_days"] * 0.001

        q_before = factor / b["r_before"]
        q_after = factor / b["r_after"]

        total_q_before_kwh += q_before
        total_q_after_kwh += q_after

        delta_q_kwh = q_before - q_after
        delta_q_gcal = delta_q_kwh * 0.000860421
        savings_tg = delta_q_gcal * price_per_gcal

        results_buildings.append({
            "name": b["name"],
            "type": b["type"],
            "q_before_kwh": q_before,
            "q_after_kwh": q_after,
            "delta_q_kwh": delta_q_kwh,
            "delta_q_gcal": delta_q_gcal,
            "savings_tg": savings_tg,
        })

    # 3. Агрегация по всем зданиям
    total_delta_q_kwh = total_q_before_kwh - total_q_after_kwh
    total_delta_q_gcal = total_delta_q_kwh * 0.000860421
    total_savings_tg = total_delta_q_gcal * price_per_gcal

    # 4. Финансовые метрики
    yearly_cash_flows = [total_savings_tg] * finance["horizon_years"]
    npv = calculate_npv(total_cost, yearly_cash_flows, finance["discount_rate"])
    irr = calculate_irr(total_cost, yearly_cash_flows)
    dpi = calculate_dpi(total_cost, yearly_cash_flows, finance["discount_rate"])
    pbp = calculate_pbp(total_cost, yearly_cash_flows)
    dpbp = calculate_dpbp(total_cost, yearly_cash_flows, finance["discount_rate"])

    # 5. Сборка результата
    return {
        "project_name": data["project_name"],
        "summary": {
            "total_q_before_kwh": total_q_before_kwh,
            "total_q_after_kwh": total_q_after_kwh,
            "total_delta_q_kwh": total_delta_q_kwh,
            "total_delta_q_gcal": total_delta_q_gcal,
            "total_cost_tg": total_cost,
            "total_savings_tg": total_savings_tg,
            "price_per_gcal": price_per_gcal,
        },
        "financials": {
            "npv": npv,
            "irr": irr,
            "dpi": dpi,
            "pbp": pbp,
            "dpbp": dpbp,
        },
        "buildings": results_buildings,
        "input": data,  # полезно для рендеринга docx
    }
