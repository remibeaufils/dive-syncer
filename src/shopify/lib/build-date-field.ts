type type = (shop_timezone: string, dateString: string) => { date: Date; timezone: string } | null;

export default ((shop_timezone, dateString) =>
    !dateString ? null : { date: new Date(dateString), timezone: shop_timezone }) as type;
