/**
 * Типы и константы мероприятия «Окна».
 *
 * Должны соответствовать DRF-сериализаторам бэкенда
 * (backend/measures/windows/serializers.py) и docs/MEASURES/windows.md.
 */

export type BuildingType = 'public' | 'industrial' | 'other'

export const BUILDING_TYPE_LABELS: Record<BuildingType, string> = {
  public: 'Общественное',
  industrial: 'Производственное',
  other: 'Прочее',
}

export const BUILDING_TYPE_PRESETS: Record<
  BuildingType,
  { period_days: number; t_outside_avg: number }
> = {
  public: { period_days: 204, t_outside_avg: -7.1 },
  industrial: { period_days: 158, t_outside_avg: -10.0 },
  other: { period_days: 180, t_outside_avg: -8.0 },
}

export type Building = {
  name: string
  type: BuildingType
  area_m2: number
  period_days: number
  t_outside_avg: number
  r_before: number
  r_after: number
  g_inf_before: number
  g_inf_after: number
}

export type SharedParams = {
  t_inside: number
  c_air: number
  k_factor: number
  gas_calorific_gcal_per_thousand_m3: number
  tariff_tg_per_m3: number
}

export type InvestmentItem = {
  name: string
  unit: string
  price_per_unit: number
}

export type FinanceParams = {
  discount_rate: number
  horizon_years: number
}

export type WindowsInput = {
  project_name: string
  buildings: Building[]
  shared: SharedParams
  investment_items: InvestmentItem[]
  finance: FinanceParams
}

export type BuildingResult = Building & {
  delta_t: number
  q_transmission_gcal: number
  q_inf_specific_before: number
  q_inf_specific_after: number
  q_infiltration_gcal: number
  q_total_gcal: number
  money_savings_tg: number
}

export type CalculateResponse = {
  buildings: BuildingResult[]
  totals: {
    area_m2: number
    q_total_gcal: number
    gas_thousand_m3: number
    money_savings_tg: number
  }
  investment: {
    items: Array<{
      name: string
      unit: string
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
    dpi: number
    pbp_years: number
    dpbp_years: number
    npv_by_year: Array<{ year: number; discounted_cf: number; cumulative_npv: number }>
  }
}
