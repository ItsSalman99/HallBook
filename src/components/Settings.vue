<script setup>
import { ref } from 'vue'
import { store, updateHallDetails, setTheme, seedDemoData } from '../store'
import Icons from './Icons.vue'

const formName = ref(store.hallDetails.name)
const formType = ref(store.hallDetails.type)
const formAddress = ref(store.hallDetails.address)
const formCapacity = ref(store.hallDetails.capacity)
const formPhone = ref(store.hallDetails.phone)

const showSuccess = ref(false)

const handleSaveDetails = () => {
  updateHallDetails({
    name: formName.value,
    type: formType.value,
    address: formAddress.value,
    capacity: Number(formCapacity.value),
    phone: formPhone.value
  })
  
  showSuccess.value = true
  setTimeout(() => {
    showSuccess.value = false
  }, 3000)
}

const toggleTheme = () => {
  const next = store.theme === 'light' ? 'dark' : 'light'
  setTheme(next)
}

const triggerSeed = () => {
  if (confirm('This will seed the active account with a full set of 10+ demo bookings, transaction logs, and package details. Any existing records will be overwritten. Proceed?')) {
    seedDemoData()
    // Reload state bindings
    formName.value = store.hallDetails.name
    formType.value = store.hallDetails.type
    formAddress.value = store.hallDetails.address
    formCapacity.value = store.hallDetails.capacity
    formPhone.value = store.hallDetails.phone
    
    // Quick success flash
    showSuccess.value = true
    setTimeout(() => {
      showSuccess.value = false
    }, 2000)
  }
}
</script>

<template>
  <div class="settings-container animate-fade">
    <div class="header-row">
      <div>
        <h1 class="page-title">Venue Settings</h1>
        <p class="subtitle">Manage profiles, look-and-feel preferences, and subscription accounts.</p>
      </div>
    </div>

    <!-- Alert for save success -->
    <div v-if="showSuccess" class="alert alert-success animate-fade no-print">
      <Icons name="check-circle" :size="18" />
      <span>Settings saved and updated successfully!</span>
    </div>

    <div class="settings-layout">
      <!-- Left Column: Venue Profile Form -->
      <div class="settings-form-panel card">
        <h3>Venue Specifications</h3>
        <p class="panel-subtitle">This information appears on billing invoices and customer sheets.</p>

        <form @submit.prevent="handleSaveDetails" class="details-form">
          <div class="form-group">
            <label class="form-label">Venue Name *</label>
            <input v-model="formName" type="text" class="form-control" placeholder="e.g. Garrison Marquee Lahore" required />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Venue Type</label>
              <select v-model="formType" class="form-control">
                <option value="banquet">Banquet Hall / Shadi Hall</option>
                <option value="marriage">Marriage Lawn / Marquee</option>
                <option value="ballroom">Luxury Ballroom</option>
                <option value="multi">Multi-Purpose Space</option>
              </select>
            </div>
            
            <div class="form-group">
              <label class="form-label">Maximum Guest Capacity</label>
              <input v-model="formCapacity" type="number" class="form-control" min="1" placeholder="e.g. 800" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Contact Phone Number</label>
            <input v-model="formPhone" type="tel" class="form-control" placeholder="e.g. 0300-1234567" />
          </div>

          <div class="form-group">
            <label class="form-label">Address / Location Location</label>
            <textarea v-model="formAddress" class="form-control" rows="2" placeholder="e.g. Khyber Road, Lahore Cantt, Pakistan"></textarea>
          </div>

          <button type="submit" class="btn btn-primary">
            <Icons name="check" :size="16" />
            Save Profile Settings
          </button>
        </form>
      </div>

      <!-- Right Column: System preferences, SaaS plans, & Dev utilities -->
      <div class="settings-side-panels">
        <!-- Appearance Theme Toggle -->
        <div class="pref-panel card">
          <h3>Display Preferences</h3>
          <p class="panel-subtitle">Toggle display theme styles for the workspace.</p>
          
          <div class="theme-toggle-row">
            <span class="theme-label">
              Theme Mode: <strong>{{ store.theme === 'light' ? 'Light Mode' : 'Dark Mode' }}</strong>
            </span>
            <button @click="toggleTheme" class="btn btn-secondary btn-sm" type="button">
              <Icons :name="store.theme === 'light' ? 'moon' : 'sun'" :size="16" />
              Switch to {{ store.theme === 'light' ? 'Dark' : 'Light' }}
            </button>
          </div>
        </div>

        <!-- Simulated SaaS Subscribes -->
        <div class="saas-panel card">
          <div class="saas-header">
            <h3>SaaS Subscription</h3>
            <span class="badge badge-success">Active</span>
          </div>
          <p class="panel-subtitle">Plan and quota status for this hall tenancy account.</p>

          <div class="saas-details">
            <div class="saas-row">
              <span>Account ID:</span>
              <strong>{{ store.currentOwner?.id || 'OWNER_N/A' }}</strong>
            </div>
            <div class="saas-row">
              <span>Plan Level:</span>
              <strong class="plan-pro">
                <Icons name="shield" :size="14" />
                Enterprise Pro
              </strong>
            </div>
            <div class="saas-row">
              <span>Monthly Quota:</span>
              <span>Unlimited Bookings</span>
            </div>
            <div class="saas-row">
              <span>Billing Cycle:</span>
              <span>Annual (Rs. 85,000/year)</span>
            </div>
            <div class="saas-row">
              <span>Next Invoice:</span>
              <span>June 23, 2027</span>
            </div>
          </div>
        </div>

        <!-- Dev Utilities / Seeder -->
        <div class="utils-panel card">
          <h3>Developer Utilities</h3>
          <p class="panel-subtitle">Reset states or populate data for demonstrations.</p>
          
          <button @click="triggerSeed" class="btn btn-secondary btn-sm btn-full utils-btn" type="button">
            <Icons name="check-circle" :size="16" />
            Populate Demo Bookings Log
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-container {
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

.alert {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 500;
}

.alert-success {
  background-color: var(--success-bg);
  color: var(--success-text);
  border: 1px solid rgba(16, 185, 129, 0.2);
}

/* Settings Layout */
.settings-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;
}

@media(min-width: 1024px) {
  .settings-layout {
    grid-template-columns: 1.1fr 0.9fr;
  }
}

.settings-form-panel {
  display: flex;
  flex-direction: column;
}

.settings-form-panel h3, .pref-panel h3, .saas-panel h3, .utils-panel h3 {
  font-size: 1.1rem;
  font-weight: 700;
}

.panel-subtitle {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-bottom: 1.25rem;
}

.details-form {
  display: flex;
  flex-direction: column;
}

.settings-side-panels {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* Display Prefs */
.theme-toggle-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.theme-label {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

/* SaaS Info */
.saas-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.saas-details {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  background-color: var(--bg-primary);
  padding: 1rem;
  border-radius: 10px;
  border: 1px solid var(--border-color);
}

.saas-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.saas-row span:first-child {
  color: var(--text-muted);
}

.plan-pro {
  color: var(--primary);
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

/* Dev utils */
.utils-btn {
  border: 1px dashed var(--border-hover);
}
</style>
