<script setup>
import { computed } from 'vue'
import { store } from '../store'
import Icons from './Icons.vue'
import CustomChart from './CustomChart.vue'

const emit = defineEmits(['navigate', 'view-booking'])

// Calculate summary numbers
const totalBookingsCount = computed(() => {
  return store.bookings.filter(b => b.status !== 'Cancelled').length
})

const totalRevenue = computed(() => {
  return store.bookings
    .filter(b => b.status !== 'Cancelled')
    .reduce((sum, b) => sum + b.totalPrice, 0)
})

const receivedPayments = computed(() => {
  return store.payments.reduce((sum, p) => sum + p.amount, 0)
})

const pendingPayments = computed(() => {
  return Math.max(0, totalRevenue.value - receivedPayments.value)
})

// Calculate upcoming bookings (next 4)
const upcomingBookings = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  return store.bookings
    .filter(b => b.status !== 'Cancelled' && new Date(b.date) >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 4)
})

// Calculate last 6 months dynamically for charts
const last6MonthsData = computed(() => {
  const months = []
  const today = new Date()
  
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const monthLabel = d.toLocaleString('default', { month: 'short' })
    const monthIndex = d.getMonth()
    const year = d.getFullYear()
    
    // Calculate bookings count in this month
    const bookingsInMonth = store.bookings.filter(b => {
      if (b.status === 'Cancelled') return false
      const bDate = new Date(b.date)
      return bDate.getMonth() === monthIndex && bDate.getFullYear() === year
    }).length

    // Calculate revenue received in this month
    const revenueInMonth = store.payments.filter(p => {
      const pDate = new Date(p.date)
      return pDate.getMonth() === monthIndex && pDate.getFullYear() === year
    }).reduce((sum, p) => sum + p.amount, 0)

    months.push({
      label: `${monthLabel} ${year.toString().slice(-2)}`,
      bookingCount: bookingsInMonth,
      revenue: revenueInMonth
    })
  }
  return months
})

const chartRevenueData = computed(() => {
  return last6MonthsData.value.map(m => ({ label: m.label, value: m.revenue }))
})

const chartBookingsData = computed(() => {
  return last6MonthsData.value.map(m => ({ label: m.label, value: m.bookingCount }))
})

const getSeverityClass = (severity) => {
  if (severity === 'danger') return 'noti-danger'
  return 'noti-warning'
}

const getStatusBadgeClass = (status) => {
  if (status === 'Confirmed') return 'badge-success'
  if (status === 'Pending') return 'badge-warning'
  return 'badge-secondary'
}

const formatNumber = (num) => {
  return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
</script>

<template>
  <div class="dashboard-container animate-fade">
    <div class="header-section">
      <div>
        <h1 class="page-title">Dashboard</h1>
        <p class="subtitle">Welcome back, {{ store.currentOwner?.ownerName || 'Hall Owner' }}! Here is what's happening at {{ store.hallDetails.name }}.</p>
      </div>
      
      <!-- Quick Action Buttons -->
      <div class="quick-actions no-print">
        <button @click="emit('navigate', 'bookings')" class="btn btn-primary btn-sm">
          <Icons name="plus" :size="16" stroke-width="2.5" />
          Create Booking
        </button>
        <button @click="emit('navigate', 'calendar')" class="btn btn-secondary btn-sm">
          <Icons name="calendar" :size="16" />
          View Calendar
        </button>
      </div>
    </div>

    <!-- KPI Summary Grid -->
    <div class="kpi-grid">
      <!-- Total Bookings -->
      <div class="kpi-card card">
        <div class="kpi-header">
          <div class="kpi-icon icon-blue">
            <Icons name="bookings" :size="22" />
          </div>
          <span class="kpi-title">Active Bookings</span>
        </div>
        <div class="kpi-value">{{ totalBookingsCount }}</div>
        <div class="kpi-trend text-blue">
          <Icons name="chevron-right" :size="14" />
          Total reserved events
        </div>
      </div>

      <!-- Total Revenue -->
      <div class="kpi-card card">
        <div class="kpi-header">
          <div class="kpi-icon icon-purple">
            <Icons name="dollar" :size="22" />
          </div>
          <span class="kpi-title">Total Contract Value</span>
        </div>
        <div class="kpi-value">Rs. {{ formatNumber(totalRevenue) }}</div>
        <div class="kpi-trend text-purple">
          <Icons name="check" :size="14" />
          From all bookings
        </div>
      </div>

      <!-- Payments Received -->
      <div class="kpi-card card">
        <div class="kpi-header">
          <div class="kpi-icon icon-green">
            <Icons name="credit-card" :size="22" />
          </div>
          <span class="kpi-title">Payments Received</span>
        </div>
        <div class="kpi-value">Rs. {{ formatNumber(receivedPayments) }}</div>
        <div class="kpi-trend text-green">
          <Icons name="arrow-right" :size="14" />
          Settled in accounts
        </div>
      </div>

      <!-- Pending Balance -->
      <div class="kpi-card card">
        <div class="kpi-header">
          <div class="kpi-icon icon-amber">
            <Icons name="payments" :size="22" />
          </div>
          <span class="kpi-title">Pending Balance</span>
        </div>
        <div class="kpi-value">Rs. {{ formatNumber(pendingPayments) }}</div>
        <div class="kpi-trend text-amber">
          <Icons name="info" :size="14" />
          Outstanding receivables
        </div>
      </div>
    </div>

    <!-- Analytics Charts Grid -->
    <div class="charts-grid no-print">
      <div class="chart-card card">
        <h3>Revenue Collections (Rs.)</h3>
        <p class="chart-subtitle">Monthly received payments trend</p>
        <div class="chart-wrapper">
          <CustomChart type="line" :data="chartRevenueData" color="#6366F1" value-prefix="Rs. " />
        </div>
      </div>

      <div class="chart-card card">
        <h3>Monthly Event Volume</h3>
        <p class="chart-subtitle">Booked event frequency per month</p>
        <div class="chart-wrapper">
          <CustomChart type="bar" :data="chartBookingsData" color="#10B981" />
        </div>
      </div>
    </div>

    <!-- Main Content Section: Alerts and Lists -->
    <div class="main-content-layout">
      <!-- Left Column: Upcoming Events -->
      <div class="upcoming-section card">
        <div class="section-header">
          <h3>Upcoming Bookings</h3>
          <button @click="emit('navigate', 'bookings')" class="btn btn-link btn-sm btn-nav">View All</button>
        </div>
        
        <div v-if="upcomingBookings.length === 0" class="empty-state">
          <Icons name="calendar" :size="48" stroke-width="1.2" class="empty-icon" />
          <p>No upcoming bookings found</p>
          <button @click="emit('navigate', 'bookings')" class="btn btn-secondary btn-sm">Add First Booking</button>
        </div>
        
        <div v-else class="upcoming-list">
          <div 
            v-for="booking in upcomingBookings" 
            :key="booking.id" 
            class="booking-item"
            @click="emit('view-booking', booking)"
          >
            <div class="booking-date-block">
              <span class="date-month">{{ new Date(booking.date).toLocaleString('default', { month: 'short' }) }}</span>
              <span class="date-day">{{ new Date(booking.date).getDate() }}</span>
            </div>
            
            <div class="booking-details">
              <div class="booking-cust-row">
                <h4>{{ booking.customerName }}</h4>
                <span class="badge" :class="getStatusBadgeClass(booking.status)">{{ booking.status }}</span>
              </div>
              <p class="booking-event">{{ booking.eventType }} &bull; {{ booking.timeSlot }}</p>
              <div class="booking-financials">
                <span>{{ booking.guests }} guests</span>
                <span class="financial-totals">
                  Total: <strong>Rs. {{ booking.totalPrice.toLocaleString() }}</strong>
                  <span v-if="booking.totalPrice - booking.paidAmount > 0" class="pending-tag">
                    (Pending: Rs. {{ (booking.totalPrice - booking.paidAmount).toLocaleString() }})
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Notifications & Overdue Center -->
      <div class="notifications-section card">
        <h3>Alerts & Pending Actions</h3>
        
        <div v-if="store.notifications.length === 0" class="empty-state">
          <Icons name="check-circle" :size="48" stroke-width="1.2" class="empty-icon text-green" />
          <p class="empty-text">All caught up! No critical actions pending.</p>
        </div>
        
        <div v-else class="notifications-list">
          <div 
            v-for="noti in store.notifications" 
            :key="noti.id" 
            class="notification-item"
            :class="getSeverityClass(noti.severity)"
          >
            <div class="noti-indicator"></div>
            <div class="noti-content">
              <h4>{{ noti.title }}</h4>
              <p>{{ noti.message }}</p>
              <button 
                v-if="noti.bookingId" 
                @click="emit('view-booking', store.bookings.find(b => b.id === noti.bookingId))" 
                class="btn btn-link btn-sm noti-action"
              >
                Resolve Action &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 800;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.quick-actions {
  display: flex;
  gap: 0.75rem;
}

/* KPI Cards Layout */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.25rem;
}

.kpi-card {
  padding: 1.5rem;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.kpi-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.kpi-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-blue { background-color: rgba(59, 130, 246, 0.1); color: #3b82f6; }
.icon-purple { background-color: rgba(99, 102, 241, 0.1); color: var(--primary); }
.icon-green { background-color: var(--success-bg); color: var(--success); }
.icon-amber { background-color: var(--warning-bg); color: var(--warning); }

.kpi-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.kpi-value {
  font-size: 1.75rem;
  font-weight: 800;
  font-family: var(--font-heading);
}

.kpi-trend {
  font-size: 0.75rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.text-blue { color: #3b82f6; }
.text-purple { color: var(--primary); }
.text-green { color: var(--success); }
.text-amber { color: var(--warning-text); }

/* Charts Layout */
.charts-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;
}

@media (min-width: 1024px) {
  .charts-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.chart-card {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
}

.chart-card h3 {
  font-size: 1.1rem;
  font-weight: 700;
}

.chart-subtitle {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-bottom: 1.25rem;
}

.chart-wrapper {
  height: 220px;
  position: relative;
  width: 100%;
}

/* Main Layout Grid */
.main-content-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;
}

@media (min-width: 1024px) {
  .main-content-layout {
    grid-template-columns: 1.2fr 0.8fr;
  }
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
}

.btn-nav {
  padding: 0;
  font-size: 0.875rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 3rem 1.5rem;
  gap: 0.75rem;
}

.empty-icon {
  color: var(--text-muted);
}

.empty-text {
  color: var(--text-secondary);
}

/* Upcoming Bookings List */
.upcoming-list {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.booking-item {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  border-radius: 12px;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: all 0.2s ease;
}

.booking-item:hover {
  transform: translateY(-2px);
  border-color: var(--border-hover);
  box-shadow: var(--shadow-sm);
  background-color: var(--bg-secondary);
}

.booking-date-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 60px;
  height: 60px;
  border-radius: 10px;
  background-color: var(--bg-accent-soft);
  color: var(--primary);
  border: 1px solid var(--border-color);
}

.date-month {
  font-size: 0.725rem;
  text-transform: uppercase;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.date-day {
  font-size: 1.35rem;
  font-weight: 800;
  line-height: 1;
}

.booking-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.booking-cust-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.booking-cust-row h4 {
  font-size: 1rem;
  font-weight: 600;
}

.booking-event {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.booking-financials {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-top: 0.25rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.financial-totals {
  color: var(--text-secondary);
}

.financial-totals strong {
  color: var(--text-primary);
}

.pending-tag {
  color: var(--warning-text);
  font-weight: 600;
}

/* Notifications Section */
.notifications-section {
  display: flex;
  flex-direction: column;
}

.notifications-section h3 {
  margin-bottom: 1.25rem;
}

.notifications-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.notification-item {
  display: flex;
  gap: 0.875rem;
  padding: 0.875rem;
  border-radius: 12px;
  position: relative;
  overflow: hidden;
  border: 1px solid transparent;
}

.noti-indicator {
  width: 4px;
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
}

.noti-danger {
  background-color: var(--danger-bg);
  border-color: rgba(239, 68, 68, 0.15);
}
.noti-danger .noti-indicator { background-color: var(--danger); }
.noti-danger h4 { color: var(--danger-text); }

.noti-warning {
  background-color: var(--warning-bg);
  border-color: rgba(245, 158, 11, 0.15);
}
.noti-warning .noti-indicator { background-color: var(--warning); }
.noti-warning h4 { color: var(--warning-text); }

.noti-content {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.noti-content h4 {
  font-size: 0.9rem;
  font-weight: 700;
}

.noti-content p {
  font-size: 0.825rem;
  color: var(--text-secondary);
}

.noti-action {
  align-self: flex-start;
  padding: 0;
  font-size: 0.8rem;
  margin-top: 0.25rem;
}
</style>
