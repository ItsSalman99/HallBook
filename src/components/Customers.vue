<script setup>
import { ref, computed } from 'vue'
import { store } from '../store'
import Icons from './Icons.vue'

const emit = defineEmits(['view-booking'])

const searchQuery = ref('')
const selectedCustomer = ref(null)

// Group bookings by customer phone to build a customer database dynamically
const customerList = computed(() => {
  const customersMap = {}
  
  store.bookings.forEach(b => {
    const phone = b.customerPhone
    
    if (!customersMap[phone]) {
      customersMap[phone] = {
        name: b.customerName,
        phone: b.customerPhone,
        email: b.customerEmail || 'N/A',
        bookingsCount: 0,
        totalSpent: 0,
        totalPaid: 0,
        bookingsList: []
      }
    }
    
    // Update data if active/completed
    if (b.status !== 'Cancelled') {
      customersMap[phone].bookingsCount++
      customersMap[phone].totalSpent += b.totalPrice
      customersMap[phone].totalPaid += b.paidAmount
    }
    
    // Always attach to history
    customersMap[phone].bookingsList.push(b)
    
    // Ensure we keep the latest spelled name/email
    if (b.createdAt) {
      customersMap[phone].name = b.customerName
      if (b.customerEmail) customersMap[phone].email = b.customerEmail
    }
  })
  
  return Object.values(customersMap)
})

// Filter customer profiles
const filteredCustomers = computed(() => {
  const query = searchQuery.value.toLowerCase()
  return customerList.value.filter(c => {
    return c.name.toLowerCase().includes(query) || c.phone.includes(query)
  }).sort((a, b) => b.totalSpent - a.totalSpent) // Sort by total spend descending
})

const getStatusClass = (status) => {
  if (status === 'Confirmed') return 'badge-success'
  if (status === 'Pending') return 'badge-warning'
  if (status === 'Completed') return 'badge-success'
  return 'badge-danger'
}
</script>

<template>
  <div class="customers-container animate-fade">
    <div class="header-row">
      <div>
        <h1 class="page-title">Client Database</h1>
        <p class="subtitle">View customer directories, lifetime values, and past bookings.</p>
      </div>
    </div>

    <!-- Search Bar -->
    <div class="search-bar card">
      <div class="search-input-wrapper">
        <Icons name="search" :size="18" class="search-icon" />
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Search client directory by name or phone..." 
          class="form-control"
        />
      </div>
    </div>

    <!-- Customers Grid/Table -->
    <div class="clients-list-wrapper">
      <div v-if="filteredCustomers.length === 0" class="empty-state card">
        <Icons name="customers" :size="64" stroke-width="1" class="empty-icon" />
        <h3>No clients found</h3>
        <p>Bookings you create will automatically compile clients here.</p>
      </div>

      <!-- Clients Table -->
      <div v-else class="table-container card">
        <table class="clients-table">
          <thead>
            <tr>
              <th>Client Name</th>
              <th>Contact Details</th>
              <th style="text-align: center;">Events Held</th>
              <th>Total Value</th>
              <th>Paid to Date</th>
              <th>Outstanding</th>
              <th style="text-align: right;">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="client in filteredCustomers" 
              :key="client.phone"
              @click="selectedCustomer = client"
              class="clickable-row"
            >
              <td>
                <div class="client-name-cell">
                  <div class="avatar">
                    {{ client.name.charAt(0).toUpperCase() }}
                  </div>
                  <strong>{{ client.name }}</strong>
                </div>
              </td>
              <td>
                <div class="contact-cell">
                  <span>{{ client.phone }}</span>
                  <span class="email-sub">{{ client.email }}</span>
                </div>
              </td>
              <td style="text-align: center;">
                <span class="count-tag">{{ client.bookingsCount }}</span>
              </td>
              <td>
                <strong>Rs. {{ client.totalSpent.toLocaleString() }}</strong>
              </td>
              <td class="text-green">Rs. {{ client.totalPaid.toLocaleString() }}</td>
              <td :class="client.totalSpent - client.totalPaid > 0 ? 'text-red' : 'text-muted'">
                Rs. {{ (client.totalSpent - client.totalPaid).toLocaleString() }}
              </td>
              <td style="text-align: right;">
                <button class="btn btn-secondary btn-sm">
                  View Profile
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Client Profile Detail Modal -->
    <div v-if="selectedCustomer" class="modal-overlay" @click="selectedCustomer = null">
      <div class="modal-container card profile-modal animate-scale" @click.stop>
        <div class="modal-header">
          <h2>Client Profile</h2>
          <button @click="selectedCustomer = null" class="close-btn">
            <Icons name="plus" :size="24" style="transform: rotate(45deg);" />
          </button>
        </div>

        <div class="profile-modal-content custom-scroll">
          <!-- Customer Header Card -->
          <div class="profile-summary-header">
            <div class="profile-avatar">
              {{ selectedCustomer.name.charAt(0).toUpperCase() }}
            </div>
            <div class="profile-title-block">
              <h3>{{ selectedCustomer.name }}</h3>
              <p class="profile-meta">
                <Icons name="phone" :size="14" /> {{ selectedCustomer.phone }}
                &bull;
                <Icons name="mail" :size="14" /> {{ selectedCustomer.email }}
              </p>
            </div>
          </div>

          <!-- Financial Statistics -->
          <div class="profile-stats-grid">
            <div class="stat-box">
              <span class="stat-label">Total Events Booked</span>
              <span class="stat-val">{{ selectedCustomer.bookingsCount }}</span>
            </div>
            <div class="stat-box">
              <span class="stat-label">Total Contract Value</span>
              <span class="stat-val">Rs. {{ selectedCustomer.totalSpent.toLocaleString() }}</span>
            </div>
            <div class="stat-box">
              <span class="stat-label">Total Amount Paid</span>
              <span class="stat-val text-green">Rs. {{ selectedCustomer.totalPaid.toLocaleString() }}</span>
            </div>
            <div class="stat-box">
              <span class="stat-label">Remaining Balance</span>
              <span class="stat-val" :class="selectedCustomer.totalSpent - selectedCustomer.totalPaid > 0 ? 'text-red' : 'text-green'">
                Rs. {{ (selectedCustomer.totalSpent - selectedCustomer.totalPaid).toLocaleString() }}
              </span>
            </div>
          </div>

          <!-- Booking History -->
          <div class="booking-history-section">
            <h3>Event Booking History</h3>
            <div class="history-list">
              <div 
                v-for="b in selectedCustomer.bookingsList" 
                :key="b.id" 
                class="history-item"
                @click="emit('view-booking', b); selectedCustomer = null"
              >
                <div class="history-meta">
                  <span class="history-date">{{ b.date }}</span>
                  <span class="badge" :class="getStatusClass(b.status)">{{ b.status }}</span>
                </div>
                <div class="history-detail">
                  <h4>{{ b.eventType }}</h4>
                  <p>{{ b.timeSlot }} slot &bull; {{ b.guests }} guests &bull; Total Price: <strong>Rs. {{ b.totalPrice.toLocaleString() }}</strong></p>
                </div>
                <div class="history-action">
                  <span>View Details</span>
                  <Icons name="chevron-right" :size="16" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.customers-container {
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

/* Search Bar */
.search-bar {
  padding: 1.25rem;
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

/* Table Style */
.table-container {
  overflow-x: auto;
  padding: 0;
}

.clients-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.925rem;
}

.clients-table th {
  padding: 1rem 1.25rem;
  background-color: var(--bg-tertiary);
  font-weight: 700;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-color);
}

.clients-table td {
  padding: 1.1rem 1.25rem;
  border-bottom: 1px solid var(--border-color);
  vertical-align: middle;
}

.clickable-row {
  cursor: pointer;
}

.clickable-row:hover {
  background-color: var(--bg-accent-soft);
}

.client-name-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--bg-accent-soft);
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.9rem;
}

.contact-cell {
  display: flex;
  flex-direction: column;
}

.email-sub {
  font-size: 0.775rem;
  color: var(--text-muted);
}

.count-tag {
  background-color: var(--bg-tertiary);
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.85rem;
}

.text-green { color: var(--success); }
.text-red { color: var(--danger-text); font-weight: 600; }
.text-muted { color: var(--text-muted); }

/* Profile details modal */
.profile-modal {
  max-width: 580px;
}

.profile-modal-content {
  padding: 1.5rem;
  max-height: 75vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.profile-summary-header {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  background-color: var(--bg-primary);
  padding: 1.25rem;
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.profile-avatar {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background-color: var(--primary);
  color: var(--text-on-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 1.5rem;
}

.profile-title-block h3 {
  font-size: 1.25rem;
  font-weight: 800;
}

.profile-meta {
  font-size: 0.85rem;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 0.25rem;
}

.profile-meta svg {
  color: var(--text-muted);
}

/* Profile Stats */
.profile-stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

@media(min-width: 480px) {
  .profile-stats-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.stat-box {
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  padding: 0.75rem;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-label {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-muted);
  line-height: 1.2;
}

.stat-val {
  font-size: 1.1rem;
  font-weight: 800;
  font-family: var(--font-heading);
}

/* History List */
.booking-history-section h3 {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.history-item {
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  padding: 0.875rem;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: all 0.2s;
}

.history-item:hover {
  border-color: var(--border-hover);
  background-color: var(--bg-accent-soft);
  transform: translateY(-1px);
}

.history-meta {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 90px;
}

.history-date {
  font-size: 0.85rem;
  font-weight: 700;
}

.history-detail {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.history-detail h4 {
  font-size: 0.95rem;
  font-weight: 700;
}

.history-detail p {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.history-action {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.775rem;
  color: var(--text-muted);
}
</style>
