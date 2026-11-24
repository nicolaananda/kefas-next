const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('src/pages/dashboard/Bookings.tsx', 'utf8');
const ts = require('typescript');
const match = source.match(/const deleteBooking = async \(booking: Booking\) => \{[\s\S]*?\n    \};/);
assert.ok(match, 'delete confirmation handler must exist');
(async () => {
 for (const scenario of ['cancel', 'success', 'failure', 'network', 'busy', 'staff']) {
  let requests = 0, refreshed = 0, removed = false, alerts = 0, busy = new Set(scenario === 'busy' ? [42] : []);
  const context = { canDelete: scenario !== 'staff', updatingBookingIds: busy, window: { confirm: () => scenario !== 'cancel' }, localStorage: { getItem: () => 'test-token' }, API_BASE_URL: '/api',
   setUpdatingBookingIds: fn => { busy = fn(busy); }, setBookings: fn => { removed = fn([{ id: 42 }]).length === 0; },
   fetchBookings: async () => { refreshed++; }, alert: () => { alerts++; },
   fetch: async (url, opts) => { requests++; assert.equal(url, '/api/bookings/42'); assert.equal(opts.method, 'DELETE'); assert.equal(opts.headers.Authorization, 'Bearer test-token'); if (scenario === 'network') throw Error('offline'); return { ok: scenario === 'success', json: async () => ({ error: 'denied' }) }; }
  };
  vm.createContext(context);
  vm.runInContext(ts.transpile(match[0] + '\nglobalThis.runDelete = deleteBooking;'), context);
  await context.runDelete({ id: 42, customerName: 'Fixture', bookingDate: '2026-11-25', timeSlot: '11:00-12:00' });
  assert.equal(requests, ['cancel', 'busy', 'staff'].includes(scenario) ? 0 : 1, scenario);
  assert.equal(removed, scenario === 'success', scenario);
  assert.equal(refreshed, scenario === 'success' ? 1 : 0, scenario);
  assert.equal(alerts, ['failure', 'network'].includes(scenario) ? 1 : 0, scenario);
  if (scenario !== 'busy') assert.equal(busy.size, 0, scenario);
 }
 assert.match(source, /canDelete &&/);
 assert.match(source, /onClick=\{\(\) => deleteBooking\(booking\)\}/);
 console.log('PASS delete UI: cancel, success/remove/refresh, failure, network, busy, staff; synthetic fixture only');
})().catch(e => { console.error(e); process.exitCode = 1; });
