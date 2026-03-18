const db = require('../config/db');

const getRiskLevel = (daysLeft) => {
  if (daysLeft < 0) return 'EXPIRED';
  if (daysLeft <= 30) return 'HIGH';
  if (daysLeft <= 90) return 'MEDIUM';
  return 'LOW';
};

const dashboardController = {
  summary: async (req, res) => {
    try {

      const [expiringRows] = await db.query(
        `
        SELECT COUNT(*) AS expiring_products
        FROM product
        WHERE status = 1
          AND quantity > 0
          AND expiry_date IS NOT NULL
          AND expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
        `
      );

      const [newOrdersRows] = await db.query(
        `
        SELECT COUNT(*) AS new_orders
        FROM history_import hi
        JOIN product p ON hi.product_id = p.product_id
        WHERE p.status = 1 AND YEARWEEK(hi.created_at, 1) = YEARWEEK(CURDATE(), 1)
        `
      );

      const [monthlyImportRows] = await db.query(
        `
        SELECT COALESCE(SUM(hi.quantity), 0) AS monthly_import
        FROM history_import hi
        JOIN product p ON hi.product_id = p.product_id
        WHERE p.status = 1 AND YEAR(hi.created_at) = YEAR(CURDATE())
          AND MONTH(hi.created_at) = MONTH(CURDATE())
        `
      );

      const [weeklySeriesRows] = await db.query(
        `
        SELECT DATE_FORMAT(hi.created_at, '%Y-%m-%d') AS day_str, COALESCE(SUM(hi.quantity), 0) AS qty
        FROM history_import hi
        JOIN product p ON hi.product_id = p.product_id
        WHERE p.status = 1 AND hi.created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
        GROUP BY DATE(hi.created_at)
        ORDER BY DATE(hi.created_at)
        `
      );

      const [alertsRows] = await db.query(
        `
        SELECT product_id, product_name, expiry_date, DATEDIFF(expiry_date, CURDATE()) AS days_left
        FROM product
        WHERE status = 1
          AND quantity > 0
          AND expiry_date IS NOT NULL
          AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL 90 DAY)
        ORDER BY expiry_date ASC
        LIMIT 10
        `
      );

      const byDay = new Map();
      weeklySeriesRows.forEach((row) => {
        byDay.set(row.day_str, Number(row.qty) || 0);
      });

      const chartLabels = [];
      const chartValues = [];
      
      const toLocalYYYYMMDD = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      };

      for (let i = 6; i >= 0; i -= 1) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = toLocalYYYYMMDD(d);
        chartLabels.push(d.toLocaleDateString('vi-VN', { weekday: 'short' }));
        chartValues.push(byDay.get(key) || 0);
      }

      const expiryAlerts = alertsRows.map((row) => {
        const daysLeft = Number(row.days_left);
        return {
          product_id: row.product_id,
          product_name: row.product_name,
          expiry_date: row.expiry_date,
          days_left: daysLeft,
          risk_level: getRiskLevel(daysLeft),
        };
      });

      return res.status(200).json({
        stats: {
          expiring_products: Number(expiringRows?.[0]?.expiring_products || 0),
          new_orders: Number(newOrdersRows?.[0]?.new_orders || 0),
          monthly_import: Number(monthlyImportRows?.[0]?.monthly_import || 0),
        },
        chart: {
          labels: chartLabels,
          values: chartValues,
          label: 'Số lượng phát sinh theo ngày',
        },
        expiry_alerts: expiryAlerts,
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },
};

module.exports = dashboardController;
