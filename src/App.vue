<script setup>
import { ref, onMounted, nextTick, computed } from 'vue'
import { 
  store, 
  loadSession, 
  setSession, 
  initTheme, 
  setTheme, 
  seedDemoData,
  hasPermission
} from './store'
import Auth from './components/Auth.vue'
import Dashboard from './components/Dashboard.vue'
import Bookings from './components/Bookings.vue'
import Calendar from './components/Calendar.vue'
import Customers from './components/Customers.vue'
import Packages from './components/Packages.vue'
import Payments from './components/Payments.vue'
import Settings from './components/Settings.vue'
import Staff from './components/Staff.vue'
import Icons from './components/Icons.vue'

// Top notifications bell dropdown state
const notificationsOpen = ref(false)
const userDropdownOpen = ref(false)

// Select booking payload when navigating from another view (e.g. Calendar -> Bookings drawer)
const selectedBookingForDrawer = ref(null)

onMounted(() => {
  initTheme()
  loadSession()
  enforceInitialView()
})

const enforceInitialView = () => {
  if (!store.currentOwner) return
  
  const activeItem = [
    { id: 'dashboard', perm: 'dashboard_view' },
    { id: 'bookings', perm: 'bookings_view' },
    { id: 'calendar', perm: 'calendar_view' },
    { id: 'customers', perm: 'customers_view' },
    { id: 'packages', perm: 'packages_view' },
    { id: 'payments', perm: 'payments_view' },
    { id: 'settings', perm: 'settings_view' },
    { id: 'staff', perm: 'staff_manage' }
  ].find(item => item.id === store.activeView)
  
  if (activeItem && hasPermission(activeItem.perm)) {
    return
  }
  
  const firstAvailable = [
    { id: 'dashboard', perm: 'dashboard_view' },
    { id: 'bookings', perm: 'bookings_view' },
    { id: 'calendar', perm: 'calendar_view' },
    { id: 'customers', perm: 'customers_view' },
    { id: 'packages', perm: 'packages_view' },
    { id: 'payments', perm: 'payments_view' },
    { id: 'settings', perm: 'settings_view' },
    { id: 'staff', perm: 'staff_manage' }
  ].find(item => hasPermission(item.perm))
  
  if (firstAvailable) {
    store.activeView = firstAvailable.id
  } else {
    handleLogout()
  }
}

const handleLoginSuccess = (loginResult) => {
  if (loginResult.type === 'demo-staff') {
    const demoOwner = {
      id: 'owner_demo',
      ownerName: 'Demo Owner',
      email: 'demo@palace.com',
      hallName: 'Garrison Marquee & Banquet Hall',
      hallType: 'marriage',
      address: 'Khyber Road, Cantonment, Lahore, Pakistan',
      capacity: 1200,
      phone: '042-36601234'
    }
    setSession(demoOwner)
    seedDemoData()
    const sarah = store.staff.find(s => s.email === 'sarah@palace.com')
    setSession(demoOwner, sarah)
  } else if (loginResult.isDemo || (loginResult.type === 'owner' && loginResult.data.isDemo)) {
    const demoOwner = {
      id: 'owner_demo',
      ownerName: 'Demo Owner',
      email: 'demo@palace.com',
      hallName: 'Garrison Marquee & Banquet Hall',
      hallType: 'marriage',
      address: 'Khyber Road, Cantonment, Lahore, Pakistan',
      capacity: 1200,
      phone: '042-36601234'
    }
    setSession(demoOwner)
    seedDemoData()
  } else if (loginResult.type === 'staff') {
    setSession(loginResult.owner, loginResult.staff)
  } else if (loginResult.type === 'owner') {
    setSession(loginResult.data)
  } else {
    setSession(loginResult)
  }
  
  enforceInitialView()
}

const handleLogout = () => {
  userDropdownOpen.value = false
  setSession(null)
}

const toggleTheme = () => {
  const next = store.theme === 'light' ? 'dark' : 'light'
  setTheme(next)
}

// Navigates and auto-clears initial payloads
const navigateTo = (view) => {
  store.activeView = view
  notificationsOpen.value = false
  userDropdownOpen.value = false
}

// Triggered when clicking an event or pending action from another page
const handleViewBooking = (booking) => {
  if (!booking) return
  
  // Set payload
  selectedBookingForDrawer.value = booking
  
  // Navigate to Bookings tab
  store.activeView = 'bookings'
  
  // Close overrides
  notificationsOpen.value = false
}

// Emitted by bookings when details drawer closes
const clearSelectedBooking = () => {
  selectedBookingForDrawer.value = null
}

const handleCalendarCreateBooking = (dateStr) => {
  // Navigate to bookings view
  store.activeView = 'bookings'
  
  // Delay slightly to let the Bookings component render, then click "New Booking" button
  nextTick(() => {
    const addBtn = document.querySelector('.header-row button')
    if (addBtn) addBtn.click()
    
    // Pre-fill date field
    nextTick(() => {
      const dateInput = document.querySelector('input[type="date"]')
      if (dateInput) {
        dateInput.value = dateStr
        // Trigger input event for Vue model binding
        dateInput.dispatchEvent(new Event('input'))
      }
    })
  })
}

// Active User Helpers
const activeUserName = computed(() => {
  return store.currentStaff ? store.currentStaff.name : (store.currentOwner?.ownerName || 'User')
})

const activeUserEmail = computed(() => {
  return store.currentStaff ? store.currentStaff.email : (store.currentOwner?.email || '')
})

// Dynamic navigation list based on permissions
const visibleNavigationItems = computed(() => {
  const allItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', perm: 'dashboard_view' },
    { id: 'bookings', label: 'Bookings', icon: 'bookings', perm: 'bookings_view' },
    { id: 'calendar', label: 'Calendar', icon: 'calendar', perm: 'calendar_view' },
    { id: 'customers', label: 'Customers', icon: 'customers', perm: 'customers_view' },
    { id: 'packages', label: 'Packages', icon: 'packages', perm: 'packages_view' },
    { id: 'payments', label: 'Payments', icon: 'payments', perm: 'payments_view' },
    { id: 'settings', label: 'Settings', icon: 'settings', perm: 'settings_view' },
    { id: 'staff', label: 'Staff & Roles', icon: 'shield', perm: 'staff_manage' }
  ]
  return allItems.filter(item => hasPermission(item.perm))
})

const getNotificationBadgeClass = (severity) => {
  if (severity === 'danger') return 'badge-danger'
  return 'badge-warning'
}
</script>

<template>
  <div class="app-layout" :data-theme="store.theme">
    <!-- Render Auth Page if no logged-in owner -->
    <Auth v-if="!store.currentOwner" @login-success="handleLoginSuccess" />

    <!-- Main SaaS Dashboard Frame -->
    <div v-else class="dashboard-frame">
      <!-- Side Navigation Panel (Desktop size) -->
      <aside class="sidebar-aside no-print">
        <div class="sidebar-brand">
          <div class="brand-logo">
            <Icons name="building" :size="24" stroke-width="2.5" />
          </div>
          <h2>HallBook<span>SaaS</span></h2>
        </div>

        <nav class="sidebar-nav">
          <button 
            v-for="item in visibleNavigationItems" 
            :key="item.id"
            :class="{ active: store.activeView === item.id }"
            @click="navigateTo(item.id)"
            class="nav-item"
          >
            <Icons :name="item.icon" :size="20" />
            <span>{{ item.label }}</span>
            <span v-if="item.id === 'bookings' && store.notifications.length > 0" class="sidebar-alert-dot"></span>
          </button>
        </nav>

        <div class="sidebar-footer">
          <div class="hall-indicator">
            <div class="hall-dot"></div>
            <div class="hall-info">
              <span class="hall-name">{{ store.hallDetails.name }}</span>
              <span class="hall-type">{{ store.hallDetails.type.toUpperCase() }}</span>
            </div>
          </div>
          
          <button @click="handleLogout" class="btn btn-secondary btn-full logout-btn">
            <Icons name="logout" :size="16" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <!-- Main Panel View Hub -->
      <div class="main-content-hub">
        <!-- Dashboard Top Header Bar (Desktop & Mobile view) -->
        <header class="top-header-bar no-print">
          <!-- Mobile Sidebar Toggle/Trigger Indicator -->
          <div class="header-logo-mobile">
            <div class="m-logo">
              <Icons name="building" :size="18" stroke-width="2.5" />
            </div>
            <h3>HallBook<span>SaaS</span></h3>
          </div>

          <div class="header-hall-name-desktop">
            <Icons name="building" :size="18" class="text-indigo" />
            <span>{{ store.hallDetails.name }}</span>
          </div>

          <div class="header-actions">
            <!-- Sleek Theme Toggle -->
            <button @click="toggleTheme" class="header-btn theme-toggle" title="Toggle Dark/Light Mode">
              <Icons :name="store.theme === 'light' ? 'moon' : 'sun'" :size="20" />
            </button>

            <!-- Notifications Center Dropdown -->
            <div class="dropdown-wrapper">
              <button 
                @click="notificationsOpen = !notificationsOpen; userDropdownOpen = false" 
                class="header-btn notification-bell" 
                :class="{ active: store.notifications.length > 0 }"
                title="Notifications & Alerts"
              >
                <Icons name="bell" :size="20" />
                <span v-if="store.notifications.length > 0" class="bell-badge-count">
                  {{ store.notifications.length }}
                </span>
              </button>

              <!-- Notifications Dropdown List Overlay -->
              <div v-if="notificationsOpen" class="dropdown-panel notifications-panel animate-scale">
                <div class="dropdown-header">
                  <h4>Alerts & Notices</h4>
                  <span class="badge badge-success">{{ store.notifications.length }} Pending</span>
                </div>
                <div class="dropdown-body custom-scroll">
                  <div 
                    v-for="noti in store.notifications" 
                    :key="noti.id" 
                    class="drop-noti-item"
                    @click="handleViewBooking(store.bookings.find(b => b.id === noti.bookingId))"
                  >
                    <div class="noti-badge-dot" :class="getNotificationBadgeClass(noti.severity)"></div>
                    <div class="noti-msg-block">
                      <h5>{{ noti.title }}</h5>
                      <p>{{ noti.message }}</p>
                    </div>
                  </div>
                  <div v-if="store.notifications.length === 0" class="dropdown-empty">
                    <Icons name="check-circle" :size="32" class="text-green" />
                    <p>No new warnings. All up to date!</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Profile Menu Dropdown -->
            <div class="dropdown-wrapper">
              <button @click="userDropdownOpen = !userDropdownOpen; notificationsOpen = false" class="header-profile-btn">
                <div class="profile-avatar">
                  {{ activeUserName.charAt(0).toUpperCase() }}
                </div>
                <span class="profile-name-span">{{ activeUserName.split(' ')[0] }}</span>
                <Icons name="plus" :size="12" style="transform: rotate(45deg); margin-left: 2px;" />
              </button>

              <!-- User Menu Dropdown Panel -->
              <div v-if="userDropdownOpen" class="dropdown-panel user-panel animate-scale">
                <div class="user-panel-info">
                  <h4>{{ activeUserName }}</h4>
                  <p>{{ activeUserEmail }}</p>
                </div>
                <hr class="drop-divider" />
                <button v-if="hasPermission('settings_view')" @click="navigateTo('settings')" class="drop-item">
                  <Icons name="settings" :size="16" />
                  <span>Venue Settings</span>
                </button>
                <button v-if="hasPermission('packages_view')" @click="navigateTo('packages')" class="drop-item">
                  <Icons name="packages" :size="16" />
                  <span>Configure Packages</span>
                </button>
                <hr class="drop-divider" />
                <button @click="handleLogout" class="drop-item text-red">
                  <Icons name="logout" :size="16" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <!-- Dynamic Main Scrollable View Panel -->
        <main class="main-page-scrollable custom-scroll">
          <Dashboard 
            v-if="store.activeView === 'dashboard'" 
            @navigate="navigateTo"
            @view-booking="handleViewBooking"
          />
          <Bookings 
            v-else-if="store.activeView === 'bookings'" 
            :initial-selected-booking="selectedBookingForDrawer"
            @clear-selected="clearSelectedBooking"
          />
          <Calendar 
            v-else-if="store.activeView === 'calendar'" 
            @create-booking="handleCalendarCreateBooking"
            @view-booking="handleViewBooking"
          />
          <Customers 
            v-else-if="store.activeView === 'customers'" 
            @view-booking="handleViewBooking"
          />
          <Packages 
            v-else-if="store.activeView === 'packages'" 
          />
          <Payments 
            v-else-if="store.activeView === 'payments'" 
            @view-booking="handleViewBooking"
          />
          <Settings 
            v-else-if="store.activeView === 'settings'" 
          />
          <Staff 
            v-else-if="store.activeView === 'staff'" 
          />
        </main>

        <!-- Bottom Navigation Bar Overlay (Mobile Screens Only) -->
        <nav 
          class="mobile-bottom-nav no-print" 
          :style="{ gridTemplateColumns: `repeat(${visibleNavigationItems.length}, 1fr)` }"
        >
          <button 
            v-for="item in visibleNavigationItems" 
            :key="'mobile-' + item.id"
            :class="{ active: store.activeView === item.id }"
            @click="navigateTo(item.id)"
            class="m-nav-item"
          >
            <Icons :name="item.icon" :size="20" />
            <span>{{ item.label }}</span>
            <span v-if="item.id === 'bookings' && store.notifications.length > 0" class="m-alert-dot"></span>
          </button>
        </nav>
      </div>
    </div>
  </div>
</template>

<style>
/* Consolidated global styles to maintain app layout integrity */
.app-layout {
  height: 100vh;
  width: 100vw;
  display: flex;
  overflow: hidden;
  background-color: var(--bg-primary);
}

.dashboard-frame {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* Sidebar Styling */
.sidebar-aside {
  width: 250px;
  background-color: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  height: 100%;
  flex-shrink: 0;
}

@media(max-width: 1023px) {
  .sidebar-aside {
    display: none;
  }
}

.sidebar-brand {
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border-bottom: 1px solid var(--border-color);
}

.brand-logo {
  background-color: var(--primary-glow);
  color: var(--primary);
  padding: 0.4rem;
  border-radius: 8px;
  display: flex;
}

.sidebar-brand h2 {
  font-size: 1.25rem;
  font-weight: 800;
  display: flex;
  align-items: center;
}

.sidebar-brand h2 span {
  color: var(--primary);
}

.sidebar-nav {
  padding: 1.25rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
  position: relative;
}

.nav-item:hover {
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

.nav-item.active {
  background-color: var(--bg-accent-soft);
  color: var(--primary);
}

.sidebar-alert-dot {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--danger);
}

.sidebar-footer {
  padding: 1.25rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.hall-indicator {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background-color: var(--bg-primary);
  padding: 0.75rem;
  border-radius: 10px;
  border: 1px solid var(--border-color);
}

.hall-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--success);
}

.hall-info {
  display: flex;
  flex-direction: column;
}

.hall-name {
  font-size: 0.825rem;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 150px;
}

.hall-type {
  font-size: 0.65rem;
  color: var(--text-muted);
  font-weight: 700;
}

.logout-btn {
  border: 1px solid var(--border-color);
}

/* Main content hub */
.main-content-hub {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* Header bar */
.top-header-bar {
  height: 64px;
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 1.5rem;
  flex-shrink: 0;
}

@media(max-width: 640px) {
  .top-header-bar {
    padding: 0 1rem;
  }
}

.header-logo-mobile {
  display: none;
  align-items: center;
  gap: 0.5rem;
}

.m-logo {
  background-color: var(--primary-glow);
  color: var(--primary);
  padding: 0.35rem;
  border-radius: 6px;
  display: flex;
}

.header-logo-mobile h3 {
  font-size: 1.05rem;
  font-weight: 800;
}

.header-logo-mobile h3 span {
  color: var(--primary);
}

.header-hall-name-desktop {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  font-size: 0.95rem;
}

.text-indigo {
  color: var(--primary);
}

@media(max-width: 1023px) {
  .header-logo-mobile {
    display: flex;
  }
  .header-hall-name-desktop {
    display: none;
  }
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-btn {
  background: transparent;
  border: none;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-secondary);
  position: relative;
  transition: background-color 0.2s;
}

.header-btn:hover {
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

.notification-bell.active {
  color: var(--primary);
}

.bell-badge-count {
  position: absolute;
  top: 4px;
  right: 4px;
  background-color: var(--danger);
  color: var(--text-on-accent);
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.1rem 0.3rem;
  border-radius: 10px;
  line-height: 1;
}

.header-profile-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 8px;
  transition: background-color 0.2s;
}

.header-profile-btn:hover {
  background-color: var(--bg-primary);
}

.header-profile-btn .profile-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: var(--primary);
  color: var(--text-on-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.8rem;
}

.profile-name-span {
  font-size: 0.9rem;
  font-weight: 600;
}

@media(max-width: 640px) {
  .profile-name-span {
    display: none;
  }
}

/* Dropdowns layout */
.dropdown-wrapper {
  position: relative;
}

.dropdown-panel {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: var(--shadow-lg);
  z-index: 150;
}

.notifications-panel {
  width: 320px;
}

.dropdown-header {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dropdown-header h4 {
  font-size: 0.875rem;
}

.dropdown-body {
  max-height: 300px;
  overflow-y: auto;
}

.drop-noti-item {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-color);
  cursor: pointer;
  display: flex;
  gap: 0.75rem;
  transition: background-color 0.2s;
}

.drop-noti-item:hover {
  background-color: var(--bg-accent-soft);
}

.drop-noti-item:last-child {
  border-bottom: none;
}

.noti-badge-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 5px;
  flex-shrink: 0;
}

.noti-badge-dot.badge-danger { background-color: var(--danger); }
.noti-badge-dot.badge-warning { background-color: var(--warning); }

.noti-msg-block h5 {
  font-size: 0.85rem;
  font-weight: 700;
  line-height: 1.2;
}

.noti-msg-block p {
  font-size: 0.775rem;
  color: var(--text-secondary);
  margin-top: 0.15rem;
  line-height: 1.3;
}

.dropdown-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2.5rem 1rem;
  text-align: center;
  gap: 0.5rem;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.user-panel {
  width: 220px;
  padding: 0.5rem 0;
}

.user-panel-info {
  padding: 0.75rem 1rem;
}

.user-panel-info h4 {
  font-size: 0.95rem;
}

.user-panel-info p {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.drop-divider {
  border: 0;
  border-top: 1px solid var(--border-color);
  margin: 0.35rem 0;
}

.drop-item {
  width: 100%;
  padding: 0.6rem 1rem;
  border: none;
  background: transparent;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}

.drop-item:hover {
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

.drop-item.text-red {
  color: var(--danger-text);
}
.drop-item.text-red:hover {
  background-color: var(--danger-bg);
}

/* Dynamically styled page scroll wrapper */
.main-page-scrollable {
  flex: 1;
  overflow-y: auto;
  padding: 2rem 1.5rem;
}

@media(max-width: 640px) {
  .main-page-scrollable {
    padding: 1.25rem 1rem 5.5rem; /* Safe padding for bottom mobile nav */
  }
}

/* Mobile Bottom Nav */
.mobile-bottom-nav {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 64px;
  background-color: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
  z-index: 90;
  grid-template-columns: repeat(6, 1fr);
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
}

@media(max-width: 1023px) {
  .mobile-bottom-nav {
    display: grid;
  }
}

.m-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.65rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.m-nav-item.active {
  color: var(--primary);
}

.m-nav-item svg {
  transition: transform 0.2s;
}

.m-nav-item.active svg {
  transform: translateY(-2px);
}

.m-alert-dot {
  position: absolute;
  top: 12px;
  right: 25%;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background-color: var(--danger);
}
</style>
