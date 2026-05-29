/**
 * Типы для мероприятия «АТП» (Автоматизированный тепловой пункт).
 */

export type Building = {
  name: string
  q_annual: number // Годовой расход Q баз, Гкал
  t_inside: number // tвн, °С
  t_standby: number // tд, °С
  t_outside_avg: number // tср.нар, °С
  t_outside_design: number // tнар, °С
  period_days: number // Nот, сут
  weekend_days: number // Nв.от, сут
  day_hours: number // день, ч
  fuel_tariff: number // Цтэ, тг/Гкал
  investment: number // Затраты, тг
}

export type SharedParams = Record<string, never>

export type InvestmentItem = {
  name: string
  quantity: number
  price_per_unit: number
}

export type FinanceParams = {
  discount_rate: number
  horizon_years: number
}

export type ATPInput = {
  project_name: string
  buildings: Building[]
  shared: SharedParams
  investment_items: InvestmentItem[]
  finance: FinanceParams
}

export type BuildingResult = Building & {
  work_days: number
  night_hours: number
  q0_max: number
  q_p: number
  q_v: number
  q_ob: number
  q_new: number
  delta_q: number
  money_savings_tg: number
  pbp_years: number | null
}

export type CalculateResponse = {
  buildings: BuildingResult[]
  totals: {
    q_base_gcal: number
    q_new_gcal: number
    q_total_gcal: number // Общая сэкономленная тепловая энергия, Гкал
    fuel_savings: number
    fuel_unit: string
    money_savings_tg: number
    investment_total_tg: number
  }
  investment: {
    items: Array<{
      name: string
      price_per_unit: number
      quantity: number
      cost_tg: number
    }>
    total_tg: number
  }
  finance: {
    discount_rate: number
    horizon_years: number
    annual_cash_flow_tg: number
    npv_tg: number
    irr: number | null
    dpi: number | null
    pbp_years: number | null
    dpbp_years: number | null
    npv_by_year: Array<{ year: number; discounted_cf: number; cumulative_npv: number }>
  }
}
