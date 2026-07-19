const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || 'primos2026';
const DATA_FILE = path.join(__dirname, 'data', 'orders.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* ---------------- tiny JSON-file database ----------------
   Good enough for a single restaurant branch. For higher order
   volume or multiple branches, swap readOrders/writeOrders for
   a real database (Postgres, MySQL, SQLite) without touching
   the routes below. */
function ensureDataFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]');
}
function readOrders() {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}
function writeOrders(orders) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(orders, null, 2));
}

/* ---------------- menu: single source of truth ---------------- */
const MENU = [
  { id: 'chicken-ranch', name: 'تشيكن رانش بيتزا', desc: 'دجاج مشوي، صوص رانش كريمي وتشيز سخن.', price: 220, badge: 'الأكثر طلبًا' },
  { id: 'sea-ranch',     name: 'سي رانش بيتزا',     desc: 'مأكولات بحرية طازة فوق قاعدة رانش وتشيز.', price: 240, badge: 'مفضل الزبائن' },
  { id: 'cheese',        name: 'تشيز بيتزا',        desc: 'طبقات تشيز ذايبة وصوص طماطم متوازن.', price: 180, badge: 'كلاسيك' },
  { id: 'wings',         name: 'تشيكن وينجز',       desc: 'قطع دجاج مقرمشة تقدم مع صوص من اختيارك.', price: 95,  badge: null },
  { id: 'coleslaw',      name: 'كول سلو',           desc: 'سلطة كرنب كريمية منعشة كطبق جانبي.', price: 35,  badge: null },
  { id: 'fries',         name: 'بطاطس محمرة',       desc: 'بطاطس مقرمشة طازة تقدم سخنة.', price: 50,  badge: null },
];

function requireAdmin(req, res, next) {
  if (req.header('x-admin-key') !== ADMIN_KEY) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

/* ---------------- routes ---------------- */

app.get('/api/menu', (req, res) => {
  res.json(MENU);
});

app.post('/api/orders', (req, res) => {
  const { items, name, phone, address, notes, payment } = req.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'السلة فاضية' });
  }
  if (!name || !phone || !address) {
    return res.status(400).json({ error: 'من فضلك املأ كل الحقول المطلوبة' });
  }
  if (!['cash', 'card'].includes(payment)) {
    return res.status(400).json({ error: 'طريقة دفع غير صحيحة' });
  }

  // Recompute total server-side from the menu — never trust prices from the client.
  let total = 0;
  const cleanItems = [];
  for (const it of items) {
    const menuItem = MENU.find((m) => m.id === it.id);
    if (!menuItem) return res.status(400).json({ error: 'صنف غير موجود: ' + it.id });
    const qty = Math.max(1, parseInt(it.qty, 10) || 1);
    total += menuItem.price * qty;
    cleanItems.push({ name: menuItem.name, price: menuItem.price, qty });
  }

  const order = {
    id: 'ORD-' + Date.now().toString().slice(-8) + '-' + crypto.randomInt(10, 99),
    items: cleanItems,
    total,
    name: String(name).slice(0, 120),
    phone: String(phone).slice(0, 30),
    address: String(address).slice(0, 300),
    notes: notes ? String(notes).slice(0, 300) : '',
    payment,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  const orders = readOrders();
  orders.push(order);
  writeOrders(orders);

  res.status(201).json(order);
});

app.get('/api/orders', requireAdmin, (req, res) => {
  const orders = readOrders().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(orders);
});

app.patch('/api/orders/:id', requireAdmin, (req, res) => {
  const { status } = req.body || {};
  const valid = ['pending', 'preparing', 'out', 'delivered'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'حالة غير صحيحة' });

  const orders = readOrders();
  const order = orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });

  order.status = status;
  writeOrders(orders);
  res.json(order);
});

app.listen(PORT, () => {
  console.log(`Primo's Pizza server running on http://localhost:${PORT}`);
});
