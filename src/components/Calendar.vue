<script setup>
import { ref, computed } from 'vue'
import { store } from '../store'
import Icons from './Icons.vue'

const emit = defineEmits(['create-booking', 'view-booking'])

const today = new Date()
const currentYear = ref(today.getFullYear())
const currentMonth = ref(today.getMonth()) // 0-indexed

// Month navigation
const prevMonth = () => {
  if (currentMonth.value === 0) {
    currentMonth.value = 11
    currentYear.value -= 1
  } else {
    currentMonth.value -= 1
  }
}

const nextMonth = () => {
  if (currentMonth.value === 11) {
    currentMonth.value = 0
    currentYear.value += 1
  } else {
    currentMonth.value += 1
  }
}

// Active Date Details
const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const currentMonthLabel = computed(() => {
  return `${monthNames[currentMonth.value]} ${currentYear.value}`
})

// Generate days grid
const daysInActiveMonth = computed(() => {
  const year = currentYear.value
  const month = currentMonth.value
  
  // Total days in month
  const totalDays = new Date(year, month + 1, 0).getDate()
  
  // First day of month (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const firstDayIndex = new Date(year, month, 1).getDay()
  
  const days = []
  
  // Pad preceding blank days
  for (let i = 0; i < firstDayIndex; i++) {
    days.push({ isBlank: true })
  }
  
  // Populate actual month days
  for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
    // Zero-padded month and day for ISO matching: YYYY-MM-DD
    const mm = (month + 1).toString().padStart(2, '0')
    const dd = dayNum.toString().padStart(2, '0')
    const dateStr = `${year}-${mm}-${dd}`
    
    // Find bookings on this date
    const bookings = store.bookings.filter(b => b.date === dateStr && b.status !== 'Cancelled')
    
    const isToday = today.getDate() === dayNum && 
                    today.getMonth() === month && 
                    today.getFullYear() === year

    days.push({
      isBlank: false,
      dayNumber: dayNum,
      dateString: dateStr,
      bookings,
      isToday
    })
  }
  
  return days
})

// Selected Date Drawer State (for viewing daily agenda on click)
const selectedDayData = ref(null)

const selectDay = (day) => {
  if (day.isBlank) return
  selectedDayData.value = day
}

const closeDayDrawer = () => {
  selectedDayData.value = null
}

const handleQuickBook = (dateStr) => {
  selectedDayData.value = null
  emit('create-booking', dateStr)
}

const getSlotColorClass = (slot) => {
  if (slot === 'Morning') return 'dot-morning'
  if (slot === 'Evening') return 'dot-evening'
  return 'dot-full'
}
</script>

<template>
  <div class="calendar-container animate-fade">
    <div class="calendar-header-row">
      <div>
        <h1 class="page-title">Event Scheduler</h1>
        <p class="subtitle">Quickly review availability slots and booked dates.</p>
      </div>

      <!-- Month Navigation Toggles -->
      <div class="month-nav">
        <button @click="prevMonth" class="btn btn-secondary nav-btn" title="Previous Month">
          <Icons name="chevron-left" :size="20" />
        </button>
        <h2 class="active-month-name">{{ currentMonthLabel }}</h2>
        <button @click="nextMonth" class="btn btn-secondary nav-btn" title="Next Month">
          <Icons name="chevron-right" :size="20" />
        </button>
      </div>
    </div>

    <!-- Calendar Layout Grid -->
    <div class="calendar-layout card">
      <!-- Weekday Headers -->
      <div class="weekdays-grid">
        <span v-for="dayName in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']" :key="dayName" class="weekday-name">
          {{ dayName }}
        </span>
      </div>

      <!-- Calendar Days Grid -->
      <div class="days-grid">
        <div 
          v-for="(day, index) in daysInActiveMonth" 
          :key="index"
          class="calendar-day-cell"
          :class="{ 
            'blank-cell': day.isBlank, 
            'today-cell': day.isToday,
            'has-bookings': day.bookings?.length > 0,
            'active-cell': selectedDayData && selectedDayData.dateString === day.dateString
          }"
          @click="selectDay(day)"
        >
          <template v-if="!day.isBlank">
            <span class="day-number">{{ day.dayNumber }}</span>
            
            <!-- Bookings dots/indicators -->
            <div v-if="day.bookings.length > 0" class="slot-dots">
              <span 
                v-for="b in day.bookings" 
                :key="b.id" 
                class="slot-dot" 
                :class="getSlotColorClass(b.timeSlot)"
                :title="`${b.customerName} - ${b.eventType} (${b.timeSlot})`"
              ></span>
            </div>
            
            <!-- Text summaries on larger screens -->
            <div class="day-summaries" v-if="day.bookings.length > 0">
              <div 
                v-for="b in day.bookings.slice(0, 2)" 
                :key="b.id" 
                class="day-booking-summary"
                :class="b.timeSlot.toLowerCase().replace(' ', '-')"
              >
                {{ b.eventType }} ({{ b.timeSlot === 'Full Day' ? 'All' : b.timeSlot.slice(0,1) }})
              </div>
              <div v-if="day.bookings.length > 2" class="more-summary">
                +{{ day.bookings.length - 2 }} more
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Color Legend Indicators -->
    <div class="calendar-legend card">
      <h4>Slot Indicators:</h4>
      <div class="legend-items">
        <div class="legend-item">
          <span class="legend-dot dot-morning"></span>
          <span>Day / Lunch Slot Booked</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot dot-evening"></span>
          <span>Night / Dinner Slot Booked</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot dot-full"></span>
          <span>Full Day Blocked</span>
        </div>
      </div>
    </div>

    <!-- Daily Agenda Pop-up Drawer -->
    <div v-if="selectedDayData" class="day-drawer-overlay" @click="closeDayDrawer">
      <div class="day-drawer-container card animate-scale" @click.stop>
        <div class="drawer-header">
          <div>
            <h3>Schedule for {{ selectedDayData.dateString }}</h3>
            <p v-if="selectedDayData.isToday" class="today-tag">Today</p>
          </div>
          <button @click="closeDayDrawer" class="close-btn">
            <Icons name="plus" :size="24" style="transform: rotate(45deg);" />
          </button>
        </div>

        <div class="drawer-content">
          <!-- Empty State -->
          <div v-if="selectedDayData.bookings.length === 0" class="empty-agenda">
            <Icons name="check-circle" :size="48" class="text-green" />
            <p>This date is fully available!</p>
            <button @click="handleQuickBook(selectedDayData.dateString)" class="btn btn-primary btn-sm">
              <Icons name="plus" :size="16" />
              Book Date Now
            </button>
          </div>

          <!-- Agenda List -->
          <div v-else class="agenda-list">
            <div 
              v-for="b in selectedDayData.bookings" 
              :key="b.id" 
              class="agenda-item"
              @click="emit('view-booking', b); closeDayDrawer()"
            >
              <div class="agenda-badge" :class="b.timeSlot.toLowerCase().replace(' ', '-')">
                {{ b.timeSlot }}
              </div>
              <div class="agenda-info">
                <h4>{{ b.customerName }}</h4>
                <p>{{ b.eventType }} &bull; {{ b.guests }} Guests</p>
                <div class="agenda-meta">
                  <span>Val: <strong>Rs. {{ b.totalPrice.toLocaleString() }}</strong></span>
                  <span v-if="b.totalPrice - b.paidAmount > 0" class="text-red">Unpaid: Rs. {{ (b.totalPrice - b.paidAmount).toLocaleString() }}</span>
                  <span v-else class="text-green">Paid</span>
                </div>
              </div>
              <Icons name="chevron-right" :size="18" class="agenda-arrow" />
            </div>

            <!-- Quick Book button if slot is partially empty -->
            <button 
              v-if="selectedDayData.bookings.length < 2 && !selectedDayData.bookings.some(b => b.timeSlot === 'Full Day')" 
              @click="handleQuickBook(selectedDayData.dateString)" 
              class="btn btn-secondary btn-sm btn-full quick-book-add"
            >
              <Icons name="plus" :size="16" />
              Book Remaining Slot
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.calendar-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.calendar-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.25rem;
}

.month-nav {
  display: flex;
  align-items: center;
  gap: 1rem;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  padding: 0.35rem 0.5rem;
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
}

.active-month-name {
  font-size: 1.1rem;
  font-weight: 700;
  min-width: 140px;
  text-align: center;
}

.nav-btn {
  padding: 0.4rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: transparent;
  border: none;
}

.nav-btn:hover {
  background-color: var(--bg-tertiary);
}

/* Calendar Core Grid layout */
.calendar-layout {
  padding: 1.25rem;
}

.weekdays-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  font-weight: 700;
  font-size: 0.8rem;
  text-transform: uppercase;
  color: var(--text-muted);
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0.75rem;
  margin-bottom: 0.5rem;
}

.days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.calendar-day-cell {
  aspect-ratio: 1;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 0.4rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;
}

.calendar-day-cell:not(.blank-cell):hover {
  background-color: var(--bg-accent-soft);
  border-color: var(--primary);
  transform: scale(1.02);
  z-index: 5;
}

.blank-cell {
  background-color: transparent;
  border-color: transparent;
  cursor: default;
  pointer-events: none;
}

.day-number {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.today-cell {
  border: 2px solid var(--primary);
}

.today-cell .day-number {
  color: var(--primary);
}

.active-cell {
  background-color: var(--bg-accent-soft) !important;
  border: 2px solid var(--primary) !important;
}

/* Dots and summaries */
.slot-dots {
  display: flex;
  gap: 3px;
  justify-content: center;
  align-items: center;
  margin-top: auto;
}

.slot-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.dot-morning { background-color: #3b82f6; }
.dot-evening { background-color: #8b5cf6; }
.dot-full { background-color: var(--success); }

/* Text summaries for desktop (Min width 900px) */
.day-summaries {
  display: none;
  flex-direction: column;
  gap: 2px;
  margin-top: 0.25rem;
  width: 100%;
}

.day-booking-summary {
  font-size: 0.65rem;
  padding: 0.15rem 0.25rem;
  border-radius: 4px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
  line-height: 1.2;
}

.day-booking-summary.morning { background-color: rgba(59, 130, 246, 0.1); color: #3b82f6; }
.day-booking-summary.evening { background-color: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
.day-booking-summary.full-day { background-color: var(--success-bg); color: var(--success-text); }

.more-summary {
  font-size: 0.6rem;
  color: var(--text-muted);
  font-weight: 700;
  text-align: center;
}

@media (min-width: 900px) {
  .calendar-day-cell {
    aspect-ratio: 1.1;
  }
  .slot-dots {
    display: none;
  }
  .day-summaries {
    display: flex;
  }
}

/* Legend styling */
.calendar-legend {
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.calendar-legend h4 {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.legend-items {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-weight: 600;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

/* Agenda pop up drawer */
.day-drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(4px);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.day-drawer-container {
  width: 100%;
  max-width: 420px;
  padding: 0;
}

.drawer-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.drawer-header h3 {
  font-size: 1.1rem;
  font-weight: 700;
}

.today-tag {
  background-color: var(--primary-glow);
  color: var(--primary);
  display: inline-block;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 700;
  margin-top: 0.25rem;
}

.drawer-content {
  padding: 1.5rem;
}

.empty-agenda {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 0.75rem;
  padding: 2rem 0;
}

.empty-agenda p {
  color: var(--text-secondary);
}

.agenda-list {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.agenda-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.875rem;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.agenda-item:hover {
  transform: translateY(-1px);
  border-color: var(--border-hover);
  background-color: var(--bg-secondary);
  box-shadow: var(--shadow-sm);
}

.agenda-badge {
  padding: 0.35rem 0.5rem;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  writing-mode: vertical-lr;
  text-orientation: mixed;
  text-align: center;
  line-height: 1;
}

.agenda-badge.morning { background-color: rgba(59, 130, 246, 0.1); color: #3b82f6; }
.agenda-badge.evening { background-color: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
.agenda-badge.full-day { background-color: rgba(16, 185, 129, 0.1); color: var(--success); }

.agenda-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.agenda-info h4 {
  font-size: 0.95rem;
  font-weight: 700;
}

.agenda-info p {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.agenda-meta {
  display: flex;
  gap: 0.75rem;
  font-size: 0.75rem;
  margin-top: 0.15rem;
  color: var(--text-muted);
}

.text-red { color: var(--danger-text); font-weight: 600; }
.text-green { color: var(--success-text); font-weight: 600; }

.agenda-arrow {
  color: var(--text-muted);
}

.quick-book-add {
  margin-top: 0.5rem;
  border: 1px dashed var(--border-hover);
}
</style>
