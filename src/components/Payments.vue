<script setup>
import { ref, computed } from 'vue'
import { store, hasPermission } from '../store'
import Icons from './Icons.vue'

const emit = defineEmits(['view-booking'])

const searchQuery = ref('')
const methodFilter = ref('All')

// Financial statistics
const totalInvoiced = computed(() => {
  return store.bookings
    .filter(b => b.status !== 'Cancelled')
    .reduce((sum, b) => sum + b.totalPrice, 0)
})

const totalCollected = computed(() => {
  return store.payments.reduce((sum, p) => sum + p.amount, 0)
})

const totalPending = computed(() => {
  return Math.max(0, totalInvoiced.value - totalCollected.value)
})

// Outstanding Bookings List
const outstandingBookings = computed(() => {
  return store.bookings.filter(b => {
    if (b.status === 'Cancelled') return false
    const remaining = b.totalPrice - b.paidAmount
    return remaining > 0
  }).map(b => ({
    ...b,
    remaining: b.totalPrice - b.paidAmount
  })).sort((a, b) => b.remaining - a.remaining) // Sort highest outstanding first
})

// Filter payments
const filteredPayments = computed(() => {
  return store.payments.filter(p => {
    const query = searchQuery.value.toLowerCase()
    const matchesSearch = p.customerName.toLowerCase().includes(query) ||
                          (p.notes && p.notes.toLowerCase().includes(query)) ||
                          p.bookingId.toLowerCase().includes(query)
                          
    const matchesMethod = methodFilter.value === 'All' || p.method === methodFilter.value
    
    return matchesSearch && matchesMethod
  }).sort((a, b) => new Date(b.date) - new Date(a.date)) // Sort by date descending (implied by store structure, but explicit here)
})

const getBooking = (bookingId) => {
  return store.bookings.find(b => b.id === bookingId)
}

const getMethodIcon = (method) => {
  if (method === 'Card') return 'credit-card'
  if (method === 'Bank Transfer') return 'building'
  if (method === 'Cheque') return 'edit'
  if (method === 'Pay Order') return 'check-circle'
  return 'dollar'
}
</script>

<template>
  <div class="payments-container animate-fade">
    <div class="header-row">
      <div>
        <h1 class="page-title">Financial Ledger</h1>
        <p class="subtitle">Track invoice receipts, outstanding client balances, and payment streams.</p>
      </div>
    </div>

    <!-- Financial Stats Cards -->
    <div class="ledger-stats">
      <div class="card stat-card border-purple">
        <span class="label">Total Invoiced</span>
        <span class="value">Rs. {{ totalInvoiced.toLocaleString() }}</span>
        <span class="subtext">Net contract totals</span>
      </div>
      <div class="card stat-card border-green">
        <span class="label">Total Collected</span>
        <span class="value text-green">Rs. {{ totalCollected.toLocaleString() }}</span>
        <span class="subtext">Settled payments</span>
      </div>
      <div class="card stat-card border-orange">
        <span class="label">Total Outstanding</span>
        <span class="value text-orange">Rs. {{ totalPending.toLocaleString() }}</span>
        <span class="subtext">Pending balances due</span>
      </div>
    </div>

    <!-- Main Layout: Left: Payment history ledger. Right: Outstanding accounts list -->
    <div class="ledger-layout">
      <!-- Left Column: Transactions Log -->
      <div class="transactions-log card">
        <div class="log-header-row">
          <h3>Transaction History</h3>
          <div class="filters no-print">
            <select v-model="methodFilter" class="form-control filter-select">
              <option value="All">All Methods</option>
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
              <option value="Pay Order">Pay Order</option>
              <option value="Online">Online</option>
            </select>
          </div>
        </div>

        <!-- Search Bar -->
        <div class="log-search no-print">
          <div class="search-input-wrapper">
            <Icons name="search" :size="16" class="search-icon" />
            <input 
              v-model="searchQuery" 
              type="text" 
              placeholder="Search receipts by client, note, or ID..." 
              class="form-control"
            />
          </div>
        </div>

        <div v-if="filteredPayments.length === 0" class="empty-state">
          <Icons name="payments" :size="48" stroke-width="1.2" class="empty-icon" />
          <p>No payments recorded for the active filters.</p>
        </div>

        <!-- Transactions Table -->
        <div v-else class="table-container">
          <table class="ledger-table">
            <thead>
              <tr>
                <th>Receipt Date</th>
                <th>Client Name</th>
                <th>Payment Method</th>
                <th>Reference Details</th>
                <th style="text-align: right;">Amount Paid</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="pay in filteredPayments" 
                :key="pay.id" 
                :class="{ 'clickable-row': hasPermission('bookings_view') }"
                @click="hasPermission('bookings_view') ? emit('view-booking', getBooking(pay.bookingId)) : null"
                :title="hasPermission('bookings_view') ? 'Click to view full booking details' : ''"
              >
                <td>{{ pay.date }}</td>
                <td>
                  <div class="client-info">
                    <strong>{{ pay.customerName }}</strong>
                    <span class="booking-ref">ID: {{ pay.bookingId.split('_')[1] }}</span>
                  </div>
                </td>
                <td>
                  <span class="method-badge">
                    <Icons :name="getMethodIcon(pay.method)" :size="14" />
                    {{ pay.method }}
                  </span>
                </td>
                <td class="notes-cell">{{ pay.notes || 'N/A' }}</td>
                <td style="text-align: right;" class="amount-cell text-green">+Rs. {{ pay.amount.toLocaleString() }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Right Column: Outstanding Balances -->
      <div class="outstanding-panel card">
        <h3>Outstanding Balances</h3>
        <p class="panel-subtitle">Clients with outstanding unpaid balances</p>

        <div v-if="outstandingBookings.length === 0" class="empty-state">
          <Icons name="check-circle" :size="48" class="text-green" />
          <p>No outstanding balances! All invoices fully paid.</p>
        </div>

        <div v-else class="outstanding-list">
          <div 
            v-for="b in outstandingBookings" 
            :key="b.id" 
            :class="['outstanding-item', { 'clickable-row': hasPermission('bookings_view') }]"
            @click="hasPermission('bookings_view') ? emit('view-booking', b) : null"
            :title="hasPermission('bookings_view') ? 'Click to view details and record payments' : ''"
          >
            <div class="item-info">
              <h4>{{ b.customerName }}</h4>
              <p>{{ b.eventType }} &bull; {{ b.date }}</p>
              <div class="balance-line">
                <span>Contract: Rs. {{ b.totalPrice.toLocaleString() }}</span>
                <span>Paid: Rs. {{ b.paidAmount.toLocaleString() }}</span>
              </div>
            </div>
            
            <div class="item-amount">
              <span class="lbl">Pending</span>
              <span class="amt">Rs. {{ b.remaining.toLocaleString() }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.payments-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 800;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 0.95rem;
}

/* Ledger Stats */
.ledger-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.25rem;
}

.stat-card {
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  border-left: 4px solid var(--border-color);
}

.stat-card.border-purple { border-left-color: var(--primary); }
.stat-card.border-green { border-left-color: var(--success); }
.stat-card.border-orange { border-left-color: var(--warning); }

.stat-card .label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-muted);
}

.stat-card .value {
  font-size: 1.75rem;
  font-weight: 800;
  font-family: var(--font-heading);
}

.stat-card .subtext {
  font-size: 0.75rem;
  color: var(--text-muted);
}

/* Ledger Layout */
.ledger-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;
}

@media(min-width: 1024px) {
  .ledger-layout {
    grid-template-columns: 1.3fr 0.7fr;
  }
}

.transactions-log {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.log-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-select {
  padding: 0.4rem 1.5rem 0.4rem 0.75rem;
  font-size: 0.85rem;
  border-radius: 8px;
  width: auto;
}

.log-search {
  width: 100%;
}

.search-input-wrapper {
  position: relative;
  width: 100%;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
}

.search-input-wrapper input {
  padding-left: 2.25rem;
}

/* Ledger Table */
.table-container {
  overflow-x: auto;
}

.ledger-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.9rem;
}

.ledger-table th {
  padding: 0.75rem 1rem;
  background-color: var(--bg-tertiary);
  font-weight: 700;
  font-size: 0.725rem;
  text-transform: uppercase;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-color);
}

.ledger-table td {
  padding: 0.875rem 1rem;
  border-bottom: 1px solid var(--border-color);
  vertical-align: middle;
}

.clickable-row {
  cursor: pointer;
}

.clickable-row:hover {
  background-color: var(--bg-accent-soft);
}

.client-info {
  display: flex;
  flex-direction: column;
}

.booking-ref {
  font-size: 0.725rem;
  color: var(--text-muted);
  font-weight: 600;
}

.method-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background-color: var(--bg-tertiary);
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.notes-cell {
  color: var(--text-secondary);
  max-width: 150px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.amount-cell {
  font-weight: 700;
}

.text-green { color: var(--success); }
.text-orange { color: var(--warning-text); }

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 3rem 1rem;
  gap: 0.75rem;
}

.empty-icon {
  color: var(--text-muted);
}

/* Outstanding Panel */
.outstanding-panel {
  display: flex;
  flex-direction: column;
}

.panel-subtitle {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-bottom: 1rem;
}

.outstanding-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.outstanding-item {
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  padding: 0.875rem;
  border-radius: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s;
}

.outstanding-item:hover {
  border-color: var(--border-hover);
  background-color: var(--bg-accent-soft);
  transform: translateY(-1px);
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  flex: 1;
}

.item-info h4 {
  font-size: 0.95rem;
  font-weight: 700;
}

.item-info p {
  font-size: 0.775rem;
  color: var(--text-muted);
}

.balance-line {
  display: flex;
  gap: 0.75rem;
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
}

.item-amount {
  text-align: right;
  display: flex;
  flex-direction: column;
}

.item-amount .lbl {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-muted);
}

.item-amount .amt {
  font-size: 1rem;
  font-weight: 800;
  color: var(--danger-text);
  font-family: var(--font-heading);
}
</style>
