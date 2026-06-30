<script setup>
import { ref, computed } from 'vue'
import { 
  store, 
  addRole, 
  updateRole, 
  deleteRole, 
  addStaff, 
  updateStaff, 
  deleteStaff 
} from '../store'
import Icons from './Icons.vue'

// Tab state: 'staff' or 'roles'
const activeTab = ref('staff')

// Modals State
const isStaffModalOpen = ref(false)
const isRoleModalOpen = ref(false)
const isEditing = ref(false)

// Active Editing Objects
const activeStaffId = ref(null)
const activeRoleId = ref(null)

// Staff Form Fields
const staffName = ref('')
const staffEmail = ref('')
const staffPassword = ref('')
const staffRoleId = ref('')

// Role Form Fields
const roleName = ref('')
const roleDescription = ref('')
const rolePermissions = ref({
  dashboard_view: false,
  bookings_view: false,
  bookings_edit: false,
  calendar_view: false,
  customers_view: false,
  packages_view: false,
  packages_edit: false,
  payments_view: false,
  payments_edit: false,
  settings_view: false,
  settings_edit: false,
  staff_manage: false
})

const permissionMetadata = [
  { key: 'dashboard_view', label: 'View Dashboard', category: 'Analytics', description: 'Can view stats charts and activity feed.' },
  { key: 'bookings_view', label: 'View Bookings', category: 'Bookings', description: 'Can search and view bookings.' },
  { key: 'bookings_edit', label: 'Manage Bookings', category: 'Bookings', description: 'Can create, edit, or cancel events.' },
  { key: 'calendar_view', label: 'View Calendar', category: 'Bookings', description: 'Can view calendar layout and schedule.' },
  { key: 'customers_view', label: 'View Customers', category: 'Bookings', description: 'Can view customer directory.' },
  { key: 'packages_view', label: 'View Packages', category: 'Packages', description: 'Can view standard packages.' },
  { key: 'packages_edit', label: 'Manage Packages', category: 'Packages', description: 'Can add, edit, or delete packages.' },
  { key: 'payments_view', label: 'View Payments', category: 'Finance', description: 'Can view billing and receipt logs.' },
  { key: 'payments_edit', label: 'Manage Payments', category: 'Finance', description: 'Can record payments and refunds.' },
  { key: 'settings_view', label: 'View Settings', category: 'Settings', description: 'Can view venue profile and details.' },
  { key: 'settings_edit', label: 'Manage Settings', category: 'Settings', description: 'Can modify venue settings and subscription.' },
  { key: 'staff_manage', label: 'Manage Staff', category: 'System', description: 'Full access to add managers and configure roles.' }
]

// Group permission metadata by category
const permissionCategories = computed(() => {
  const categories = {}
  permissionMetadata.forEach(p => {
    if (!categories[p.category]) {
      categories[p.category] = []
    }
    categories[p.category].push(p)
  })
  return categories
})

// Resolve role name
const getRoleName = (roleId) => {
  const role = store.roles.find(r => r.id === roleId)
  return role ? role.name : 'Unknown Role'
}

// Helpers for opening modals
const openAddStaffModal = () => {
  isEditing.value = false
  activeStaffId.value = null
  staffName.value = ''
  staffEmail.value = ''
  staffPassword.value = ''
  // Default to first role if available
  staffRoleId.value = store.roles.length > 0 ? store.roles[0].id : ''
  isStaffModalOpen.value = true
}

const openEditStaffModal = (staffMember) => {
  isEditing.value = true
  activeStaffId.value = staffMember.id
  staffName.value = staffMember.name
  staffEmail.value = staffMember.email
  staffPassword.value = staffMember.password
  staffRoleId.value = staffMember.roleId
  isStaffModalOpen.value = true
}

const openAddRoleModal = () => {
  isEditing.value = false
  activeRoleId.value = null
  roleName.value = ''
  roleDescription.value = ''
  // Reset permissions to false
  Object.keys(rolePermissions.value).forEach(k => {
    rolePermissions.value[k] = false
  })
  isRoleModalOpen.value = true
}

const openEditRoleModal = (role) => {
  isEditing.value = true
  activeRoleId.value = role.id
  roleName.value = role.name
  roleDescription.value = role.description
  // Sync permissions
  Object.keys(rolePermissions.value).forEach(k => {
    rolePermissions.value[k] = !!role.permissions[k]
  })
  isRoleModalOpen.value = true
}

// Form submissions
const handleStaffSubmit = () => {
  if (!staffName.value || !staffEmail.value || !staffPassword.value || !staffRoleId.value) {
    alert('Please fill out all fields.')
    return
  }

  const payload = {
    name: staffName.value,
    email: staffEmail.value.toLowerCase(),
    password: staffPassword.value,
    roleId: staffRoleId.value
  }

  if (isEditing.value && activeStaffId.value) {
    updateStaff({
      id: activeStaffId.value,
      ...payload
    })
  } else {
    // Check if email already exists
    const emailExists = store.staff.some(s => s.email.toLowerCase() === payload.email)
    if (emailExists) {
      alert('This email is already in use by another staff member.')
      return
    }
    addStaff(payload)
  }

  isStaffModalOpen.value = false
}

const handleRoleSubmit = () => {
  if (!roleName.value) {
    alert('Please specify a role name.')
    return
  }

  const payload = {
    name: roleName.value,
    description: roleDescription.value,
    permissions: { ...rolePermissions.value }
  }

  if (isEditing.value && activeRoleId.value) {
    updateRole({
      id: activeRoleId.value,
      ...payload
    })
  } else {
    addRole(payload)
  }

  isRoleModalOpen.value = false
}

const handleStaffDelete = (staffId, name) => {
  if (confirm(`Are you sure you want to delete staff account for ${name}?`)) {
    deleteStaff(staffId)
  }
}

const handleRoleDelete = (role) => {
  if (confirm(`Are you sure you want to delete the role "${role.name}"?`)) {
    const success = deleteRole(role.id)
    if (success) {
      // deleted successfully
    }
  }
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
</script>

<template>
  <div class="staff-container animate-fade">
    <!-- Header Block -->
    <div class="header-row">
      <div>
        <h1 class="page-title">Staff & Roles</h1>
        <p class="subtitle">Assign managers, customize detailed task privileges, and manage security credentials.</p>
      </div>

      <!-- Header actions based on active tab -->
      <button v-if="activeTab === 'staff'" @click="openAddStaffModal" class="btn btn-primary">
        <Icons name="user-plus" :size="20" stroke-width="2.5" />
        Add Staff Member
      </button>
      <button v-else @click="openAddRoleModal" class="btn btn-primary">
        <Icons name="plus" :size="20" stroke-width="2.5" />
        Create Custom Role
      </button>
    </div>

    <!-- Toggle Tabs -->
    <div class="tabs-bar">
      <button 
        :class="{ active: activeTab === 'staff' }" 
        @click="activeTab = 'staff'" 
        class="tab-btn"
      >
        <Icons name="customers" :size="18" />
        Staff Directory ({{ store.staff.length }})
      </button>
      <button 
        :class="{ active: activeTab === 'roles' }" 
        @click="activeTab = 'roles'" 
        class="tab-btn"
      >
        <Icons name="shield" :size="18" />
        Roles & Permissions ({{ store.roles.length }})
      </button>
    </div>

    <!-- Main Views -->
    <div class="tab-content">
      
      <!-- Tab 1: Staff Directory -->
      <div v-if="activeTab === 'staff'" class="staff-list-view">
        <div class="card table-card custom-scroll no-print">
          <table class="data-table">
            <thead>
              <tr>
                <th>Manager / Staff Name</th>
                <th>Email Address</th>
                <th>System Role</th>
                <th>Registered On</th>
                <th class="actions-col text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="member in store.staff" :key="member.id" class="table-row">
                <td>
                  <div class="user-cell">
                    <div class="user-avatar">{{ member.name.charAt(0).toUpperCase() }}</div>
                    <div class="user-info">
                      <span class="user-name">{{ member.name }}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="text-secondary font-medium">{{ member.email }}</span>
                </td>
                <td>
                  <span class="role-pill">{{ getRoleName(member.roleId) }}</span>
                </td>
                <td>
                  <span class="text-muted font-medium">{{ formatDate(member.createdAt) }}</span>
                </td>
                <td class="actions-col text-right">
                  <div class="action-btn-group">
                    <button @click="openEditStaffModal(member)" class="btn-icon" title="Edit Staff Info">
                      <Icons name="edit" :size="16" />
                    </button>
                    <button @click="handleStaffDelete(member.id, member.name)" class="btn-icon text-red" title="Delete Staff Account">
                      <Icons name="trash" :size="16" />
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="store.staff.length === 0">
                <td colspan="5" class="empty-table-state">
                  <Icons name="customers" :size="48" class="text-muted" />
                  <h3>No Staff Accounts Configured</h3>
                  <p>Create staff credentials so your booking managers, receptionists, or accountants can log in.</p>
                  <button @click="openAddStaffModal" class="btn btn-secondary btn-sm">
                    Add Your First Staff Member
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tab 2: Roles & Permissions -->
      <div v-else class="roles-view">
        <div class="roles-grid">
          <div v-for="role in store.roles" :key="role.id" class="card role-card animate-scale">
            <div class="role-card-header">
              <div class="role-title-block">
                <div class="role-icon-box">
                  <Icons name="shield" :size="20" class="text-indigo" />
                </div>
                <h3>{{ role.name }}</h3>
              </div>
              <div class="action-btn-group">
                <button @click="openEditRoleModal(role)" class="btn-icon btn-small-icon" title="Edit Role Permissions">
                  <Icons name="edit" :size="15" />
                </button>
                <!-- Lock delete for seeded default roles so the demo system stays reliable -->
                <button 
                  v-if="role.id !== 'role_manager' && role.id !== 'role_receptionist'"
                  @click="handleRoleDelete(role)" 
                  class="btn-icon btn-small-icon text-red" 
                  title="Delete Role"
                >
                  <Icons name="trash" :size="15" />
                </button>
              </div>
            </div>

            <p class="role-desc">{{ role.description || 'No description provided.' }}</p>

            <hr class="card-divider" />

            <div class="role-permissions-preview">
              <h4>Enabled Privileges</h4>
              <div class="permissions-tag-wrapper">
                <span 
                  v-for="p in permissionMetadata" 
                  v-show="role.permissions[p.key]" 
                  :key="p.key" 
                  class="perm-badge"
                >
                  {{ p.label }}
                </span>
                <span v-if="Object.values(role.permissions).filter(v => v).length === 0" class="no-perms-text">
                  No privileges enabled
                </span>
              </div>
            </div>
          </div>

          <div @click="openAddRoleModal" class="card role-card create-card">
            <div class="create-role-inner">
              <Icons name="plus" :size="32" class="text-indigo" />
              <h3>Create Custom Role</h3>
              <p>Define custom workflows with customized view/write access.</p>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- Modal 1: Add / Edit Staff Member -->
    <div v-if="isStaffModalOpen" class="modal-overlay">
      <div class="modal-container card modal-sm animate-scale">
        <div class="modal-header">
          <h2>{{ isEditing ? 'Edit Manager Details' : 'Add Staff Member' }}</h2>
          <button @click="isStaffModalOpen = false" class="close-btn">
            <Icons name="plus" :size="18" style="transform: rotate(45deg);" />
          </button>
        </div>

        <form @submit.prevent="handleStaffSubmit" class="modal-form">
          <div class="form-group">
            <label class="form-label">Full Name *</label>
            <input v-model="staffName" type="text" class="form-control" placeholder="e.g. Sarah Jenkins" required />
          </div>

          <div class="form-group">
            <label class="form-label">Email Address *</label>
            <input v-model="staffEmail" type="email" class="form-control" placeholder="e.g. sarah@palace.com" required />
          </div>

          <div class="form-group">
            <label class="form-label">Password *</label>
            <input v-model="staffPassword" type="text" class="form-control" placeholder="Create login password" required />
          </div>

          <div class="form-group">
            <label class="form-label">Assigned Role *</label>
            <select v-model="staffRoleId" class="form-control" required>
              <option disabled value="">Select System Role</option>
              <option v-for="role in store.roles" :key="role.id" :value="role.id">
                {{ role.name }}
              </option>
            </select>
          </div>

          <div class="modal-actions">
            <button @click="isStaffModalOpen = false" type="button" class="btn btn-secondary">Cancel</button>
            <button type="submit" class="btn btn-primary">
              {{ isEditing ? 'Save Changes' : 'Create Credentials' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal 2: Add / Edit Role & Permissions -->
    <div v-if="isRoleModalOpen" class="modal-overlay">
      <div class="modal-container card animate-scale">
        <div class="modal-header">
          <h2>{{ isEditing ? 'Modify Role Privileges' : 'Create Custom Role' }}</h2>
          <button @click="isRoleModalOpen = false" class="close-btn">
            <Icons name="plus" :size="18" style="transform: rotate(45deg);" />
          </button>
        </div>

        <form @submit.prevent="handleRoleSubmit" class="modal-form scrollable-modal-form custom-scroll">
          <div class="form-group">
            <label class="form-label">Role Name *</label>
            <input v-model="roleName" type="text" class="form-control" placeholder="e.g. Hall Booking Specialist" required />
          </div>

          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea v-model="roleDescription" class="form-control" rows="2" placeholder="Briefly describe what responsibilities this role handles..."></textarea>
          </div>

          <hr class="modal-divider" />
          
          <h3 class="modal-subheading">Feature View & Action Permissions</h3>
          <p class="modal-subsubtitle">Select exactly what pages and write-actions this role can access.</p>

          <div class="permissions-categories-container">
            <div v-for="(perms, cat) in permissionCategories" :key="cat" class="permission-category-block">
              <h4 class="category-title">{{ cat }}</h4>
              
              <div class="permissions-grid">
                <div v-for="p in perms" :key="p.key" class="permission-checkbox-card">
                  <label class="checkbox-label checkbox-permission">
                    <input type="checkbox" v-model="rolePermissions[p.key]" />
                    <div class="perm-info">
                      <span class="perm-label">{{ p.label }}</span>
                      <span class="perm-desc">{{ p.description }}</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-actions">
            <button @click="isRoleModalOpen = false" type="button" class="btn btn-secondary">Cancel</button>
            <button type="submit" class="btn btn-primary">
              {{ isEditing ? 'Save Role Configuration' : 'Create Role' }}
            </button>
          </div>
        </form>
      </div>
    </div>

  </div>
</template>

<style scoped>
.staff-container {
  max-width: 1200px;
  margin: 0 auto;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  gap: 1rem;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 800;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 0.95rem;
  margin-top: 0.25rem;
}

/* Tabs Navigation Styling */
.tabs-bar {
  display: flex;
  gap: 0.5rem;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 2rem;
  padding-bottom: 2px;
}

.tab-btn {
  background: transparent;
  border: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
}

.tab-btn:hover {
  color: var(--text-primary);
}

.tab-btn.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}

/* Table styles */
.table-card {
  padding: 0;
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.data-table th, .data-table td {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
  font-size: 0.925rem;
}

.data-table th {
  background-color: var(--bg-tertiary);
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
}

.table-row:hover {
  background-color: var(--bg-accent-soft);
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--primary-glow);
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.9rem;
}

.user-name {
  font-weight: 700;
  color: var(--text-primary);
}

.font-medium {
  font-weight: 500;
}

.role-pill {
  display: inline-flex;
  padding: 0.25rem 0.6rem;
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  border-radius: 100px;
  font-weight: 600;
  font-size: 0.8rem;
  border: 1px solid var(--border-color);
}

.actions-col {
  width: 120px;
}

.text-right {
  text-align: right;
}

.action-btn-group {
  display: inline-flex;
  gap: 0.5rem;
}

.btn-icon {
  background: transparent;
  border: 1px solid var(--border-color);
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.btn-icon:hover {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
}

.btn-icon.text-red:hover {
  background-color: var(--danger-bg);
  color: var(--danger-text);
  border-color: rgba(239, 68, 68, 0.2);
}

.empty-table-state {
  text-align: center;
  padding: 4rem 2rem;
}

.empty-table-state h3 {
  margin-top: 1rem;
  font-size: 1.15rem;
}

.empty-table-state p {
  color: var(--text-secondary);
  font-size: 0.9rem;
  max-width: 420px;
  margin: 0.5rem auto 1.5rem;
}

/* Roles View Grid */
.roles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 1.5rem;
}

.role-card {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.role-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.role-title-block {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.role-icon-box {
  width: 36px;
  height: 36px;
  background-color: var(--primary-glow);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.role-card-header h3 {
  font-size: 1.1rem;
  font-weight: 700;
}

.btn-small-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
}

.role-desc {
  font-size: 0.875rem;
  color: var(--text-secondary);
  line-height: 1.4;
  flex-grow: 1;
  margin-bottom: 1.25rem;
}

.card-divider {
  border: 0;
  border-top: 1px solid var(--border-color);
  margin-bottom: 1.25rem;
}

.role-permissions-preview h4 {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--text-muted);
  letter-spacing: 0.05em;
  margin-bottom: 0.75rem;
}

.permissions-tag-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.perm-badge {
  font-size: 0.725rem;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  background-color: var(--bg-accent-soft);
  color: var(--primary);
}

.no-perms-text {
  font-size: 0.8rem;
  color: var(--text-muted);
  font-style: italic;
}

.create-card {
  border: 2px dashed var(--border-hover);
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  cursor: pointer;
  min-height: 220px;
  transition: all 0.2s;
}

.create-card:hover {
  background-color: var(--bg-secondary);
  border-color: var(--primary);
  transform: translateY(-2px);
}

.create-role-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem;
}

.create-role-inner h3 {
  font-size: 1.1rem;
}

.create-role-inner p {
  font-size: 0.85rem;
  color: var(--text-secondary);
  max-width: 240px;
}

/* Modal styles (Staff specific and general scrollable layouts) */
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
  background-color: var(--bg-secondary);
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
}

.modal-header h2 {
  font-size: 1.15rem;
  font-weight: 700;
}

.close-btn {
  background: transparent;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.close-btn:hover {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
}

.modal-form {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  background-color: var(--bg-secondary);
  border-bottom-left-radius: 16px;
  border-bottom-right-radius: 16px;
}

.scrollable-modal-form {
  overflow-y: auto;
  max-height: calc(90vh - 70px);
}

.modal-divider {
  border: 0;
  border-top: 1px solid var(--border-color);
  margin: 1rem 0;
}

.modal-subheading {
  font-size: 0.95rem;
  font-weight: 700;
}

.modal-subsubtitle {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: 1.25rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
  border-top: 1px solid var(--border-color);
  padding-top: 1.25rem;
}

/* Custom Permission Checkbox Layout */
.permissions-categories-container {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.permission-category-block {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.category-title {
  font-size: 0.8rem;
  text-transform: uppercase;
  color: var(--primary);
  font-weight: 700;
  letter-spacing: 0.05em;
  border-left: 2.5px solid var(--primary);
  padding-left: 0.5rem;
}

.permissions-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

@media (max-width: 600px) {
  .permissions-grid {
    grid-template-columns: 1fr;
  }
}

.permission-checkbox-card {
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 0.75rem;
  background-color: var(--bg-primary);
  transition: all 0.2s;
}

.permission-checkbox-card:hover {
  border-color: var(--border-hover);
  background-color: var(--bg-tertiary);
}

.checkbox-permission {
  align-items: flex-start;
  gap: 0.75rem;
}

.checkbox-permission input {
  margin-top: 0.25rem;
}

.perm-info {
  display: flex;
  flex-direction: column;
}

.perm-label {
  font-weight: 700;
  font-size: 0.875rem;
  color: var(--text-primary);
  line-height: 1.2;
}

.perm-desc {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 0.15rem;
  line-height: 1.3;
}
</style>
