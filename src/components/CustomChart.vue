<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  type: {
    type: String,
    default: 'line' // 'line' or 'bar'
  },
  data: {
    type: Array,
    required: true // Array of { label: String, value: Number }
  },
  color: {
    type: String,
    default: '#6366F1'
  },
  fillColor: {
    type: String,
    default: 'rgba(99, 102, 241, 0.15)'
  },
  valuePrefix: {
    type: String,
    default: ''
  }
})

const activeIndex = ref(null)
const tooltipX = ref(0)
const tooltipY = ref(0)
const tooltipContent = ref('')

const width = 500
const height = 220
const padding = { top: 20, right: 20, bottom: 30, left: 50 }

const chartWidth = computed(() => width - padding.left - padding.right)
const chartHeight = computed(() => height - padding.top - padding.bottom)

const maxValue = computed(() => {
  const max = Math.max(...props.data.map(d => d.value), 0)
  return max === 0 ? 100 : Math.ceil(max * 1.15)
})

const yTicks = computed(() => {
  const max = maxValue.value
  return [0, Math.round(max * 0.25), Math.round(max * 0.5), Math.round(max * 0.75), max]
})

const points = computed(() => {
  if (!props.data.length) return []
  
  const stepX = chartWidth.value / (props.data.length - 1 || 1)
  const max = maxValue.value
  
  return props.data.map((item, index) => {
    const x = padding.left + index * stepX
    const y = padding.top + chartHeight.value - (item.value / max) * chartHeight.value
    return { x, y, label: item.label, value: item.value, index }
  })
})

const linePath = computed(() => {
  const pts = points.value
  if (!pts.length) return ''
  
  return pts.reduce((path, pt, i) => {
    return i === 0 ? `M ${pt.x} ${pt.y}` : `${path} L ${pt.x} ${pt.y}`
  }, '')
})

const areaPath = computed(() => {
  const pts = points.value
  if (!pts.length) return ''
  
  const startX = pts[0].x
  const endX = pts[pts.length - 1].x
  const bottomY = padding.top + chartHeight.value
  
  return `${linePath.value} L ${endX} ${bottomY} L ${startX} ${bottomY} Z`
})

const barWidth = computed(() => {
  if (!props.data.length) return 0
  const totalSlots = props.data.length
  return (chartWidth.value / totalSlots) * 0.6
})

const bars = computed(() => {
  if (!props.data.length) return []
  
  const totalSlots = props.data.length
  const stepX = chartWidth.value / totalSlots
  const max = maxValue.value
  const bWidth = barWidth.value
  
  return props.data.map((item, index) => {
    const x = padding.left + index * stepX + (stepX - bWidth) / 2
    const barHeight = (item.value / max) * chartHeight.value
    const y = padding.top + chartHeight.value - barHeight
    
    return {
      x,
      y,
      width: bWidth,
      height: Math.max(barHeight, 2), // Ensure at least a tiny sliver is visible
      label: item.label,
      value: item.value,
      index
    }
  })
})

const showTooltip = (event, item, x, y) => {
  activeIndex.value = item.index
  
  // Calculate relative SVG position
  const svg = event.target.ownerSVGElement || event.target
  const rect = svg.getBoundingClientRect()
  
  tooltipX.value = (x - padding.left + 20)
  tooltipY.value = y - 40
  tooltipContent.value = `${item.label}: ${props.valuePrefix}${item.value.toLocaleString()}`
}

const hideTooltip = () => {
  activeIndex.value = null
}
</script>

<template>
  <div class="custom-chart-container animate-fade">
    <svg :viewBox="`0 0 ${width} ${height}`" width="100%" height="100%" class="chart-svg">
      <defs>
        <!-- Area gradient -->
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="color" stop-opacity="0.3" />
          <stop offset="100%" :stop-color="color" stop-opacity="0.0" />
        </linearGradient>
        
        <!-- Bar gradient -->
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="color" stop-opacity="1" />
          <stop offset="100%" :stop-color="color" stop-opacity="0.6" />
        </linearGradient>
      </defs>

      <!-- Y Grid Lines & Axis Labels -->
      <g class="grid-lines">
        <line 
          v-for="tick in yTicks" 
          :key="tick"
          :x1="padding.left"
          :y1="padding.top + chartHeight - (tick / maxValue) * chartHeight"
          :x2="width - padding.right"
          :y2="padding.top + chartHeight - (tick / maxValue) * chartHeight"
          stroke="var(--border-color)"
          stroke-width="1"
          stroke-dasharray="3,3"
        />
        <text 
          v-for="tick in yTicks" 
          :key="'label-' + tick"
          :x="padding.left - 12"
          :y="padding.top + chartHeight - (tick / maxValue) * chartHeight + 4"
          text-anchor="end"
          class="axis-text"
        >
          {{ valuePrefix }}{{ tick >= 1000 ? (tick / 1000) + 'k' : tick }}
        </text>
      </g>

      <!-- Line Chart Content -->
      <g v-if="type === 'line'">
        <!-- Gradient Area under Line -->
        <path :d="areaPath" fill="url(#areaGrad)" />
        
        <!-- Main Line Path -->
        <path :d="linePath" :stroke="color" stroke-width="3" fill="none" stroke-linecap="round" />

        <!-- Nodes / Circles -->
        <circle 
          v-for="pt in points" 
          :key="'circle-' + pt.index"
          :cx="pt.x"
          :cy="pt.y"
          :r="activeIndex === pt.index ? 6 : 4"
          :fill="activeIndex === pt.index ? '#ffffff' : color"
          :stroke="color"
          stroke-width="2"
          class="chart-node"
          @mouseover="e => showTooltip(e, pt, pt.x, pt.y)"
          @mouseleave="hideTooltip"
        />
      </g>

      <!-- Bar Chart Content -->
      <g v-else-if="type === 'bar'">
        <rect 
          v-for="bar in bars" 
          :key="'bar-' + bar.index"
          :x="bar.x"
          :y="bar.y"
          :width="bar.width"
          :height="bar.height"
          fill="url(#barGrad)"
          rx="4"
          class="chart-bar"
          :class="{ 'bar-active': activeIndex === bar.index }"
          @mouseover="e => showTooltip(e, bar, bar.x + bar.width / 2, bar.y)"
          @mouseleave="hideTooltip"
        />
      </g>

      <!-- X Axis Labels -->
      <g class="x-axis">
        <line 
          :x1="padding.left" 
          :y1="padding.top + chartHeight" 
          :x2="width - padding.right" 
          :y2="padding.top + chartHeight" 
          stroke="var(--border-color)" 
          stroke-width="1" 
        />
        <text 
          v-for="(item, index) in data" 
          :key="'x-label-' + index"
          :x="type === 'line' ? points[index]?.x : bars[index]?.x + barWidth / 2"
          :y="height - 8"
          text-anchor="middle"
          class="axis-text"
        >
          {{ item.label }}
        </text>
      </g>
    </svg>

    <!-- HTML Tooltip floating within chart container -->
    <div 
      v-if="activeIndex !== null" 
      class="chart-tooltip"
      :style="{ left: `${tooltipX}px`, top: `${tooltipY}px` }"
    >
      {{ tooltipContent }}
    </div>
  </div>
</template>

<style scoped>
.custom-chart-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.chart-svg {
  display: block;
}

.axis-text {
  font-size: 0.725rem;
  fill: var(--text-secondary);
  font-family: var(--font-body);
}

.chart-node {
  cursor: pointer;
  transition: r 0.2s ease, fill 0.2s ease;
}

.chart-bar {
  cursor: pointer;
  transition: opacity 0.2s ease, fill 0.2s ease;
}

.chart-bar:hover, .bar-active {
  opacity: 0.95;
  filter: brightness(1.1);
}

.chart-tooltip {
  position: absolute;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  padding: 0.4rem 0.7rem;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  box-shadow: var(--shadow-md);
  pointer-events: none;
  z-index: 10;
  transform: translateX(-50%);
  transition: left 0.1s ease, top 0.1s ease;
  white-space: nowrap;
}

[data-theme="dark"] .chart-tooltip {
  background-color: var(--bg-tertiary);
}
</style>
