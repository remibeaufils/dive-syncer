export default ({ iana_timezone: shop_timezone }: any, realShippingLinesCost: any, order: any): any => {
    const {
        id: order_id,
        order_number,
        financial_status,
        customer,
        created_at: order_created_at,
        cancelled_at: order_cancelled_at,
        updated_at: order_updated_at,
        shipping_lines,
        refunds,
        line_items,
        currency,
    } = order;

    // console.log(order_id);

    // Calculate line item refunds and order adjustments.

    const { refundLineItems, refundOrderAdjustments } = refunds.reduce(
        (acc, { refund_line_items, order_adjustments }) => {
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
        { refundLineItems: {}, refundOrderAdjustments: {} },
    );

    // Ignored in API query.
    // if (refundOrderAdjustments.refund_discrepancy) return [];

    // Calculate line items.

    const { order_item_quantity, lines } = line_items.reduce(
        (acc, { id, name, variant_id, product_id, quantity, price, discount_allocations, tax_lines }) => {
            const {
                quantity: refund_quantity,
                subtotal: refund_subtotal,
                total_tax: refund_total_tax,
            } = refundLineItems[id] || { quantity: 0, subtotal: 0, total_tax: 0 };

            acc.order_item_quantity += quantity;

            const discountAllocations = discount_allocations.reduce((acc, { amount }) => acc + parseFloat(amount), 0);

            const taxLines = tax_lines.reduce((acc, { price }) => acc + parseFloat(price), 0);

            acc.lines.push({
                order_id: order_id ? `${order_id}` : null,
                order_number,
                financial_status,
                customer: customer
                    ? {
                          id: customer.id,
                          first_name: customer.first_name,
                          last_name: customer.last_name,
                      }
                    : null,
                shipping_lines: shipping_lines.map(({ code }) => code).join(','),
                created_at: buildDateField(shop_timezone, order_created_at),
                cancelled_at: buildDateField(shop_timezone, order_cancelled_at),
                updated_at: buildDateField(shop_timezone, order_updated_at),
                variant_id: variant_id ? `${variant_id}` : null,
                product_id: product_id ? `${product_id}` : null,
                name,
                currency,
                detail: {
                    line_item_quantity: quantity,
                    line_item_price: parseFloat(price),
                    line_item_tax_lines: taxLines,
                    line_item_discount_allocations: discountAllocations,
                    line_item_refund_quantity: refund_quantity,
                    line_item_refund_subtotal: refund_subtotal,
                    line_item_refund_total_tax: refund_total_tax,
                },
            });

            return acc;
        },
        { order_item_quantity: 0, lines: [] },
    );

    // Calculate order shipping cost

    // const order_shipping_lines_price = shipping_lines.reduce((acc, { price }) => acc + parseFloat(price), 0);

    const { order_shipping_lines_price, real_shipping_cost } = shipping_lines.reduce(
        ({ order_shipping_lines_price, real_shipping_cost }, { code, price }) => ({
            order_shipping_lines_price: order_shipping_lines_price + parseFloat(price),
            real_shipping_cost: real_shipping_cost + (realShippingLinesCost[code] || 0),
        }),
        { order_shipping_lines_price: 0, real_shipping_cost: 0 },
    );

    const order_shipping_final = order_shipping_lines_price + (refundOrderAdjustments.shipping_refund || 0);
    // Calculate item lines FINISH.

    const result = lines.map((line) => {
        const {
            detail: {
                line_item_quantity,
                line_item_price,
                line_item_tax_lines,
                line_item_discount_allocations,
                line_item_refund_quantity,
                line_item_refund_subtotal,
                line_item_refund_total_tax,
            },
        } = line;

        const line_item_ratio = line_item_quantity / order_item_quantity;

        const line_item_shipping = order_shipping_final * line_item_ratio;

        const line_item_refund_discrepancy = Math.abs(
            (refundOrderAdjustments.refund_discrepancy || 0) * line_item_ratio,
        );

        const line_item_refund_total =
            line_item_refund_subtotal - line_item_refund_total_tax + line_item_refund_discrepancy;

        let line_item_turnover =
            (line_item_price - line_item_tax_lines) * line_item_quantity -
            line_item_discount_allocations +
            line_item_shipping -
            line_item_refund_total;
        line_item_turnover = Math.round(line_item_turnover * 100) / 100;

        const line_item_real_shipping_cost = real_shipping_cost * line_item_ratio;

        // TODO
        const line_item_inventory_cost = 0 * line_item_quantity;

        // TODO
        const ad_spend = 0;

        const line_item_profit =
            line_item_turnover - line_item_real_shipping_cost - line_item_inventory_cost - ad_spend;

        const line_item_profit_per_unit = line_item_profit / line_item_quantity;

        return {
            ...line,
            turnover: line_item_turnover,
            quantity: line_item_quantity,
            profit: line_item_profit,
            profit_per_unit: line_item_profit_per_unit,
            detail: {
                ...line.detail,
                line_item_shipping,
                line_item_refund_discrepancy,
                line_item_real_shipping_cost,
                line_item_inventory_cost,
                order_item_quantity,
                order_shipping_lines_price,
                order_shipping_final,
                ...refundOrderAdjustments,
            },
        };
    });

    return result;
};

const buildDateField = (shop_timezone, dateString) =>
    !dateString ? null : { date: new Date(dateString), timezone: shop_timezone };
