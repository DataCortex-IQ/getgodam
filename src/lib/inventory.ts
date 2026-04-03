import { supabase } from './supabase'

export async function getInventory() {
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      type,
      quantity,
      rate,
      taxable_amount,
      item_id,
      items (id, name, default_unit)
    `)

  if (error) throw error

  const inventory: Record<string, {
    item_id: string
    name: string
    unit: string
    qty: number
    cost_value: number
    total_bought: number
    buy_count: number
  }> = {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data.forEach((tx: any) => {
    const key = tx.item_id
    if (!inventory[key]) {
      inventory[key] = {
        item_id: key,
        name: tx.items.name,
        unit: tx.items.default_unit,
        qty: 0,
        cost_value: 0,
        total_bought: 0,
        buy_count: 0
      }
    }
    if (tx.type === 'purchase') {
      inventory[key].qty += tx.quantity
      inventory[key].cost_value += tx.taxable_amount
      inventory[key].total_bought += tx.taxable_amount
      inventory[key].buy_count += tx.quantity
    } else {
      inventory[key].qty -= tx.quantity
    }
  })

  return Object.values(inventory).map(item => ({
    ...item,
    avg_rate: item.buy_count > 0
      ? Math.round(item.total_bought / item.buy_count)
      : 0,
    status: item.qty <= 0
      ? 'empty'
      : item.qty < 20
      ? 'low'
      : 'good'
  }))
}
