import type { ATPInput, Building } from './types'

export const emptyBuilding = (): Building => ({
  name: 'Новый объект',
  q_annual: 500,
  t_inside: 21.0,
  t_standby: 18.0,
  t_outside_avg: -6.8,
  t_outside_design: -32.8,
  period_days: 205,
  weekend_days: 41,
  day_hours: 10,
  fuel_tariff: 13289.77,
  investment: 3000000,
})

export const DEFAULT_ATP_INPUT: ATPInput = {
  project_name: 'Модернизация АТП с погодным регулированием',
  buildings: [
    {
      name: 'Момышулы, 23 (АБК)',
      q_annual: 886.6,
      t_inside: 21.0,
      t_standby: 18.0,
      t_outside_avg: -6.8,
      t_outside_design: -32.8,
      period_days: 205,
      weekend_days: 41,
      day_hours: 10,
      fuel_tariff: 13289.77,
      investment: 4000000,
    },
    {
      name: 'Момышулы, 23 (Второй объект)',
      q_annual: 222.596,
      t_inside: 21.0,
      t_standby: 18.0,
      t_outside_avg: -6.8,
      t_outside_design: -32.8,
      period_days: 205,
      weekend_days: 41,
      day_hours: 10,
      fuel_tariff: 13289.77,
      investment: 3500000,
    },
  ],
  shared: {},
  investment_items: [],
  finance: {
    discount_rate: 0.09,
    horizon_years: 10,
  },
}
