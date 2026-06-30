<script setup>
import { ref } from 'vue'
import { store, addPackage, updatePackage, deletePackage, hasPermission } from '../store'
import Icons from './Icons.vue'

const isModalOpen = ref(false)
const isEditMode = ref(false)
const currentPkg = ref(null)

// Form Fields
const formName = ref('')
const formType = ref('per-guest') // 'per-guest' or 'flat'
const formPrice = ref(50)
const formDescription = ref('')
const newServiceText = ref('')
const formServices = ref([])

// Edit helpers
const openAddModal = () => {
  isEditMode.value = false
  formName.value = ''
  formType.value = 'per-guest'
  formPrice.value = 50
  formDescription.value = ''
  formServices.value = ['Catering', 'Standard Decoration']
  newServiceText.value = ''
  isModalOpen.value = true
}

const openEditModal = (pkg) => {
  isEditMode.value = true
  currentPkg.value = pkg
  formName.value = pkg.name
  formType.value = pkg.type
  formPrice.value = pkg.price
  formDescription.value = pkg.description || ''
  formServices.value = [...pkg.services]
  newServiceText.value = ''
  isModalOpen.value = true
}

const handleAddService = () => {
  const text = newServiceText.value.trim()
  if (text && !formServices.value.includes(text)) {
    formServices.value.push(text)
    newServiceText.value = ''
  }
}

const handleRemoveService = (service) => {
  formServices.value = formServices.value.filter(s => s !== service)
}

const handleFormSubmit = () => {
  if (!formName.value || !formPrice.value) return

  const pkgData = {
    name: formName.value,
    type: formType.value,
    price: Number(formPrice.value),
    description: formDescription.value,
    services: formServices.value
  }

  if (isEditMode.value) {
    updatePackage({
      id: currentPkg.value.id,
      ...pkgData
    })
  } else {
    addPackage(pkgData)
  }

  isModalOpen.value = false
}

const confirmDelete = (pkgId) => {
  if (confirm('Are you sure you want to delete this package? Bookings linked to this package will keep their locked pricing, but this package will not be selectable for new bookings.')) {
    deletePackage(pkgId)
  }
}
</script>

<template>
  <div class="packages-container animate-fade">
    <div class="header-row">
      <div>
        <h1 class="page-title">Packages & Pricing</h1>
        <p class="subtitle">Customize the rates, services, and amenities offered by your venue.</p>
      </div>
      <button v-if="hasPermission('packages_edit')" @click="openAddModal" class="btn btn-primary">
        <Icons name="plus" :size="20" stroke-width="2.5" />
        Create Package
      </button>
    </div>

    <!-- Package Cards Grid -->
    <div class="packages-grid">
      <div v-for="pkg in store.packages" :key="pkg.id" class="package-card card">
        <div class="card-glow"></div>
        
        <div class="package-header">
          <div>
            <h3>{{ pkg.name }}</h3>
            <span class="package-type-badge" :class="pkg.type">
              {{ pkg.type === 'per-guest' ? 'Per-Head Billing' : 'Flat Lawn Hire' }}
            </span>
          </div>
          
          <div class="package-price">
            <span class="currency">Rs. </span>
            <span class="amount">{{ pkg.price.toLocaleString() }}</span>
            <span class="unit">{{ pkg.type === 'per-guest' ? '/ head' : ' flat' }}</span>
          </div>
        </div>

        <p class="package-desc">{{ pkg.description || 'No description provided.' }}</p>

        <hr class="card-divider" />

        <div class="services-section">
          <h4>Included Amenities & Services:</h4>
          <ul class="services-list">
            <li v-for="(service, idx) in pkg.services" :key="idx" class="service-item">
              <Icons name="check" :size="16" class="text-green" />
              <span>{{ service }}</span>
            </li>
            <li v-if="pkg.services.length === 0" class="empty-services">
              No services added to this package yet.
            </li>
          </ul>
        </div>

        <div class="package-actions" v-if="hasPermission('packages_edit')">
          <button @click="openEditModal(pkg)" class="btn btn-secondary btn-sm">
            <Icons name="edit" :size="14" />
            Edit Package
          </button>
          <button @click="confirmDelete(pkg.id)" class="btn-icon text-red" title="Delete Package">
            <Icons name="trash" :size="16" />
          </button>
        </div>
      </div>

      <!-- Add Package Shortcut Card -->
      <div class="add-shortcut-card card" @click="openAddModal">
        <div class="add-icon-wrapper">
          <Icons name="plus" :size="36" stroke-width="1.5" />
        </div>
        <h3>Define New Package</h3>
        <p>Set up pricing guidelines for banquet services, garden bookings, or corporate event formats.</p>
      </div>
    </div>

    <!-- Add/Edit Package Modal -->
    <div v-if="isModalOpen" class="modal-overlay">
      <div class="modal-container card modal-sm animate-scale">
        <div class="modal-header">
          <h2>{{ isEditMode ? 'Modify Package' : 'Create Custom Package' }}</h2>
          <button @click="isModalOpen = false" class="close-btn">
            <Icons name="plus" :size="24" style="transform: rotate(45deg);" />
          </button>
        </div>

        <form @submit.prevent="handleFormSubmit" class="modal-form custom-scroll">
          <div class="form-group">
            <label class="form-label">Package Title *</label>
            <input v-model="formName" type="text" class="form-control" placeholder="e.g. Gold Buffet Imperial" required />
          </div>

          <div class="form-group">
            <label class="form-label">Billing Type</label>
            <select v-model="formType" class="form-control">
              <option value="per-guest">Per-Head (Scales with guest count)</option>
              <option value="flat">Flat Lawn/Hall Hire (Fixed venue rental)</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Price (Rs.) *</label>
            <input v-model="formPrice" type="number" class="form-control" min="0" required />
          </div>

          <div class="form-group">
            <label class="form-label">Package Description</label>
            <textarea v-model="formDescription" class="form-control" rows="3" placeholder="Briefly detail what food items, seating, or decoration level this covers..."></textarea>
          </div>

          <!-- Included Services Tag Builder -->
          <div class="form-group">
            <label class="form-label">Included Amenities & Services</label>
            <div class="tag-input-row">
              <input 
                v-model="newServiceText" 
                type="text" 
                class="form-control" 
                placeholder="e.g. Valet Parking, DJ Sound" 
                @keydown.enter.prevent="handleAddService"
              />
              <button @click="handleAddService" type="button" class="btn btn-secondary">Add</button>
            </div>
            
            <div class="services-tags-wrapper">
              <span v-for="service in formServices" :key="service" class="service-tag">
                {{ service }}
                <button type="button" @click="handleRemoveService(service)">&times;</button>
              </span>
              <p class="tag-tip" v-if="formServices.length > 0">Press Enter or click Add to append services.</p>
            </div>
          </div>

          <div class="modal-actions">
            <button @click="isModalOpen = false" type="button" class="btn btn-secondary">Cancel</button>
            <button type="submit" class="btn btn-primary">
              <Icons name="check" :size="16" />
              Save Package
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.packages-container {
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

/* Packages Cards Grid */
.packages-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.package-card {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Subtle glowing accent on card hovers */
.card-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--primary) 0%, #10b981 100%);
  opacity: 0.8;
}

.package-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.package-header h3 {
  font-size: 1.25rem;
  font-weight: 800;
  margin-bottom: 0.25rem;
}

.package-type-badge {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 0.2rem 0.45rem;
  border-radius: 6px;
}

.package-type-badge.per-guest {
  background-color: var(--bg-accent-soft);
  color: var(--primary);
}

.package-type-badge.flat {
  background-color: var(--success-bg);
  color: var(--success-text);
}

.package-price {
  text-align: right;
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
}

.package-price .currency {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--primary);
}

.package-price .amount {
  font-size: 1.85rem;
  font-weight: 800;
  font-family: var(--font-heading);
  color: var(--text-primary);
  line-height: 1;
}

.package-price .unit {
  font-size: 0.8rem;
  color: var(--text-muted);
  font-weight: 600;
}

.package-desc {
  font-size: 0.875rem;
  color: var(--text-secondary);
  line-height: 1.4;
  min-height: 2.8rem;
}

.card-divider {
  border: 0;
  border-top: 1px solid var(--border-color);
}

.services-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.services-section h4 {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  font-weight: 700;
}

.services-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.service-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.service-item svg {
  color: var(--success);
}

.empty-services {
  font-size: 0.8rem;
  color: var(--text-muted);
  font-style: italic;
}

.package-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5rem;
}

/* Add package shortcut card */
.add-shortcut-card {
  border: 2px dashed var(--border-hover);
  background-color: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2.5rem 1.5rem;
  gap: 0.75rem;
  cursor: pointer;
  box-shadow: none;
  transition: all 0.2s;
}

.add-shortcut-card:hover {
  background-color: var(--bg-accent-soft);
  border-color: var(--primary);
  transform: translateY(-2px);
}

.add-icon-wrapper {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background-color: var(--bg-accent-soft);
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color);
}

.add-shortcut-card h3 {
  font-size: 1.15rem;
  font-weight: 700;
}

.add-shortcut-card p {
  font-size: 0.85rem;
  color: var(--text-secondary);
  max-width: 250px;
}

/* Service tag builder inside form */
.tag-input-row {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.services-tags-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.5rem;
}

.service-tag {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.service-tag button {
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.service-tag button:hover {
  color: var(--danger);
}

.tag-tip {
  width: 100%;
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 0.25rem;
}
</style>
