module.exports = ({ iana_timezone: shop_timezone }, order) => {
  const {
    id: order_id,
    created_at: order_created_at,
    cancelled_at: order_cancelled_at,
    updated_at: order_updated_at,
    shipping_lines,
    refunds,
    line_items,
    currency,
  } = order;

  // Calculate line item refunds and order adjustments.

  const { refundLineItems, refundOrderAdjustments } = refunds.reduce(
    (acc, { refund_line_items, order_adjustments}) => {
      refund_line_items.forEach(({ line_item_id, quantity, subtotal, total_tax }) => {
        if (!acc.refundLineItems[line_item_id]) {
          acc.refundLineItems[line_item_id] = { quantity: 0, subtotal: 0, total_tax: 0 };
        }
        acc.refundLineItems[line_item_id].quantity += quantity;
        acc.refundLineItems[line_item_id].subtotal += subtotal;
        acc.refundLineItems[line_item_id].total_tax += total_tax;
      });

      order_adjustments.forEach(({ kind, amount }) => {
        if (!acc.refundOrderAdjustments[kind]) {
          acc.refundOrderAdjustments[kind] = 0;
        }
        acc.refundOrderAdjustments[kind] += parseFloat(amount);
      });

      return acc;
    },
    { refundLineItems: {}, refundOrderAdjustments: {}}
  );

  // Ignored in API query.
  // if (refundOrderAdjustments.refund_discrepancy) return [];

  // Calculate line items.

  let { order_item_quantity, lines } = line_items.reduce(
    (
      acc,
      { id, variant_id, product_id, quantity, price, discount_allocations, tax_lines }
    ) => {
      const {
        quantity: refund_quantity,
        subtotal: refund_subtotal,
        total_tax: refund_total_tax
      } = refundLineItems[id] || { quantity: 0, subtotal: 0, total_tax: 0 };

      acc.order_item_quantity += quantity;

      const discountAllocations = discount_allocations.reduce(
        (acc, { amount }) => acc + parseFloat(amount),
        0
      );

      const taxLines = tax_lines.reduce(
        (acc, { price }) => acc + parseFloat(price),
        0
      );

      acc.lines.push({
        order_id: order_id ? `${order_id}` : null,
        created_at: buildDateField(shop_timezone, order_created_at),
        cancelled_at: buildDateField(shop_timezone, order_cancelled_at),
        updated_at: buildDateField(shop_timezone, order_updated_at),
        variant_id: variant_id ? `${variant_id}` : null,
        product_id: product_id ? `${product_id}` : null,
        currency,
        detail: {
          line_item_quantity: quantity,
          line_item_price: parseFloat(price),
          line_item_tax_lines: taxLines,
          line_item_discount_allocations: discountAllocations,
          line_item_refund_quantity: refund_quantity,
          line_item_refund_subtotal: refund_subtotal,
          line_item_refund_total_tax: refund_total_tax,
        }
      });

      return acc;
    },
    { order_item_quantity: 0, lines: [] }
  );

  // Calculate order shipping cost

  const order_shipping_lines_price = shipping_lines.reduce(
    (acc, { price }) => acc + parseFloat(price),
    0
  );

  const order_shipping_final = order_shipping_lines_price
    + (refundOrderAdjustments.shipping_refund || 0)
  ;

  // Calculate item lines FINISH.

  lines = lines.map((line) => {
    const {
      detail: {
        line_item_quantity,
        line_item_price,
        line_item_tax_lines,
        line_item_discount_allocations,
        line_item_refund_quantity,
        line_item_refund_subtotal,
        line_item_refund_total_tax,
      }
    } = line;

    const line_item_ratio = line_item_quantity / order_item_quantity;

    const line_item_shipping = order_shipping_final * line_item_ratio;

    const line_item_refund_discrepancy = Math.abs(
      (refundOrderAdjustments.refund_discrepancy || 0) * line_item_ratio
    );

    const line_item_refund_total =
      (line_item_refund_subtotal - line_item_refund_total_tax)
      + line_item_refund_discrepancy;

    let line_item_turnover =
      (line_item_price - line_item_tax_lines) * line_item_quantity
      - line_item_discount_allocations
      + line_item_shipping
      - line_item_refund_total
    ;

    line_item_turnover = Math.round(line_item_turnover * 100) / 100;

    // const real_shipping_cost = line_item_shipping_net
    // ^ Should be the real shipping cost because may vary from reality.

    // const line_item_profit = line_item_turnover
    //   - refund_subtotal
    //   - real_shipping_cost
      // - refund_discrepancy
      // - inventory cost
    ;

    // const profit_per_unit = line_item_profit / line_item_quantity;

    return {
      ...line,
      turnover: line_item_turnover,
      quantity: line_item_quantity,
      // profit: line_item_profit,
      // profit_per_unit,
      detail: {
        ...line.detail,
        line_item_shipping,
        line_item_refund_discrepancy,
        order_item_quantity,
        order_shipping_lines_price,
        order_shipping_final,
        ...refundOrderAdjustments,
      }
    };
  });

  return lines;
};

const buildDateField = (shop_timezone, dateString) =>
  !dateString
    ? null
    : { date: new Date(dateString), timezone: shop_timezone };
