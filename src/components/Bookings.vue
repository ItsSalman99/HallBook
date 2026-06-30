<script setup>
import { ref, computed, watch } from 'vue'
import { store, addBooking, updateBooking, deleteBooking, recordAdditionalPayment, hasPermission } from '../store'
import Icons from './Icons.vue'

const props = defineProps({
  initialSelectedBooking: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['clear-selected'])

// Search and Filter State
const searchQuery = ref('')
const statusFilter = ref('All')
const dateFilterStart = ref('')
const dateFilterEnd = ref('')

// Modal States
const isModalOpen = ref(false)
const isPaymentModalOpen = ref(false)
const isInvoicePrintOpen = ref(false)
const bookingDrawerOpen = ref(false)

const currentBooking = ref(null) // Active booking for view/edit
const isEditMode = ref(false)

// Record Payment Modal State
const paymentAmount = ref(0)
const paymentMethod = ref('Cash')
const paymentNotes = ref('')
const paymentError = ref('')

// Form Form Fields
const formCustomerName = ref('')
const formCustomerPhone = ref('')
const formCustomerEmail = ref('')
const formEventType = ref('Wedding')
const formDate = ref('')
const formTimeSlot = ref('Evening') // 'Morning', 'Evening', 'Full Day'
const formGuests = ref(100)
const formPackageId = ref('')
const formBasePrice = ref(0)
const formDiscount = ref(0)
const formTax = ref(0)
const formPaidAmount = ref(0)
const formStatus = ref('Pending')
const formNotes = ref('')
const formValidationError = ref('')

// Sync selected booking from parent (e.g. clicked in Dashboard or Calendar)
watch(() => props.initialSelectedBooking, (newVal) => {
  if (newVal) {
    currentBooking.value = newVal
    bookingDrawerOpen.value = true
  }
}, { immediate: true })

// Helper to open Add Booking
const openAddModal = () => {
  isEditMode.value = false
  formValidationError.value = ''
  
  formCustomerName.value = ''
  formCustomerPhone.value = ''
  formCustomerEmail.value = ''
  formEventType.value = 'Wedding'
  formDate.value = new Date().toISOString().split('T')[0]
  formTimeSlot.value = 'Evening'
  formGuests.value = 100
  formPackageId.value = store.packages[0]?.id || ''
  formDiscount.value = 0
  formPaidAmount.value = 0
  formStatus.value = 'Pending'
  formNotes.value = ''
  
  calculateBasePrice()
  isModalOpen.value = true
}

// Helper to open Edit Booking
const openEditModal = (booking) => {
  isEditMode.value = true
  formValidationError.value = ''
  currentBooking.value = booking

  formCustomerName.value = booking.customerName
  formCustomerPhone.value = booking.customerPhone
  formCustomerEmail.value = booking.customerEmail || ''
  formEventType.value = booking.eventType
  formDate.value = booking.date
  formTimeSlot.value = booking.timeSlot
  formGuests.value = booking.guests
  formPackageId.value = booking.packageId
  formBasePrice.value = booking.basePrice
  formDiscount.value = booking.discount
  formTax.value = booking.tax
  formPaidAmount.value = booking.paidAmount
  formStatus.value = booking.status
  formNotes.value = booking.notes || ''

  isModalOpen.value = true
}

// Watch guests or package to calculate base price
const calculateBasePrice = () => {
  const pkg = store.packages.find(p => p.id === formPackageId.value)
  if (!pkg) {
    formBasePrice.value = 0
    return
  }
  
  if (pkg.type === 'per-guest') {
    formBasePrice.value = pkg.price * (formGuests.value || 0)
  } else {
    formBasePrice.value = pkg.price
  }

  // Calculate default tax (e.g. 13% PRA / Services Tax of base minus discount)
  const taxableSubtotal = Math.max(0, formBasePrice.value - (formDiscount.value || 0))
  formTax.value = Math.round(taxableSubtotal * 0.13)
}

watch([formGuests, formPackageId], () => {
  if (!isEditMode.value) {
    calculateBasePrice()
  }
})

// Calculate total price dynamically in form
const formTotalPrice = computed(() => {
  const subtotal = (formBasePrice.value || 0) - (formDiscount.value || 0)
  return Math.max(0, subtotal + (formTax.value || 0))
})

// Check booking availability (Prevent Double Bookings)
const checkSlotAvailability = (date, slot, excludeBookingId = null) => {
  return !store.bookings.some(b => {
    if (b.status === 'Cancelled') return false
    if (excludeBookingId && b.id === excludeBookingId) return false
    if (b.date !== date) return false

    // Checking slots overlap logic
    // Full Day overlaps with Morning, Evening, and Full Day
    if (slot === 'Full Day' || b.timeSlot === 'Full Day') return true
    // Matching exact slots
    return b.timeSlot === slot
  })
}

// Form Submit
const handleFormSubmit = () => {
  formValidationError.value = ''
  
  // Validation: Check double booking
  const isAvailable = checkSlotAvailability(
    formDate.value, 
    formTimeSlot.value, 
    isEditMode.value ? currentBooking.value.id : null
  )

  if (!isAvailable) {
    formValidationError.value = `This date (${formDate.value}) is already booked for the selected ${formTimeSlot.value} slot. Please select another slot or date.`
    return
  }

  const bookingData = {
    customerName: formCustomerName.value,
    customerPhone: formCustomerPhone.value,
    customerEmail: formCustomerEmail.value,
    eventType: formEventType.value,
    date: formDate.value,
    timeSlot: formTimeSlot.value,
    guests: Number(formGuests.value),
    packageId: formPackageId.value,
    basePrice: Number(formBasePrice.value),
    discount: Number(formDiscount.value),
    tax: Number(formTax.value),
    totalPrice: formTotalPrice.value,
    paidAmount: Number(formPaidAmount.value),
    status: formStatus.value,
    notes: formNotes.value
  }

  if (isEditMode.value) {
    updateBooking({
      id: currentBooking.value.id,
      ...bookingData
    })
    // Sync current view drawer
    currentBooking.value = store.bookings.find(b => b.id === currentBooking.value.id)
  } else {
    addBooking(bookingData)
  }

  isModalOpen.value = false
}

// Open payment recording modal
const openPaymentModal = () => {
  paymentAmount.value = currentBooking.value.totalPrice - currentBooking.value.paidAmount
  paymentMethod.value = 'Cash'
  paymentNotes.value = ''
  paymentError.value = ''
  isPaymentModalOpen.value = true
}

const handlePaymentSubmit = () => {
  paymentError.value = ''
  const remaining = currentBooking.value.totalPrice - currentBooking.value.paidAmount
  
  if (paymentAmount.value <= 0 || paymentAmount.value > remaining) {
    paymentError.value = `Payment must be greater than 0 and cannot exceed the remaining balance of Rs. ${remaining.toLocaleString()}.`
    return
  }

  recordAdditionalPayment(
    currentBooking.value.id,
    Number(paymentAmount.value),
    paymentMethod.value,
    paymentNotes.value
  )

  // Sync drawer
  currentBooking.value = store.bookings.find(b => b.id === currentBooking.value.id)
  isPaymentModalOpen.value = false
}

// Delete / Cancel Actions
const confirmDelete = (bookingId) => {
  if (confirm('Are you sure you want to permanently delete this booking? This will also remove its associated transaction history.')) {
    deleteBooking(bookingId)
    bookingDrawerOpen.value = false
    emit('clear-selected')
  }
}

const updateStatus = (bookingId, newStatus) => {
  const booking = store.bookings.find(b => b.id === bookingId)
  if (booking) {
    updateBooking({
      ...booking,
      status: newStatus
    })
    currentBooking.value = store.bookings.find(b => b.id === bookingId)
  }
}

// Filter bookings array
const filteredBookings = computed(() => {
  return store.bookings.filter(b => {
    // Search query matches Customer Name, Phone, or Event Type
    const query = searchQuery.value.toLowerCase()
    const matchesSearch = b.customerName.toLowerCase().includes(query) ||
                          b.customerPhone.includes(query) ||
                          b.eventType.toLowerCase().includes(query)
    
    // Filter status
    const matchesStatus = statusFilter.value === 'All' || b.status === statusFilter.value
    
    // Filter Date Range
    let matchesDate = true
    if (dateFilterStart.value) {
      matchesDate = matchesDate && b.date >= dateFilterStart.value
    }
    if (dateFilterEnd.value) {
      matchesDate = matchesDate && b.date <= dateFilterEnd.value
    }

    return matchesSearch && matchesStatus && matchesDate
  }).sort((a, b) => new Date(b.date) - new Date(a.date)) // Sort newest events first
})

const getStatusClass = (status) => {
  if (status === 'Confirmed') return 'badge-success'
  if (status === 'Pending') return 'badge-warning'
  if (status === 'Completed') return 'badge-success' // Completed is positive
  return 'badge-danger' // Cancelled
}

const getPaymentHistory = computed(() => {
  if (!currentBooking.value) return []
  return store.payments.filter(p => p.bookingId === currentBooking.value.id)
})

const getPackageName = (packageId) => {
  const pkg = store.packages.find(p => p.id === packageId)
  return pkg ? pkg.name : 'Custom Package'
}

const closeDrawer = () => {
  bookingDrawerOpen.value = false
  emit('clear-selected')
}
</script>

<template>
  <div class="bookings-container animate-fade">
    <div class="header-row no-print">
      <div>
        <h1 class="page-title">Bookings Directory</h1>
        <p class="subtitle">Search, manage, and book events for your halls.</p>
      </div>
      <button v-if="hasPermission('bookings_edit')" @click="openAddModal" class="btn btn-primary">
        <Icons name="plus" :size="20" stroke-width="2.5" />
        New Booking
      </button>
    </div>

    <!-- Filter Bar Component -->
    <div class="filters-bar card no-print">
      <div class="filter-search">
        <div class="search-input-wrapper">
          <Icons name="search" :size="18" class="search-icon" />
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Search customer name, phone, or event..." 
            class="form-control"
          />
        </div>
      </div>
      
      <div class="filter-controls">
        <div class="control-group">
          <label>Status</label>
          <select v-model="statusFilter" class="form-control">
            <option value="All">All Statuses</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Pending">Pending</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        <div class="control-group">
          <label>From Date</label>
          <input v-model="dateFilterStart" type="date" class="form-control" />
        </div>

        <div class="control-group">
          <label>To Date</label>
          <input v-model="dateFilterEnd" type="date" class="form-control" />
        </div>
      </div>
    </div>

    <!-- Bookings Table / List Cards -->
    <div class="bookings-list-wrapper">
      <div v-if="filteredBookings.length === 0" class="empty-bookings card">
        <Icons name="bookings" :size="64" stroke-width="1" class="empty-icon" />
        <h3>No bookings match your criteria</h3>
        <p>Try clearing your filters or create a new booking for your customers.</p>
        <button v-if="hasPermission('bookings_edit')" @click="openAddModal" class="btn btn-primary">Create New Booking</button>
      </div>

      <!-- Desktop Table (Min Width 768px) -->
      <div v-else class="table-container card no-print">
        <table class="bookings-table">
          <thead>
            <tr>
              <th>Event Date</th>
              <th>Customer</th>
              <th>Event Type</th>
              <th>Time Slot</th>
              <th>Guests</th>
              <th>Pricing</th>
              <th>Status</th>
              <th style="text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="booking in filteredBookings" 
              :key="booking.id"
              @click="currentBooking = booking; bookingDrawerOpen = true"
              class="clickable-row"
            >
              <td>
                <div class="date-cell">
                  <strong>{{ booking.date }}</strong>
                </div>
              </td>
              <td>
                <div class="customer-cell">
                  <span class="cust-name">{{ booking.customerName }}</span>
                  <span class="cust-phone">{{ booking.customerPhone }}</span>
                </div>
              </td>
              <td>{{ booking.eventType }}</td>
              <td>
                <span class="slot-tag" :class="booking.timeSlot.toLowerCase().replace(' ', '-')">
                  {{ booking.timeSlot }}
                </span>
              </td>
              <td>{{ booking.guests }}</td>
              <td>
                <div class="price-cell">
                  <span class="price-total">Rs. {{ booking.totalPrice.toLocaleString() }}</span>
                  <span 
                    v-if="booking.totalPrice - booking.paidAmount > 0" 
                    class="price-pending"
                  >
                    Pending: Rs. {{ (booking.totalPrice - booking.paidAmount).toLocaleString() }}
                  </span>
                  <span v-else class="price-settled">Fully Paid</span>
                </div>
              </td>
              <td>
                <span class="badge" :class="getStatusClass(booking.status)">
                  {{ booking.status }}
                </span>
              </td>
              <td style="text-align: right;" @click.stop>
                <div class="row-actions">
                  <button v-if="hasPermission('bookings_edit')" @click="openEditModal(booking)" class="btn-icon" title="Edit Booking">
                    <Icons name="edit" :size="16" />
                  </button>
                  <button v-if="hasPermission('bookings_edit')" @click="confirmDelete(booking.id)" class="btn-icon text-red" title="Delete Booking">
                    <Icons name="trash" :size="16" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile List Cards (Only visible on mobile layout) -->
      <div class="mobile-bookings-grid no-print">
        <div 
          v-for="booking in filteredBookings" 
          :key="booking.id" 
          class="mobile-card card clickable-row"
          @click="currentBooking = booking; bookingDrawerOpen = true"
        >
          <div class="m-card-header">
            <div>
              <h3>{{ booking.customerName }}</h3>
              <span class="m-phone">{{ booking.customerPhone }}</span>
            </div>
            <span class="badge" :class="getStatusClass(booking.status)">
              {{ booking.status }}
            </span>
          </div>

          <div class="m-card-details">
            <div class="detail-line">
              <Icons name="calendar" :size="16" />
              <span>{{ booking.date }} ({{ booking.timeSlot }})</span>
            </div>
            <div class="detail-line">
              <Icons name="building" :size="16" />
              <span>{{ booking.eventType }} &bull; {{ booking.guests }} guests</span>
            </div>
            <div class="detail-line">
              <Icons name="payments" :size="16" />
              <span>
                Total: <strong>Rs. {{ booking.totalPrice.toLocaleString() }}</strong>
                <span v-if="booking.totalPrice - booking.paidAmount > 0" class="text-orange">
                  (Unpaid: Rs. {{ (booking.totalPrice - booking.paidAmount).toLocaleString() }})
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Booking Details Side Drawer Panel -->
    <div v-if="bookingDrawerOpen" class="drawer-overlay no-print" @click="closeDrawer">
      <div class="drawer-container animate-slide" @click.stop>
        <div class="drawer-header">
          <h2>Booking Details</h2>
          <button @click="closeDrawer" class="close-btn">
            <Icons name="plus" :size="24" style="transform: rotate(45deg);" />
          </button>
        </div>

        <div v-if="currentBooking" class="drawer-content custom-scroll">
          <!-- Customer Profile Section -->
          <div class="drawer-section">
            <div class="section-title">
              <Icons name="user" :size="18" />
              <h3>Customer Information</h3>
            </div>
            <div class="info-grid">
              <div>
                <label>Name</label>
                <p>{{ currentBooking.customerName }}</p>
              </div>
              <div>
                <label>Phone</label>
                <p>{{ currentBooking.customerPhone }}</p>
              </div>
              <div v-if="currentBooking.customerEmail">
                <label>Email</label>
                <p>{{ currentBooking.customerEmail }}</p>
              </div>
            </div>
          </div>

          <!-- Event Specifications Section -->
          <div class="drawer-section">
            <div class="section-title">
              <Icons name="calendar" :size="18" />
              <h3>Event Details</h3>
            </div>
            <div class="info-grid">
              <div>
                <label>Event Date</label>
                <p>{{ currentBooking.date }}</p>
              </div>
              <div>
                <label>Time Slot</label>
                <p>{{ currentBooking.timeSlot }}</p>
              </div>
              <div>
                <label>Event Type</label>
                <p>{{ currentBooking.eventType }}</p>
              </div>
              <div>
                <label>Estimated Guests</label>
                <p>{{ currentBooking.guests }} guests</p>
              </div>
              <div>
                <label>Selected Package</label>
                <p>{{ getPackageName(currentBooking.packageId) }}</p>
              </div>
            </div>
            
            <div class="notes-display" v-if="currentBooking.notes">
              <label>Special Instructions & Notes</label>
              <p>{{ currentBooking.notes }}</p>
            </div>
          </div>

          <!-- Billing & Payment Details -->
          <div class="drawer-section">
            <div class="section-title">
              <Icons name="payments" :size="18" />
              <h3>Billing & Balances</h3>
            </div>
            <div class="billing-summary">
              <div class="billing-row">
                <span>Base Cost:</span>
                <span>Rs. {{ currentBooking.basePrice.toLocaleString() }}</span>
              </div>
              <div class="billing-row text-red-light" v-if="currentBooking.discount > 0">
                <span>Discount Applied:</span>
                <span>-Rs. {{ currentBooking.discount.toLocaleString() }}</span>
              </div>
              <div class="billing-row" v-if="currentBooking.tax > 0">
                <span>Tax (13% PRA/GST):</span>
                <span>+Rs. {{ currentBooking.tax.toLocaleString() }}</span>
              </div>
              <div class="billing-row total-row">
                <span>Net Total:</span>
                <span>Rs. {{ currentBooking.totalPrice.toLocaleString() }}</span>
              </div>
              <div class="billing-row paid-row">
                <span>Paid Amount:</span>
                <span>Rs. {{ currentBooking.paidAmount.toLocaleString() }}</span>
              </div>
              <div class="billing-row balance-row" :class="{ clear: currentBooking.totalPrice - currentBooking.paidAmount === 0 }">
                <span>Remaining Balance:</span>
                <span>Rs. {{ (currentBooking.totalPrice - currentBooking.paidAmount).toLocaleString() }}</span>
              </div>
            </div>

            <!-- Record Payment / Invoice buttons -->
            <div class="drawer-actions">
              <button 
                v-if="currentBooking.totalPrice - currentBooking.paidAmount > 0 && hasPermission('payments_edit')" 
                @click="openPaymentModal" 
                class="btn btn-success btn-sm btn-full"
              >
                <Icons name="credit-card" :size="16" />
                Record Payment
              </button>
              
              <button @click="isInvoicePrintOpen = true" class="btn btn-secondary btn-sm btn-full">
                <Icons name="print" :size="16" />
                Generate Invoice
              </button>
            </div>
          </div>

          <!-- Transaction Logs -->
          <div class="drawer-section">
            <div class="section-title">
              <Icons name="info" :size="18" />
              <h3>Transaction Log</h3>
            </div>
            
            <div v-if="getPaymentHistory.length === 0" class="empty-logs">
              No payments recorded for this booking yet.
            </div>
            
            <div v-else class="timeline">
              <div v-for="pay in getPaymentHistory" :key="pay.id" class="timeline-item">
                <div class="timeline-dot"></div>
                <div class="timeline-info">
                  <div class="timeline-top">
                    <span class="timeline-amount">Rs. {{ pay.amount.toLocaleString() }}</span>
                    <span class="timeline-date">{{ pay.date }}</span>
                  </div>
                  <p class="timeline-desc">{{ pay.notes }} &bull; Method: <strong>{{ pay.method }}</strong></p>
                </div>
              </div>
            </div>
          </div>

          <!-- Status updates & delete -->
          <div class="drawer-section border-top">
            <div class="status-selector">
              <label>Update Status</label>
              <div class="status-buttons">
                <button 
                  v-for="st in ['Confirmed', 'Pending', 'Completed', 'Cancelled']" 
                  :key="st" 
                  class="btn btn-sm"
                  :class="currentBooking.status === st ? getStatusClass(st) : 'btn-secondary'"
                  @click="updateStatus(currentBooking.id, st)"
                >
                  {{ st }}
                </button>
              </div>
            </div>

            <div class="drawer-danger-zone">
              <button v-if="hasPermission('bookings_edit')" @click="openEditModal(currentBooking)" class="btn btn-secondary btn-sm">
                <Icons name="edit" :size="16" />
                Edit Details
              </button>
              
              <button v-if="hasPermission('bookings_edit')" @click="confirmDelete(currentBooking.id)" class="btn btn-danger btn-sm">
                <Icons name="trash" :size="16" />
                Delete Booking
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Booking Form Modal (Add / Edit) -->
    <div v-if="isModalOpen" class="modal-overlay no-print">
      <div class="modal-container card animate-scale">
        <div class="modal-header">
          <h2>{{ isEditMode ? 'Modify Booking Details' : 'Create New Event Booking' }}</h2>
          <button @click="isModalOpen = false" class="close-btn">
            <Icons name="plus" :size="24" style="transform: rotate(45deg);" />
          </button>
        </div>

        <form @submit.prevent="handleFormSubmit" class="modal-form custom-scroll">
          <div v-if="formValidationError" class="alert alert-danger">
            <Icons name="info" :size="18" />
            <span>{{ formValidationError }}</span>
          </div>

          <div class="form-section-title">Client Details</div>
          
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Customer Name *</label>
              <input v-model="formCustomerName" type="text" class="form-control" placeholder="Jane Doe" required />
            </div>
            
            <div class="form-group">
              <label class="form-label">Phone Number *</label>
              <input v-model="formCustomerPhone" type="tel" class="form-control" placeholder="0300-1234567" required />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Email Address (Optional)</label>
            <input v-model="formCustomerEmail" type="email" class="form-control" placeholder="jane@example.com" />
          </div>

          <div class="form-section-title">Scheduling Details</div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Event Date *</label>
              <input v-model="formDate" type="date" class="form-control" required />
            </div>
            
            <div class="form-group">
              <label class="form-label">Time Slot *</label>
              <select v-model="formTimeSlot" class="form-control" @change="calculateBasePrice">
                <option value="Morning">Day / Lunch Slot (12:00 PM - 04:00 PM)</option>
                <option value="Evening">Night / Dinner Slot (07:00 PM - 11:00 PM)</option>
                <option value="Full Day">Full Day Booking</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Event Type / Occasion</label>
              <input v-model="formEventType" type="text" class="form-control" placeholder="e.g. Wedding, Reception, Conference" required />
            </div>
            
            <div class="form-group">
              <label class="form-label">Estimated Guest Attendance</label>
              <input v-model="formGuests" type="number" class="form-control" min="1" @input="calculateBasePrice" />
            </div>
          </div>

          <div class="form-section-title">Pricing Details</div>

          <div class="form-group">
            <label class="form-label">Choose Package Tiers</label>
            <select v-model="formPackageId" class="form-control" @change="calculateBasePrice">
              <option v-for="pkg in store.packages" :key="pkg.id" :value="pkg.id">
                {{ pkg.name }} ({{ pkg.type === 'per-guest' ? `Rs. ${pkg.price}/head` : `Rs. ${pkg.price.toLocaleString()} flat` }})
              </option>
              <option value="">Custom Setup (Manual Override)</option>
            </select>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Base Price (Rs.)</label>
              <input v-model="formBasePrice" type="number" class="form-control" min="0" />
            </div>
            
            <div class="form-group">
              <label class="form-label">Discount Amount (Rs.)</label>
              <input v-model="formDiscount" type="number" class="form-control" min="0" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Calculated Tax (13% PRA/GST) (Rs.)</label>
              <input v-model="formTax" type="number" class="form-control" min="0" />
            </div>
            
            <div class="form-group">
              <label class="form-label">Advance/Deposit Paid (Rs.)</label>
              <input v-model="formPaidAmount" type="number" class="form-control" min="0" :disabled="isEditMode" />
            </div>
          </div>

          <!-- Total Calculation Banner -->
          <div class="total-banner">
            <div class="total-title">Total Due:</div>
            <div class="total-value">Rs. {{ formTotalPrice.toLocaleString() }}</div>
          </div>

          <div class="form-group">
            <label class="form-label">Special Requests / Notes</label>
            <textarea v-model="formNotes" class="form-control" rows="3" placeholder="Enter special requests, decorative themes, or catering notes..."></textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Status</label>
              <select v-model="formStatus" class="form-control">
                <option value="Pending">Pending Approval</option>
                <option value="Confirmed">Confirmed Booked</option>
                <option value="Completed" :disabled="!isEditMode">Completed Event</option>
                <option value="Cancelled" :disabled="!isEditMode">Cancelled</option>
              </select>
            </div>
          </div>

          <div class="modal-actions">
            <button @click="isModalOpen = false" type="button" class="btn btn-secondary">Cancel</button>
            <button type="submit" class="btn btn-primary">
              <Icons name="check" :size="18" />
              {{ isEditMode ? 'Update Details' : 'Create Booking' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Record Payment Modal -->
    <div v-if="isPaymentModalOpen" class="modal-overlay no-print">
      <div class="modal-container card modal-sm animate-scale">
        <div class="modal-header">
          <h2>Record Payment</h2>
          <button @click="isPaymentModalOpen = false" class="close-btn">
            <Icons name="plus" :size="24" style="transform: rotate(45deg);" />
          </button>
        </div>

        <form @submit.prevent="handlePaymentSubmit" class="modal-form">
          <div v-if="paymentError" class="alert alert-danger">
            <Icons name="info" :size="16" />
            <span>{{ paymentError }}</span>
          </div>

          <div class="form-group">
            <label class="form-label">Received Amount (Rs.) *</label>
            <input v-model="paymentAmount" type="number" class="form-control" min="1" step="any" required />
          </div>

          <div class="form-group">
            <label class="form-label">Payment Method</label>
            <select v-model="paymentMethod" class="form-control">
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Wire Transfer</option>
              <option value="Cheque">Cheque</option>
              <option value="Pay Order">Pay Order / Bank Draft</option>
              <option value="Online">Online Gateway / Mobile Pay</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Payment Note / Reference</label>
            <input v-model="paymentNotes" type="text" class="form-control" placeholder="e.g. Transaction Ref#, Cheque#, cash memo" />
          </div>

          <div class="modal-actions">
            <button @click="isPaymentModalOpen = false" type="button" class="btn btn-secondary">Cancel</button>
            <button type="submit" class="btn btn-success">
              <Icons name="check" :size="16" />
              Save Payment
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Invoice Print Modal Overlay -->
    <div v-if="isInvoicePrintOpen" class="invoice-modal-overlay">
      <div class="invoice-container card animate-scale">
        <div class="invoice-controls no-print">
          <button @click="isInvoicePrintOpen = false" class="btn btn-secondary">
            <Icons name="arrow-left" :size="16" /> Back
          </button>
          <button @click="window.print()" class="btn btn-primary">
            <Icons name="print" :size="16" /> Print Invoice
          </button>
        </div>
        
        <div class="invoice-layout" v-if="currentBooking">
          <div class="invoice-header">
            <div class="inv-brand">
              <Icons name="building" :size="36" />
              <div>
                <h2>{{ store.hallDetails.name }}</h2>
                <p>{{ store.hallDetails.address || 'Location Address Not Set' }}</p>
                <p>Phone: {{ store.hallDetails.phone || 'N/A' }}</p>
              </div>
            </div>
            <div class="inv-meta">
              <h1>BOOKING INVOICE</h1>
              <p>Invoice #: <strong>INV-{{ currentBooking.id.split('_')[1] }}</strong></p>
              <p>Date Generated: <strong>{{ new Date().toISOString().split('T')[0] }}</strong></p>
              <p>Booking Status: <strong>{{ currentBooking.status }}</strong></p>
            </div>
          </div>

          <hr class="inv-divider" />

          <div class="invoice-billing-details">
            <div class="bill-to">
              <h3>Billed To:</h3>
              <p><strong>{{ currentBooking.customerName }}</strong></p>
              <p>Phone: {{ currentBooking.customerPhone }}</p>
              <p v-if="currentBooking.customerEmail">Email: {{ currentBooking.customerEmail }}</p>
            </div>
            
            <div class="event-details-col">
              <h3>Event Scheduling:</h3>
              <p>Occasion: <strong>{{ currentBooking.eventType }}</strong></p>
              <p>Date: <strong>{{ currentBooking.date }}</strong></p>
              <p>Time Slot: <strong>{{ currentBooking.timeSlot }}</strong></p>
              <p>Guests: <strong>{{ currentBooking.guests }} Pax</strong></p>
            </div>
          </div>

          <table class="invoice-items-table">
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align: right;">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>Package Hire: {{ getPackageName(currentBooking.packageId) }}</strong>
                  <p class="desc-detail">{{ currentBooking.guests }} guest occupancy configuration.</p>
                </td>
                <td style="text-align: right;">Rs. {{ currentBooking.basePrice.toLocaleString() }}</td>
              </tr>
              <tr v-if="currentBooking.discount > 0">
                <td>
                  <strong>Discount Deduction</strong>
                </td>
                <td style="text-align: right; color: var(--danger-text);">-–Rs. {{ currentBooking.discount.toLocaleString() }}</td>
              </tr>
              <tr v-if="currentBooking.tax > 0">
                <td>
                  <strong>Provincial Services Tax (13% PRA/GST)</strong>
                </td>
                <td style="text-align: right;">+Rs. {{ currentBooking.tax.toLocaleString() }}</td>
              </tr>
            </tbody>
          </table>

          <div class="invoice-summary-block">
            <div class="inv-summary-row">
              <span>Gross Total:</span>
              <span>Rs. {{ currentBooking.totalPrice.toLocaleString() }}</span>
            </div>
            <div class="inv-summary-row border-top">
              <span>Total Paid:</span>
              <span>Rs. {{ currentBooking.paidAmount.toLocaleString() }}</span>
            </div>
            <div class="inv-summary-row final-due">
              <span>Remaining Balance Due:</span>
              <span>Rs. {{ (currentBooking.totalPrice - currentBooking.paidAmount).toLocaleString() }}</span>
            </div>
          </div>

          <div class="invoice-footer">
            <p>Thank you for choosing {{ store.hallDetails.name }} for your celebrations!</p>
            <p class="footer-note">This is a digitally generated invoice copy. No physical signature is required.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bookings-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.header-row {
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

/* Filters Bar */
.filters-bar {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;
  padding: 1.25rem;
  align-items: end;
}

@media (min-width: 1024px) {
  .filters-bar {
    grid-template-columns: 0.8fr 1.2fr;
  }
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

.filter-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 0.75rem;
  width: 100%;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.control-group label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-muted);
}

/* Desktop Bookings Table */
.table-container {
  overflow-x: auto;
  padding: 0;
}

.bookings-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.925rem;
}

.bookings-table th {
  padding: 1rem 1.25rem;
  background-color: var(--bg-tertiary);
  font-weight: 700;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-color);
}

.bookings-table td {
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

.customer-cell {
  display: flex;
  flex-direction: column;
}

.cust-name {
  font-weight: 600;
  color: var(--text-primary);
}

.cust-phone {
  font-size: 0.775rem;
  color: var(--text-muted);
}

.slot-tag {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
}

.slot-tag.morning { background-color: rgba(59, 130, 246, 0.1); color: #3b82f6; }
.slot-tag.evening { background-color: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
.slot-tag.full-day { background-color: rgba(16, 185, 129, 0.1); color: var(--success); }

.price-cell {
  display: flex;
  flex-direction: column;
}

.price-total {
  font-weight: 700;
}

.price-pending {
  font-size: 0.75rem;
  color: var(--warning-text);
  font-weight: 600;
}

.price-settled {
  font-size: 0.75rem;
  color: var(--success);
  font-weight: 600;
}

.row-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.btn-icon {
  border: none;
  background: transparent;
  padding: 0.4rem;
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:hover {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
}

.btn-icon.text-red:hover {
  background-color: var(--danger-bg);
  color: var(--danger);
}

.empty-bookings {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 4rem 2rem;
  gap: 0.75rem;
}

.empty-bookings h3 {
  font-size: 1.25rem;
}

.empty-bookings p {
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

/* Mobile Layout Grid */
.mobile-bookings-grid {
  display: none;
  flex-direction: column;
  gap: 1rem;
}

.mobile-card {
  padding: 1.25rem;
}

.m-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.m-card-header h3 {
  font-size: 1.1rem;
  font-weight: 700;
}

.m-phone {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.m-card-details {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.detail-line {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.detail-line svg {
  color: var(--text-muted);
}

.text-orange {
  color: var(--warning-text);
  font-weight: 600;
}

@media (max-width: 767px) {
  .table-container {
    display: none;
  }
  .mobile-bookings-grid {
    display: flex;
  }
}

/* Side Drawer Component */
.drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(4px);
  z-index: 100;
  display: flex;
  justify-content: flex-end;
}

.drawer-container {
  width: 100%;
  max-width: 480px;
  height: 100%;
  background-color: var(--bg-secondary);
  box-shadow: var(--shadow-xl);
  display: flex;
  flex-direction: column;
}

.drawer-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.drawer-content {
  flex: 1;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.drawer-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.drawer-section.border-top {
  border-top: 1px solid var(--border-color);
  padding-top: 1.5rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--primary);
  font-weight: 700;
}

.section-title h3 {
  font-size: 0.95rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-primary);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem 0.5rem;
}

.info-grid label, .notes-display label, .billing-summary span, .status-selector label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-muted);
  display: block;
}

.info-grid p {
  font-weight: 600;
  color: var(--text-primary);
  margin-top: 0.15rem;
  font-size: 0.95rem;
}

.notes-display {
  background-color: var(--bg-primary);
  padding: 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  font-size: 0.875rem;
}

.notes-display p {
  margin-top: 0.25rem;
  color: var(--text-secondary);
}

.billing-summary {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  background-color: var(--bg-primary);
  padding: 1rem;
  border-radius: 10px;
  border: 1px solid var(--border-color);
}

.billing-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.billing-row.total-row {
  border-top: 1px dashed var(--border-color);
  padding-top: 0.5rem;
  font-weight: 700;
  color: var(--text-primary);
  font-size: 1rem;
}

.billing-row.paid-row {
  color: var(--success);
  font-weight: 600;
}

.billing-row.balance-row {
  color: var(--danger);
  font-weight: 700;
  font-size: 1rem;
}

.billing-row.balance-row.clear {
  color: var(--success);
}

.text-red-light {
  color: var(--danger-text);
}

.drawer-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.empty-logs {
  font-size: 0.85rem;
  color: var(--text-muted);
  text-align: center;
  padding: 1rem;
}

/* Timeline Components */
.timeline {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-left: 0.5rem;
}

.timeline-item {
  display: flex;
  gap: 1rem;
  position: relative;
}

.timeline-item::before {
  content: '';
  position: absolute;
  left: 4px;
  top: 12px;
  bottom: -20px;
  width: 2px;
  background-color: var(--border-color);
}

.timeline-item:last-child::before {
  display: none;
}

.timeline-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: var(--success);
  margin-top: 4px;
  z-index: 2;
}

.timeline-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.timeline-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.timeline-amount {
  font-weight: 700;
  font-size: 0.9rem;
}

.timeline-date {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.timeline-desc {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.status-buttons {
  display: flex;
  gap: 0.35rem;
  margin-top: 0.35rem;
  flex-wrap: wrap;
}

.drawer-danger-zone {
  display: flex;
  justify-content: space-between;
  margin-top: 1.5rem;
  gap: 0.75rem;
}

/* Modals General Styling */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(4px);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.modal-container {
  width: 100%;
  max-width: 680px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  padding: 0;
}

.modal-container.modal-sm {
  max-width: 420px;
}

.modal-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.close-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-form {
  padding: 1.5rem;
  flex: 1;
  overflow-y: auto;
}

.form-section-title {
  font-size: 0.8rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--primary);
  margin-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0.25rem;
  margin-top: 0.5rem;
}

.total-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--bg-accent-soft);
  padding: 1rem;
  border-radius: 10px;
  border: 1px solid var(--primary-glow);
  margin-bottom: 1.25rem;
}

.total-title {
  font-weight: 700;
  color: var(--primary-hover);
}

.total-value {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--primary-hover);
  font-family: var(--font-heading);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  border-top: 1px solid var(--border-color);
  padding-top: 1.25rem;
  margin-top: 1.25rem;
}

/* Invoice Modal Specific Styling */
.invoice-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #0b0f19;
  z-index: 300;
  display: flex;
  justify-content: center;
  overflow-y: auto;
  padding: 2rem;
}

@media(max-width: 640px) {
  .invoice-modal-overlay {
    padding: 0;
  }
}

.invoice-container {
  width: 100%;
  max-width: 800px;
  background: white !important;
  color: #1e293b !important;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-xl);
  padding: 2.5rem !important;
  height: max-content;
  border-radius: 12px;
}

@media(max-width: 640px) {
  .invoice-container {
    border-radius: 0;
    padding: 1.25rem !important;
  }
}

.invoice-controls {
  display: flex;
  justify-content: space-between;
  margin-bottom: 2rem;
}

.invoice-layout {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.invoice-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.inv-brand {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.inv-brand svg {
  color: #4f46e5;
}

.inv-brand h2 {
  color: #0f172a !important;
}

.inv-brand p {
  font-size: 0.85rem;
  color: #64748b;
}

.inv-meta {
  text-align: right;
}

.inv-meta h1 {
  font-size: 1.5rem;
  color: #4f46e5;
  margin-bottom: 0.5rem;
}

.inv-meta p {
  font-size: 0.85rem;
  color: #64748b;
}

.inv-divider {
  border: 0;
  border-top: 2px solid #e2e8f0;
}

.invoice-billing-details {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
}

@media (min-width: 640px) {
  .invoice-billing-details {
    grid-template-columns: 1fr 1fr;
  }
}

.invoice-billing-details h3 {
  font-size: 0.8rem;
  color: #94a3b8;
  text-transform: uppercase;
  margin-bottom: 0.5rem;
}

.invoice-billing-details p {
  font-size: 0.95rem;
  color: #334155;
  line-height: 1.4;
}

.invoice-items-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}

.invoice-items-table th {
  background: #f8fafc;
  padding: 0.75rem 1rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  border-bottom: 2px solid #e2e8f0;
}

.invoice-items-table td {
  padding: 1.25rem 1rem;
  border-bottom: 1px solid #f1f5f9;
  font-size: 0.95rem;
  color: #334155;
}

.desc-detail {
  font-size: 0.8rem;
  color: #64748b;
  margin-top: 0.25rem;
}

.invoice-summary-block {
  align-self: flex-end;
  width: 100%;
  max-width: 320px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
}

.inv-summary-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  color: #475569;
}

.inv-summary-row.border-top {
  border-top: 1px dashed #cbd5e1;
  padding-top: 0.5rem;
}

.inv-summary-row.final-due {
  font-size: 1.1rem;
  font-weight: 800;
  color: #0f172a;
  border-top: 2px solid #4f46e5;
  padding-top: 0.75rem;
  margin-top: 0.25rem;
}

.invoice-footer {
  text-align: center;
  margin-top: 3rem;
  color: #64748b;
  font-size: 0.85rem;
}

.footer-note {
  font-size: 0.75rem;
  color: #94a3b8;
  margin-top: 0.5rem;
}
</style>
