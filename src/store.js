import { reactive, watch, nextTick } from 'vue'

// Define the reactive store state
export const store = reactive({
  currentOwner: null,
  theme: 'light',
  activeView: 'dashboard',
  bookings: [],
  packages: [],
  payments: [],
  notifications: [],
  hallDetails: {
    name: '',
    type: 'banquet',
    address: '',
    capacity: 500,
    phone: '',
    logo: ''
  }
})

// Initialize theme
export function initTheme() {
  const savedTheme = localStorage.getItem('hall_theme') || 'light'
  setTheme(savedTheme)
}

export function setTheme(newTheme) {
  store.theme = newTheme
  localStorage.setItem('hall_theme', newTheme)
  document.documentElement.setAttribute('data-theme', newTheme)
}

// Session Management
export function setSession(owner) {
  store.currentOwner = owner
  localStorage.setItem('hall_current_session', JSON.stringify(owner))
  
  if (owner) {
    loadOwnerData(owner.id)
  } else {
    clearState()
  }
}

export function loadSession() {
  const session = localStorage.getItem('hall_current_session')
  if (session) {
    const owner = JSON.parse(session)
    store.currentOwner = owner
    loadOwnerData(owner.id)
    return owner
  }
  return null
}

function clearState() {
  store.bookings = []
  store.packages = []
  store.payments = []
  store.notifications = []
  store.hallDetails = { name: '', type: 'banquet', address: '', capacity: 500, phone: '', logo: '' }
}

// Load and Save Owner Specific Data
export function loadOwnerData(ownerId) {
  const defaultKey = `hall_data_${ownerId}`
  const dataStr = localStorage.getItem(defaultKey)
  
  if (dataStr) {
    const data = JSON.parse(dataStr)
    store.bookings = data.bookings || []
    store.packages = data.packages || []
    store.payments = data.payments || []
    store.hallDetails = data.hallDetails || {
      name: store.currentOwner?.hallName || 'My Banquet Hall',
      type: store.currentOwner?.hallType || 'banquet',
      address: store.currentOwner?.address || '',
      capacity: store.currentOwner?.capacity || 500,
      phone: store.currentOwner?.phone || '',
      logo: ''
    }
  } else {
    // Seed default packages for new users
    store.packages = [
      { id: 'pkg_1', name: 'Standard 1-Dish Menu', type: 'per-guest', price: 1800, description: 'Chicken Qorma, Chicken Biryani, Roti/Naan, Fresh Salad, Raita, and 1 Dessert (Kheer/Halwa)', services: ['Catering', 'Standard Decor', 'Sound System', 'Waiters'] },
      { id: 'pkg_2', name: 'Premium Wedding Menu', type: 'per-guest', price: 2800, description: 'Mutton Qorma/Pulao, Chicken Karahi, Seekh Kabab, Roghni Naan, Salad, Raita, 2 Desserts, Soft Drinks', services: ['Catering', 'Premium Stage Decor', 'AC Hall / Cooling', 'DJ sound system', 'Valet Parking'] },
      { id: 'pkg_3', name: 'Luxury Marquee Rent (Lawn Only)', type: 'flat', price: 350000, description: 'Rent for full grand marquee lawn, red-carpet entryway, premium lighting setup, sound, generators, and cleaning.', services: ['Luxury Decor Layout', 'VIP Valet Parking', 'Professional Stage Lights', 'AC Cooling System', 'Stage Special Effects', 'Backup Generator'] }
    ]
    store.hallDetails = {
      name: store.currentOwner?.hallName || 'My Grand Marquee',
      type: store.currentOwner?.hallType || 'marriage',
      address: store.currentOwner?.address || 'Lahore Cantt, Pakistan',
      capacity: store.currentOwner?.capacity || 800,
      phone: store.currentOwner?.phone || '0300-1234567',
      logo: ''
    }
    store.bookings = []
    store.payments = []
    
    saveOwnerData()
  }

  generateNotifications()
}

export function saveOwnerData() {
  if (!store.currentOwner) return
  const key = `hall_data_${store.currentOwner.id}`
  const dataToSave = {
    bookings: store.bookings,
    packages: store.packages,
    payments: store.payments,
    hallDetails: store.hallDetails
  }
  localStorage.setItem(key, JSON.stringify(dataToSave))
  generateNotifications()
}

// Generate notifications based on business logic
export function generateNotifications() {
  const list = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  store.bookings.forEach(booking => {
    if (booking.status === 'Cancelled') return

    const eventDate = new Date(booking.date)
    eventDate.setHours(0, 0, 0, 0)
    
    const diffTime = eventDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    // 1. Upcoming events alert (next 3 days)
    if (diffDays >= 0 && diffDays <= 3) {
      const dayWord = diffDays === 0 ? 'Today' : diffDays === 1 ? 'Tomorrow' : `in ${diffDays} days`
      list.push({
        id: `noti_upcoming_${booking.id}`,
        type: 'upcoming',
        title: `Upcoming Event: ${booking.eventType}`,
        message: `${booking.customerName}'s event is scheduled for ${dayWord} (${booking.timeSlot} slot).`,
        bookingId: booking.id,
        severity: diffDays <= 1 ? 'danger' : 'warning'
      })
    }

    // 2. Pending payments alert (remaining balance > 0 and event date has passed or is coming up)
    const remaining = booking.totalPrice - booking.paidAmount
    if (remaining > 0 && diffDays <= 7) {
      list.push({
        id: `noti_payment_${booking.id}`,
        type: 'payment',
        title: `Pending Balance: ${booking.customerName}`,
        message: `Outstanding payment of Rs. ${remaining.toLocaleString()} is due for event on ${booking.date}.`,
        bookingId: booking.id,
        severity: diffDays < 0 ? 'danger' : 'warning'
      })
    }
  })

  store.notifications = list
}

// Actions
export function addBooking(booking) {
  const newBooking = {
    id: 'book_' + Date.now(),
    createdAt: new Date().toISOString(),
    ...booking
  }
  store.bookings.push(newBooking)
  
  // Log payment if advance payment was made
  if (booking.paidAmount > 0) {
    addPayment({
      bookingId: newBooking.id,
      customerName: booking.customerName,
      amount: booking.paidAmount,
      method: 'Cash', // Default
      notes: 'Initial Advance Payment'
    }, false) // don't save yet, will save at the end of function
  }
  
  saveOwnerData()
  return newBooking
}

export function updateBooking(updatedBooking) {
  const idx = store.bookings.findIndex(b => b.id === updatedBooking.id)
  if (idx !== -1) {
    const oldBooking = store.bookings[idx]
    
    // Check if paidAmount changed manually
    const difference = updatedBooking.paidAmount - oldBooking.paidAmount
    if (difference !== 0) {
      addPayment({
        bookingId: updatedBooking.id,
        customerName: updatedBooking.customerName,
        amount: difference,
        method: 'Cash',
        notes: difference > 0 ? 'Balance Payment adjustment' : 'Refund adjustment'
      }, false)
    }

    store.bookings[idx] = { ...oldBooking, ...updatedBooking }
    saveOwnerData()
  }
}

export function deleteBooking(bookingId) {
  store.bookings = store.bookings.filter(b => b.id !== bookingId)
  store.payments = store.payments.filter(p => p.bookingId !== bookingId)
  saveOwnerData()
}

export function recordAdditionalPayment(bookingId, amount, method, notes) {
  const idx = store.bookings.findIndex(b => b.id === bookingId)
  if (idx !== -1) {
    const booking = store.bookings[idx]
    const remaining = booking.totalPrice - booking.paidAmount
    const actualPayAmount = Math.min(amount, remaining)
    
    if (actualPayAmount <= 0) return
    
    booking.paidAmount += actualPayAmount
    addPayment({
      bookingId,
      customerName: booking.customerName,
      amount: actualPayAmount,
      method,
      notes: notes || 'Installment Payment'
    }, true)
  }
}

export function addPayment(payment, autoSave = true) {
  const newPayment = {
    id: 'pay_' + Date.now(),
    date: new Date().toISOString().split('T')[0],
    ...payment
  }
  store.payments.unshift(newPayment)
  if (autoSave) saveOwnerData()
}

export function addPackage(pkg) {
  const newPkg = {
    id: 'pkg_' + Date.now(),
    ...pkg
  }
  store.packages.push(newPkg)
  saveOwnerData()
}

export function updatePackage(updatedPkg) {
  const idx = store.packages.findIndex(p => p.id === updatedPkg.id)
  if (idx !== -1) {
    store.packages[idx] = updatedPkg
    saveOwnerData()
  }
}

export function deletePackage(pkgId) {
  store.packages = store.packages.filter(p => p.id !== pkgId)
  saveOwnerData()
}

export function updateHallDetails(details) {
  store.hallDetails = { ...store.hallDetails, ...details }
  saveOwnerData()
}

// Seed complete set of dummy bookings for Demo Owner
export function seedDemoData() {
  const ownerId = store.currentOwner.id
  
  store.packages = [
    { id: 'pkg_1', name: 'Standard 1-Dish Package', type: 'per-guest', price: 1800, description: 'Standard stage, lighting, Chicken Qorma, Chicken Biryani, Roghni Naan, Salad, Raita, and 1 Dessert (Kheer)', services: ['Catering', 'Standard Decor', 'Sound System', 'Waiters'] },
    { id: 'pkg_2', name: 'Premium Wedding Package', type: 'per-guest', price: 2800, description: 'AC Cooling, premium floral stage decoration, grand entrance walkway, Mutton Pulao, Chicken Karahi, Seekh Kababs, Soft Drinks, 2 Desserts', services: ['Catering', 'Floral Decor', 'AC cooling', 'DJ Sound System', 'Valet Parking', 'Stage Lighting'] },
    { id: 'pkg_3', name: 'Luxury Lawn & Stage Rental', type: 'flat', price: 350000, description: 'Flat-rate luxury marquee lawn and stage hire, VIP red-carpet layout, high-end automated moving light heads, backup generators', services: ['Luxury Decor Layout', 'VIP Valet Parking', 'Professional Lights', 'AC Cooling System', 'Stage Special Effects', 'Backup Generator'] }
  ]

  store.hallDetails = {
    name: 'Garrison Marquee & Banquet Hall',
    type: 'marriage',
    address: 'Khyber Road, Cantonment, Lahore, Pakistan',
    capacity: 1200,
    phone: '042-36601234',
    logo: ''
  }

  // Generate date strings relative to today
  const getRelativeDate = (offsetDays) => {
    const d = new Date()
    d.setDate(d.getDate() + offsetDays)
    return d.toISOString().split('T')[0]
  }

  const todayStr = getRelativeDate(0)
  const tomorrowStr = getRelativeDate(1)
  const nextWeekStr = getRelativeDate(5)
  const inTenDaysStr = getRelativeDate(10)
  const inTwoWeeksStr = getRelativeDate(14)
  const lastWeekStr = getRelativeDate(-7)
  const lastMonthStr = getRelativeDate(-25)
  const longAgoStr = getRelativeDate(-45)

  store.bookings = [
    {
      id: 'book_demo_1',
      customerName: 'Zainab Bibi',
      customerPhone: '0300-4567891',
      customerEmail: 'zainab.b@example.pk',
      eventType: 'Barat Reception',
      date: nextWeekStr,
      timeSlot: 'Evening',
      guests: 400,
      packageId: 'pkg_2',
      basePrice: 1120000, // 400 * 2800
      discount: 50000,
      tax: 56000,
      totalPrice: 1126000, // 1120000 - 50000 + 56000
      paidAmount: 400000,
      status: 'Confirmed',
      notes: 'Wants red and white rose stage decor. Groom family arrival expected at 8:00 PM. Separate partition needed for ladies.',
      createdAt: getRelativeDate(-30)
    },
    {
      id: 'book_demo_2',
      customerName: 'Muhammad Bilal',
      customerPhone: '0321-7654321',
      customerEmail: 'mbilal@example.pk',
      eventType: 'Valima Function',
      date: tomorrowStr,
      timeSlot: 'Morning',
      guests: 350,
      packageId: 'pkg_1',
      basePrice: 630000, // 350 * 1800
      discount: 20000,
      tax: 31500,
      totalPrice: 641500,
      paidAmount: 641500,
      status: 'Confirmed',
      notes: 'Single-dish menu. Need hot tea station setup at exit. Kashmiri Chai requested.',
      createdAt: getRelativeDate(-12)
    },
    {
      id: 'book_demo_3',
      customerName: 'Ayesha Rehman',
      customerPhone: '0333-8889991',
      customerEmail: 'ayesha.r@example.pk',
      eventType: 'Mehndi Ceremony',
      date: inTenDaysStr,
      timeSlot: 'Evening',
      guests: 250,
      packageId: 'pkg_2',
      basePrice: 700000, // 250 * 2800
      discount: 15000,
      tax: 35000,
      totalPrice: 720000,
      paidAmount: 720000,
      status: 'Confirmed',
      notes: 'Need extra yellow marigold drapes. DJ sound system needs to start early at 6:00 PM.',
      createdAt: getRelativeDate(-15)
    },
    {
      id: 'book_demo_4',
      customerName: 'Zeeshan Khan',
      customerPhone: '0312-9998882',
      customerEmail: 'zeeshan.k@example.pk',
      eventType: 'Barat Function',
      date: inTwoWeeksStr,
      timeSlot: 'Evening',
      guests: 500,
      packageId: 'pkg_3',
      basePrice: 350000,
      discount: 0,
      tax: 17500,
      totalPrice: 367500,
      paidAmount: 150000,
      status: 'Pending',
      notes: 'Lawn rental only. Stage, DJ and security will be managed by Marquee staff.',
      createdAt: getRelativeDate(-5)
    },
    {
      id: 'book_demo_5',
      customerName: 'Usman Ahmed',
      customerPhone: '0345-1234567',
      customerEmail: 'usman.ahmed@example.pk',
      eventType: 'Engagement',
      date: todayStr,
      timeSlot: 'Evening',
      guests: 150,
      packageId: 'pkg_1',
      basePrice: 270000, // 150 * 1800
      discount: 10000,
      tax: 13500,
      totalPrice: 273500,
      paidAmount: 273500,
      status: 'Confirmed',
      notes: 'Ring ceremony setup. Soft instrumental sitar music in background.',
      createdAt: getRelativeDate(-20)
    },
    {
      id: 'book_demo_6',
      customerName: 'Dr. Yasir Mahmood',
      customerPhone: '0301-2223334',
      customerEmail: 'ymahmood@example.pk',
      eventType: 'Milad Mehfil',
      date: lastWeekStr,
      timeSlot: 'Morning',
      guests: 200,
      packageId: 'pkg_1',
      basePrice: 360000,
      discount: 30000,
      tax: 18000,
      totalPrice: 348000,
      paidAmount: 348000,
      status: 'Completed',
      notes: 'Sound system layout adjusted for spiritual naat recitation. Stage decorated elegantly with white curtains.',
      createdAt: getRelativeDate(-25)
    },
    {
      id: 'book_demo_7',
      customerName: 'Zubair Qureshi',
      customerPhone: '0322-9876543',
      customerEmail: 'zubair.q@example.pk',
      eventType: 'Valima Function',
      date: lastMonthStr,
      timeSlot: 'Evening',
      guests: 400,
      packageId: 'pkg_2',
      basePrice: 1120000,
      discount: 60000,
      tax: 53000,
      totalPrice: 1113000,
      paidAmount: 1113000,
      status: 'Completed',
      notes: 'White and gold floral themes. Traditional Biryani taste was highly praised by guests.',
      createdAt: getRelativeDate(-40)
    },
    {
      id: 'book_demo_8',
      customerName: 'Kamran Akmal',
      customerPhone: '0300-5556667',
      customerEmail: 'kamran.akmal@example.pk',
      eventType: 'Corporate Dinner',
      date: longAgoStr,
      timeSlot: 'Morning',
      guests: 300,
      packageId: 'pkg_2',
      basePrice: 840000,
      discount: 40000,
      tax: 40000,
      totalPrice: 840000,
      paidAmount: 840000,
      status: 'Completed',
      notes: 'Seating layout: Round tables. AV setup and multimedia projector provided.',
      createdAt: getRelativeDate(-60)
    },
    {
      id: 'book_demo_9',
      customerName: 'Sobia Malik',
      customerPhone: '0334-1112223',
      customerEmail: 'sobia.m@example.pk',
      eventType: 'Mayun / Dholki',
      date: nextWeekStr,
      timeSlot: 'Morning',
      guests: 100,
      packageId: 'pkg_1',
      basePrice: 180000,
      discount: 0,
      tax: 9000,
      totalPrice: 189000,
      paidAmount: 50000,
      status: 'Confirmed',
      notes: 'Yellow themed setup with low floor seating cushion arrangements.',
      createdAt: getRelativeDate(-4)
    },
    {
      id: 'book_demo_10',
      customerName: 'Hamza Ali',
      customerPhone: '0315-4445556',
      customerEmail: 'hamza.ali@example.pk',
      eventType: 'Barat Reception',
      date: inTwoWeeksStr,
      timeSlot: 'Morning',
      guests: 600,
      packageId: 'pkg_2',
      basePrice: 1680000,
      discount: 80000,
      tax: 80000,
      totalPrice: 1680000,
      paidAmount: 0,
      status: 'Pending',
      notes: 'Awaiting token payment confirmation. Setup requirements pending.',
      createdAt: getRelativeDate(-2)
    }
  ]

  store.payments = [
    { id: 'pay_demo_1', bookingId: 'book_demo_5', customerName: 'Usman Ahmed', date: todayStr, amount: 273500, method: 'Card', notes: 'Settled via credit card payment' },
    { id: 'pay_demo_2', bookingId: 'book_demo_4', customerName: 'Zeeshan Khan', date: getRelativeDate(-5), amount: 150000, method: 'Bank Transfer', notes: 'Token booking advance' },
    { id: 'pay_demo_3', bookingId: 'book_demo_3', customerName: 'Ayesha Rehman', date: getRelativeDate(-15), amount: 720000, method: 'Online', notes: 'Paid full amount up front' },
    { id: 'pay_demo_4', bookingId: 'book_demo_2', customerName: 'Muhammad Bilal', date: getRelativeDate(-10), amount: 500000, method: 'Cash', notes: 'Initial Advance' },
    { id: 'pay_demo_5', bookingId: 'book_demo_2', customerName: 'Muhammad Bilal', date: getRelativeDate(-2), amount: 141500, method: 'Cash', notes: 'Remaining clear' },
    { id: 'pay_demo_6', bookingId: 'book_demo_1', customerName: 'Zainab Bibi', date: getRelativeDate(-30), amount: 400000, method: 'Online', notes: 'Advance Booking Lock' },
    { id: 'pay_demo_7', bookingId: 'book_demo_6', customerName: 'Dr. Yasir Mahmood', date: getRelativeDate(-25), amount: 348000, method: 'Bank Transfer', notes: 'Invoice clearance' },
    { id: 'pay_demo_8', bookingId: 'book_demo_7', customerName: 'Zubair Qureshi', date: getRelativeDate(-40), amount: 1113000, method: 'Online', notes: 'Full payment received' },
    { id: 'pay_demo_9', bookingId: 'book_demo_8', customerName: 'Kamran Akmal', date: getRelativeDate(-60), amount: 840000, method: 'Cash', notes: 'Settle cash balance' },
    { id: 'pay_demo_10', bookingId: 'book_demo_9', customerName: 'Sobia Malik', date: getRelativeDate(-4), amount: 50000, method: 'Card', notes: 'Token deposit' }
  ]

  saveOwnerData()
}
