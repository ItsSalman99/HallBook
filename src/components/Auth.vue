<script setup>
import { ref } from 'vue'
import Icons from './Icons.vue'

const emit = defineEmits(['login-success'])

const isLogin = ref(true)
const errorMessage = ref('')

// Form fields
const ownerName = ref('')
const email = ref('')
const password = ref('')
const hallName = ref('')
const hallType = ref('banquet')
const address = ref('')
const capacity = ref('')
const phone = ref('')

const handleDemoLogin = () => {
  emit('login-success', {
    isDemo: true,
    email: 'demo@palace.com',
    ownerName: 'Demo Owner',
    hallName: 'Royal Palace Banquet & Resort'
  })
}

const handleSubmit = () => {
  errorMessage.value = ''
  
  if (!email.value || !password.value) {
    errorMessage.value = 'Please fill in all credentials.'
    return
  }

  // Get owners from localStorage
  const owners = JSON.parse(localStorage.getItem('hall_owners') || '[]')

  if (isLogin.value) {
    // Login flow
    const owner = owners.find(o => o.email.toLowerCase() === email.value.toLowerCase() && o.password === password.value)
    if (!owner) {
      errorMessage.value = 'Invalid email or password.'
      return
    }
    emit('login-success', owner)
  } else {
    // Signup flow
    if (!ownerName.value || !hallName.value || !phone.value) {
      errorMessage.value = 'Please fill in all required fields.'
      return
    }
    
    const emailExists = owners.some(o => o.email.toLowerCase() === email.value.toLowerCase())
    if (emailExists) {
      errorMessage.value = 'This email is already registered.'
      return
    }

    const newOwner = {
      id: 'owner_' + Date.now(),
      ownerName: ownerName.value,
      email: email.value.toLowerCase(),
      password: password.value,
      hallName: hallName.value,
      hallType: hallType.value,
      address: address.value || 'Not Specified',
      capacity: Number(capacity.value) || 500,
      phone: phone.value,
      createdAt: new Date().toISOString()
    }

    owners.push(newOwner)
    localStorage.setItem('hall_owners', JSON.stringify(owners))
    emit('login-success', newOwner)
  }
}
</script>

<template>
  <div class="auth-wrapper">
    <!-- Sleek Ambient Blobs in Background -->
    <div class="bg-blob blob-1"></div>
    <div class="bg-blob blob-2"></div>
    
    <div class="auth-card glass-panel animate-scale">
      <div class="brand">
        <div class="brand-icon">
          <Icons name="building" :size="32" stroke-width="2.5" />
        </div>
        <div class="brand-text">
          <h1>HallBook<span>SaaS</span></h1>
          <p>Banquet & Wedding Hall Management</p>
        </div>
      </div>

      <div class="auth-toggle">
        <button 
          :class="{ active: isLogin }" 
          @click="isLogin = true; errorMessage = ''"
          type="button"
        >
          Sign In
        </button>
        <button 
          :class="{ active: !isLogin }" 
          @click="isLogin = false; errorMessage = ''"
          type="button"
        >
          Register Hall
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="auth-form">
        <!-- Error Alert -->
        <div v-if="errorMessage" class="alert alert-danger animate-fade">
          <Icons name="info" :size="16" />
          <span>{{ errorMessage }}</span>
        </div>

        <!-- Registration Fields -->
        <div v-if="!isLogin" class="form-row">
          <div class="form-group">
            <label class="form-label">Owner Full Name *</label>
            <input 
              v-model="ownerName" 
              type="text" 
              class="form-control" 
              placeholder="e.g. John Doe"
              required 
            />
          </div>
          <div class="form-group">
            <label class="form-label">Phone Number *</label>
            <input 
              v-model="phone" 
              type="tel" 
              class="form-control" 
              placeholder="e.g. +1 234-567-8900"
              required 
            />
          </div>
        </div>

        <div v-if="!isLogin" class="form-row">
          <div class="form-group">
            <label class="form-label">Hall / Ballroom Name *</label>
            <input 
              v-model="hallName" 
              type="text" 
              class="form-control" 
              placeholder="e.g. Grand Sapphire Ballroom"
              required 
            />
          </div>
          <div class="form-group">
            <label class="form-label">Hall Type</label>
            <select v-model="hallType" class="form-control">
              <option value="banquet">Banquet Hall</option>
              <option value="marriage">Marriage Garden / Hall</option>
              <option value="ballroom">Luxury Ballroom</option>
              <option value="multi">Multi-Purpose Hall</option>
            </select>
          </div>
        </div>

        <div v-if="!isLogin" class="form-row">
          <div class="form-group">
            <label class="form-label">Maximum Guest Capacity</label>
            <input 
              v-model="capacity" 
              type="number" 
              class="form-control" 
              placeholder="e.g. 800" 
            />
          </div>
          <div class="form-group">
            <label class="form-label">Address / Location</label>
            <input 
              v-model="address" 
              type="text" 
              class="form-control" 
              placeholder="e.g. 5th Avenue, NY" 
            />
          </div>
        </div>

        <!-- Shared Credentials Fields -->
        <div class="form-group">
          <label class="form-label">Email Address *</label>
          <input 
            v-model="email" 
            type="email" 
            class="form-control" 
            placeholder="name@example.com"
            required 
          />
        </div>

        <div class="form-group">
          <label class="form-label">Password *</label>
          <input 
            v-model="password" 
            type="password" 
            class="form-control" 
            placeholder="••••••••"
            required 
          />
        </div>

        <button type="submit" class="btn btn-primary btn-full">
          <Icons :name="isLogin ? 'logout' : 'user-plus'" :size="18" />
          {{ isLogin ? 'Access Dashboard' : 'Create My Account' }}
        </button>

        <div class="divider">
          <span>or</span>
        </div>

        <button 
          @click="handleDemoLogin" 
          type="button" 
          class="btn btn-secondary btn-full demo-btn"
        >
          <Icons name="check-circle" :size="18" stroke-width="2.5" class="demo-icon" />
          One-Click Demo Account
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.auth-wrapper {
  position: relative;
  min-height: 100vh;
  width: 100vw;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  overflow: hidden;
  background-color: var(--bg-primary);
}

/* Background Glowing Ambient Blobs */
.bg-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.15;
  z-index: 1;
  pointer-events: none;
}

.blob-1 {
  width: 350px;
  height: 350px;
  background-color: var(--primary);
  top: -50px;
  right: -50px;
}

.blob-2 {
  width: 400px;
  height: 400px;
  background-color: #10b981;
  bottom: -100px;
  left: -100px;
}

.auth-card {
  width: 100%;
  max-width: 580px;
  padding: 2.5rem;
  z-index: 5;
  box-shadow: var(--shadow-xl);
}

@media (max-width: 640px) {
  .auth-card {
    padding: 1.5rem;
  }
}

.brand {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.brand-icon {
  background-color: var(--bg-accent-soft);
  color: var(--primary);
  padding: 0.75rem;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color);
}

.brand-text h1 {
  font-size: 1.5rem;
  font-weight: 800;
  line-height: 1.1;
  display: flex;
  align-items: center;
  gap: 2px;
}

.brand-text h1 span {
  color: var(--primary);
}

.brand-text p {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.auth-toggle {
  display: flex;
  background-color: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  padding: 0.3rem;
  border-radius: 12px;
  margin-bottom: 2rem;
}

.auth-toggle button {
  flex: 1;
  border: none;
  background: transparent;
  padding: 0.6rem;
  border-radius: 9px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.2s ease;
}

.auth-toggle button.active {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  box-shadow: var(--shadow-sm);
}

.auth-form {
  display: flex;
  flex-direction: column;
}

.alert {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  margin-bottom: 1.25rem;
  font-size: 0.9rem;
  font-weight: 500;
}

.alert-danger {
  background-color: var(--danger-bg);
  color: var(--danger-text);
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.divider {
  display: flex;
  align-items: center;
  text-align: center;
  margin: 1.5rem 0;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.divider::before, .divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid var(--border-color);
}

.divider:not(:empty)::before {
  margin-right: .75em;
}

.divider:not(:empty)::after {
  margin-left: .75em;
}

.demo-btn {
  border: 1px dashed var(--primary);
  background-color: var(--bg-accent-soft);
  color: var(--primary);
}

.demo-btn:hover {
  background-color: var(--primary-glow);
  transform: translateY(-1px);
}

.demo-icon {
  color: var(--primary);
}
</style>
