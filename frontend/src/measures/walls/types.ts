/**
 * Типы и константы мероприятия «Стены».
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
  t_inside: number
  t_outside_avg: number
  r_before: number
  r_after: number
}

export type SharedParams = {
  gas_calorific_gcal_per_thousand_m3: number
  tariff_tg_per_m3: number
}

export type InvestmentItem = {
  name: string
  quantity: number
  price_per_unit: number
}

export type FinanceParams = {
  discount_rate: number
  horizon_years: number
}

export type WallsInput = {
  project_name: string
  buildings: Building[]
  shared: SharedParams
  investment_items: InvestmentItem[]
  finance: FinanceParams
}

export type BuildingResult = {
  name: string
  type: BuildingType
  q_before_kwh: number
  q_after_kwh: number
  delta_q_kwh: number
  delta_q_gcal: number
  savings_tg: number
}

export type CalculateResponse = {
  project_name: string
  summary: {
    total_q_before_kwh: number
    total_q_after_kwh: number
    total_delta_q_kwh: number
    total_delta_q_gcal: number
    total_cost_tg: number
    total_savings_tg: number
    price_per_gcal: number
  }
  financials: {
    npv: number
    irr: number | null
    dpi: number
    pbp: number
    dpbp: number
  }
  buildings: BuildingResult[]
  input: WallsInput
}
