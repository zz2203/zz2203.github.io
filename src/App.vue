<template>
  <div class="map-page">
    <div class="main-content">
      <div class="map-wrapper" :class="{ 'with-panel': showDataPanel }">
        <div v-if="loading" class="loading">加载中...</div>
        <div ref="mapContainer" class="map-container"></div>
      </div>
      
      <!-- 学生数据面板 -->
      <div class="data-panel" v-show="showDataPanel">
        <div class="panel-header">
          <h3>学生数据</h3>
          <div class="panel-stats">
            <span class="stat-item">总计: {{ filteredStudents.length }}人</span>
            <span class="stat-item">省份: {{ uniqueProvinces.length }}个</span>
          </div>
        </div>
        
        <div class="panel-controls">
          <div class="search-box">
            <input 
              v-model="searchKeyword" 
              type="text" 
              placeholder="搜索姓名、大学或专业..."
              class="search-input"
            />
          </div>
          <div class="filter-box">
            <select v-model="selectedProvince" class="province-filter">
              <option value="">全部省份</option>
              <option v-for="province in uniqueProvinces" :key="province" :value="province">
                {{ province }}
              </option>
            </select>
          </div>
        </div>
        
        <div class="student-list">
          <div 
            v-for="student in paginatedStudents" 
            :key="`${student.name}-${student.university}`"
            class="student-card"
            @click="highlightProvince(student.province)"
          >
            <div class="student-info">
              <h4 class="student-name">{{ student.name }}</h4>
              <p class="student-university">{{ student.university }}</p>
              <p class="student-major">{{ student.major }}</p>
              <div class="student-location">
                <span class="location-tag">{{ student.province }}</span>
                <span class="city-name">{{ student.city }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 分页控件 -->
        <div class="pagination" v-if="totalPages > 1">
          <button 
            @click="currentPage--" 
            :disabled="currentPage === 1"
            class="page-btn"
          >
            上一页
          </button>
          <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
          <button 
            @click="currentPage++" 
            :disabled="currentPage === totalPages"
            class="page-btn"
          >
            下一页
          </button>
        </div>
        
        <!-- 统计图表区域 -->
        <div class="stats-section">
          <h4>专业分布</h4>
          <div class="major-stats">
            <div 
              v-for="[major, count] in topMajors" 
              :key="major"
              class="major-item"
            >
              <span class="major-name">{{ major }}</span>
              <span class="major-count">{{ count }}人</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import * as d3 from 'd3'
import chinaData from '@/assets/China.json'
import { students, type Student } from '@/data'
import { cityCoordinates, getCityCoordinate, type CityCoordinate } from '@/cityData'

// 延迟加载省份数据的缓存
const provinceDataCache = new Map()
const loadedProvinces = new Set()

// 防抖函数
const debounce = (func: Function, wait: number) => {
  let timeout: number | undefined
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = window.setTimeout(later, wait)
  }
}

const mapContainer = ref<HTMLElement>()
const loading = ref(true)
const currentProvinceId = ref<string | null>(null)
const currentLevelText = ref('国家级视图')
const currentZoomLevel = ref(1)

// 动态获取视口尺寸
const getViewportSize = () => {
  return {
    width: window.innerWidth,
    height: window.innerHeight - 60
  }
}

let width = getViewportSize().width
let height = getViewportSize().height
let svg: any = null
let projection: any = null
let zoom: any = null
let mapGroup: any = null
let provinceGroup: any = null
let cityGroup: any = null
let highlightGroup: any = null
let cityMarkersGroup: any = null

// 按需加载省份数据
const loadProvinceData = async (provinceId: string) => {
  if (provinceDataCache.has(provinceId)) {
    return provinceDataCache.get(provinceId)
  }

  try {
    const response = await import(`@/assets/province/${provinceId}.json`)
    const data = response.default || response
    provinceDataCache.set(provinceId, data)
    loadedProvinces.add(provinceId)
    return data
  } catch (error) {
    console.warn(`无法加载省份数据: ${provinceId}`, error)
    return null
  }
}

const resetView = () => {
  if (svg && zoom) {
    svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity)
    currentLevelText.value = '国家级视图'
    currentProvinceId.value = null
    currentZoomLevel.value = 1
    
    // 重置数据面板筛选
    selectedProvince.value = ''
    searchKeyword.value = ''
    
    updateMapDisplay()
  }
}

// 根据缩放级别更新地图显示
const updateMapDisplay = debounce(() => {
  if (!svg) return

  const zoomLevel = currentZoomLevel.value

  // 根据缩放级别决定是否显示市级边界
  if (zoomLevel > 2.5 && currentProvinceId.value) {
    showCityBoundaries(currentProvinceId.value)
  } else {
    hideCityBoundaries()
  }
  
  // 更新标签显示
  updateLabels(zoomLevel)
  
  // 更新城市标记点
  drawCityMarkers()
}, 150)

// 显示市级边界
const showCityBoundaries = async (provinceId: string) => {
  if (!cityGroup) return

  const provinceData = await loadProvinceData(provinceId)
  if (!provinceData || !provinceData.features) return

  const path = d3.geoPath().projection(projection)

  // 清除现有的市级边界
  cityGroup.selectAll(".city-boundary").remove()

  // 绘制市级边界
  cityGroup.selectAll(".city-boundary")
    .data(provinceData.features)
    .enter()
    .append("path")
    .attr("class", "city-boundary")
    .attr("d", path)
    .attr("fill", "transparent")
    .attr("stroke", "#90caf9")
    .attr("stroke-width", 0.8)
    .attr("opacity", 0)
    .style("pointer-events", "all")
    .style("cursor", "pointer")
    .transition()
    .duration(300)
    .attr("opacity", 1)
         .on("end", function(this: SVGPathElement) {
       // 添加交互事件
       d3.select(this)
         .on("mouseenter", debounce(function(this: SVGPathElement, event: any, d: any) {
          d3.select(this)
            .attr("fill", "rgba(144, 202, 249, 0.2)")
            .attr("stroke", "#1976d2")
            .attr("stroke-width", 1.5)
          
          showEnhancedTooltip(event, d)
        }, 300))
                 .on("mouseleave", function(this: SVGPathElement, event: any, d: any) {
          d3.select(this)
            .attr("fill", "transparent")
            .attr("stroke", "#90caf9")
            .attr("stroke-width", 0.8)
          
          hideTooltip()
        })
    })
}

// 隐藏市级边界
const hideCityBoundaries = () => {
  if (!cityGroup) return
  
  cityGroup.selectAll(".city-boundary")
    .transition()
    .duration(200)
    .attr("opacity", 0)
    .remove()
}

// 更新标签显示
const updateLabels = (zoomLevel: number) => {
  const labels = svg.selectAll(".province-label")
  
  if (zoomLevel > 1.5) {
    labels.transition().duration(200).style("opacity", 0.8)
  } else {
    labels.transition().duration(200).style("opacity", 0)
  }
}

// 窗口大小变化处理
const handleResize = debounce(() => {
  const newSize = getViewportSize()
  width = newSize.width
  height = newSize.height
  
  if (svg && projection) {
    svg.attr("width", width).attr("height", height)
    projection.scale(Math.min(width, height) * 0.6).translate([width / 2, height / 2])
    
    const path = d3.geoPath().projection(projection)
    svg.selectAll("path").attr("d", path)
  }
}, 250)

// 计算省份学生统计数据
const getProvinceStats = () => {
  const stats = new Map<string, { count: number; students: Student[] }>()
  
  students.forEach((student: Student) => {
    const current = stats.get(student.province) || { count: 0, students: [] }
    current.count++
    current.students.push(student)
    stats.set(student.province, current)
  })
  
  return stats
}

// 省份名称映射：将地图中的完整省份名称映射到学生数据中的简化名称
const mapProvinceNameToStudentData = (mapProvinceName: string): string => {
  const mapping: Record<string, string> = {
    '北京市': '北京',
    '天津市': '天津', 
    '河北省': '河北',
    '山西省': '山西',
    '内蒙古自治区': '内蒙古',
    '辽宁省': '辽宁',
    '吉林省': '吉林',
    '黑龙江省': '黑龙江',
    '上海市': '上海',
    '江苏省': '江苏',
    '浙江省': '浙江',
    '安徽省': '安徽',
    '福建省': '福建',
    '江西省': '江西',
    '山东省': '山东',
    '河南省': '河南',
    '湖北省': '湖北',
    '湖南省': '湖南',
    '广东省': '广东',
    '广西壮族自治区': '广西',
    '海南省': '海南',
    '重庆市': '重庆',
    '四川省': '四川',
    '贵州省': '贵州',
    '云南省': '云南',
    '西藏自治区': '西藏',
    '陕西省': '陕西',
    '甘肃省': '甘肃',
    '青海省': '青海',
    '宁夏回族自治区': '宁夏',
    '新疆维吾尔自治区': '新疆',
    '台湾省': '台湾',
    '香港特别行政区': '香港',
    '澳门特别行政区': '澳门'
  }
  
  return mapping[mapProvinceName] || mapProvinceName
}

const provinceStats = getProvinceStats()
const maxStudentCount = Math.max(...Array.from(provinceStats.values()).map(s => s.count))

// 调试信息：输出省份统计数据
console.log('省份统计数据:', provinceStats)
console.log('最大学生数:', maxStudentCount)
console.log('学生数据示例:', students.slice(0, 3))

// 根据学生数量获取省份颜色
const getProvinceColor = (mapProvinceName: string) => {
  const studentProvinceName = mapProvinceNameToStudentData(mapProvinceName)
  const stats = provinceStats.get(studentProvinceName)
  
  // 调试信息
  if (stats && stats.count > 0) {
    console.log(`省份映射: ${mapProvinceName} -> ${studentProvinceName}, 学生数: ${stats.count}`)
  }
  
  if (!stats || stats.count === 0) {
    return '#f5f5f5' // 灰色：无学生
  }
  
  const ratio = stats.count / maxStudentCount
  if (ratio >= 0.8) return '#1565c0' // 深蓝：学生最多
  if (ratio >= 0.6) return '#1976d2' // 蓝色
  if (ratio >= 0.4) return '#42a5f5' // 浅蓝
  if (ratio >= 0.2) return '#90caf9' // 很浅蓝
  return '#e3f2fd' // 最浅蓝：学生较少
}

const drawMap = async () => {
  if (!mapContainer.value) return

  try {
    const geoData = chinaData
    
    // 清除内容
    d3.select(mapContainer.value).selectAll("*").remove()

    // 创建 SVG
    svg = d3.select(mapContainer.value)
      .append("svg")
      .attr("width", width)
      .attr("height", height)

    // 投影设置
    projection = d3.geoMercator()
      .center([104, 38])
      .scale(Math.min(width, height) * 0.6)
      .translate([width / 2, height / 2])

    const path = d3.geoPath().projection(projection)

    // 创建地图组容器
    mapGroup = svg.append("g").attr("class", "map-group")
    
    // 创建分层的组（按渲染顺序）
    cityGroup = mapGroup.append("g").attr("class", "city-group")
    provinceGroup = mapGroup.append("g").attr("class", "province-group")
    const labelGroup = mapGroup.append("g").attr("class", "label-group")
    cityMarkersGroup = mapGroup.append("g").attr("class", "city-markers-group")
    highlightGroup = mapGroup.append("g").attr("class", "highlight-group")

    // 优化的缩放功能
    zoom = d3.zoom()
      .scaleExtent([0.8, 8])
      .on("zoom", (event) => {
        mapGroup.attr("transform", event.transform)
        currentZoomLevel.value = event.transform.k
        updateMapDisplay()
      })

    svg.call(zoom)

    // 绘制省份边界（使用数据驱动的颜色）
    provinceGroup.selectAll(".province")
      .data(geoData.features)
      .enter()
      .append("path")
      .attr("class", "province")
      .attr("d", path)
      .attr("fill", (d: any) => getProvinceColor(d.properties.name))
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 1.5)
      .style("cursor", "pointer")
      .on("mouseenter", debounce(function(this: SVGPathElement, event: any, d: any) {
        d3.select(this)
          .attr("stroke", "#333333")
          .attr("stroke-width", 2)
        
        showEnhancedTooltip(event, d)
      }, 300))
      .on("mouseleave", function(this: SVGPathElement, event: any, d: any) {
        d3.select(this)
          .attr("stroke", "#ffffff")
          .attr("stroke-width", 1.5)
        
        hideTooltip()
      })
      .on("click", async function(event: any, d: any) {
        const provinceId = d.properties.adcode ? d.properties.adcode.toString().substring(0, 2) : null
        
        if (provinceId) {
          currentProvinceId.value = provinceId
          currentLevelText.value = `省级视图 - ${d.properties.name}`
          
          // 同步更新数据面板的省份筛选（使用学生数据中的省份名称）
          const studentProvinceName = mapProvinceNameToStudentData(d.properties.name)
          selectedProvince.value = studentProvinceName
          
          // 预加载省份数据
          loadProvinceData(provinceId)
        }

        // 缩放到省份
        const [[x0, y0], [x1, y1]] = path.bounds(d)
        const scale = Math.min(6, 0.9 / Math.max((x1 - x0) / width, (y1 - y0) / height))
        
        svg.transition().duration(750).call(
          zoom.transform,
          d3.zoomIdentity
            .translate(width / 2, height / 2)
            .scale(scale)
            .translate(-(x0 + x1) / 2, -(y0 + y1) / 2)
        )
      })

    // 添加学生数量标签
    labelGroup.selectAll(".student-count-label")
      .data(geoData.features)
      .enter()
      .append("text")
      .attr("class", "student-count-label")
      .attr("x", (d: any) => path.centroid(d)[0])
      .attr("y", (d: any) => path.centroid(d)[1])
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("font-weight", "600")
      .attr("fill", (d: any) => {
        const studentProvinceName = mapProvinceNameToStudentData(d.properties.name)
        const stats = provinceStats.get(studentProvinceName)
        return stats && stats.count > 0 ? "#ffffff" : "#999999"
      })
      .text((d: any) => {
        const studentProvinceName = mapProvinceNameToStudentData(d.properties.name)
        const stats = provinceStats.get(studentProvinceName)
        return stats && stats.count > 0 ? stats.count : ""
      })
      .style("pointer-events", "none")
      .style("text-shadow", "1px 1px 2px rgba(0,0,0,0.7)")
      .style("opacity", 1)

    // 添加省份名称标签（小字体，在数量下方）
    labelGroup.selectAll(".province-name-label")
      .data(geoData.features.filter((d: any) => {
        const studentProvinceName = mapProvinceNameToStudentData(d.properties.name)
        const stats = provinceStats.get(studentProvinceName)
        return stats && stats.count > 0
      }))
      .enter()
      .append("text")
      .attr("class", "province-name-label")
      .attr("x", (d: any) => path.centroid(d)[0])
      .attr("y", (d: any) => path.centroid(d)[1] + 15)
      .attr("text-anchor", "middle")
      .attr("font-size", "9px")
      .attr("font-weight", "500")
      .attr("fill", "#666666")
      .text((d: any) => {
        let name = d.properties.name
        return name.replace(/省|市|自治区|维吾尔|壮族|回族|特别行政区/g, '')
      })
      .style("pointer-events", "none")
      .style("text-shadow", "1px 1px 1px rgba(255,255,255,0.8)")
      .style("opacity", 0.8)

    // 创建图例组
    const legend = svg.append("g")
      .attr("class", "legend-group")
      .attr("transform", `translate(${width - 180}, 20)`)

    // 图例背景
    legend.append("rect")
      .attr("x", -10)
      .attr("y", -10)
      .attr("width", 160)
      .attr("height", 140)
      .attr("fill", "rgba(255, 255, 255, 0.95)")
      .attr("stroke", "#e0e0e0")
      .attr("stroke-width", 1)
      .attr("rx", 8)
      .style("box-shadow", "0 2px 8px rgba(0,0,0,0.1)")

    // 图例项目
    const legendItems = [
      { color: "#1565c0", label: `${Math.ceil(maxStudentCount * 0.8)}-${maxStudentCount}人`, range: "high" },
      { color: "#1976d2", label: `${Math.ceil(maxStudentCount * 0.6)}-${Math.ceil(maxStudentCount * 0.8)}人`, range: "medium-high" },
      { color: "#42a5f5", label: `${Math.ceil(maxStudentCount * 0.4)}-${Math.ceil(maxStudentCount * 0.6)}人`, range: "medium" },
      { color: "#90caf9", label: `${Math.ceil(maxStudentCount * 0.2)}-${Math.ceil(maxStudentCount * 0.4)}人`, range: "low" },
      { color: "#e3f2fd", label: `1-${Math.ceil(maxStudentCount * 0.2)}人`, range: "very-low" },
      { color: "#f5f5f5", label: "无学生", range: "none" }
    ]

    legendItems.forEach((item, i) => {
      const legendItem = legend.append("g")
        .attr("transform", `translate(5, ${20 + i * 18})`)

      // 颜色方块
      legendItem.append("rect")
        .attr("width", 12)
        .attr("height", 12)
        .attr("fill", item.color)
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 1)
        .attr("rx", 2)

      // 文字标签
      legendItem.append("text")
        .attr("x", 18)
        .attr("y", 9)
        .attr("font-size", "10px")
        .attr("fill", "#666")
        .text(item.label)
    })

    // 绘制城市标记点
    drawCityMarkers()

    loading.value = false
    
  } catch (error) {
    console.error('地图加载失败:', error)
    loading.value = false
  }
}

// 增强的tooltip显示，包含学生详细信息
let tooltipTimer: number | undefined
const showEnhancedTooltip = (event: any, d: any) => {
  clearTimeout(tooltipTimer)
  
  const studentProvinceName = mapProvinceNameToStudentData(d.properties.name)
  const stats = provinceStats.get(studentProvinceName)
  
  const existingTooltip = d3.select(".tooltip")
  if (!existingTooltip.empty()) {
    existingTooltip.remove()
  }
  
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("background", "rgba(0, 0, 0, 0.9)")
    .style("color", "white")
    .style("border-radius", "8px")
    .style("padding", "12px 16px")
    .style("font-size", "13px")
    .style("pointer-events", "none")
    .style("z-index", "1000")
    .style("opacity", 0)
    .style("box-shadow", "0 4px 12px rgba(0,0,0,0.3)")
    .style("max-width", "250px")

  let content = `<div style="font-weight: 600; margin-bottom: 8px; color: #42a5f5;">${d.properties.name}</div>`
  
  if (stats && stats.count > 0) {
    content += `<div style="margin-bottom: 6px;">学生数量: <span style="color: #42a5f5; font-weight: 600;">${stats.count}人</span></div>`
    
    if (stats.students.length <= 3) {
      content += `<div style="font-size: 11px; color: #cccccc;">学生名单:</div>`
      stats.students.forEach((student: Student) => {
        content += `<div style="font-size: 11px; margin-left: 8px; margin-bottom: 2px;">• ${student.name} - ${student.university}</div>`
      })
    } else {
      content += `<div style="font-size: 11px; color: #cccccc;">部分学生:</div>`
      stats.students.slice(0, 2).forEach((student: Student) => {
        content += `<div style="font-size: 11px; margin-left: 8px; margin-bottom: 2px;">• ${student.name} - ${student.university}</div>`
      })
      content += `<div style="font-size: 11px; margin-left: 8px; color: #999999;">...还有${stats.count - 2}人</div>`
    }
  } else {
    content += `<div style="color: #999999;">暂无学生数据</div>`
  }

  tooltip.html(content)
    .style("left", (event.pageX + 15) + "px")
    .style("top", (event.pageY - 10) + "px")

  tooltip.transition().duration(400).style("opacity", 1)
}

const hideTooltip = () => {
  clearTimeout(tooltipTimer)
  d3.selectAll(".tooltip").transition().duration(150).style("opacity", 0).remove()
  d3.selectAll(".city-tooltip").transition().duration(150).style("opacity", 0).remove()
}

const showDataPanel = ref(false)
const showCityMarkers = ref(true)
const searchKeyword = ref('')
const selectedProvince = ref('')
const currentPage = ref(1)
const pageSize = ref(8)

// 计算属性
const filteredStudents = computed(() => {
  let filtered = students
  
  // 按省份筛选
  if (selectedProvince.value) {
    filtered = filtered.filter((s: Student) => s.province === selectedProvince.value)
  }
  
  // 按关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    filtered = filtered.filter((s: Student) => 
      s.name.toLowerCase().includes(keyword) ||
      s.university.toLowerCase().includes(keyword) ||
      s.major.toLowerCase().includes(keyword)
    )
  }
  
  return filtered
})

const paginatedStudents = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredStudents.value.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(filteredStudents.value.length / pageSize.value)
})

const uniqueProvinces = computed(() => {
  return [...new Set(students.map((s: Student) => s.province))].sort()
})

const topMajors = computed(() => {
  const majorCount = new Map<string, number>()
  filteredStudents.value.forEach((s: Student) => {
    majorCount.set(s.major, (majorCount.get(s.major) || 0) + 1)
  })
  return Array.from(majorCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
})

// 监听筛选变化，重置分页
watch([searchKeyword, selectedProvince], () => {
  currentPage.value = 1
})

const toggleDataPanel = () => {
  showDataPanel.value = !showDataPanel.value
}

const toggleCityMarkers = () => {
  showCityMarkers.value = !showCityMarkers.value
  updateCityMarkersDisplay()
}

// 更新城市标记点显示
const updateCityMarkersDisplay = () => {
  if (!cityMarkersGroup) return
  
  if (showCityMarkers.value) {
    cityMarkersGroup.style("opacity", 1).style("pointer-events", "all")
  } else {
    cityMarkersGroup.style("opacity", 0).style("pointer-events", "none")
  }
}

// 绘制城市标记点
const drawCityMarkers = () => {
  if (!cityMarkersGroup || !projection) return

  // 获取有学生的城市数据
  const studentsWithCoords = students.map((student: Student) => {
    const coord = getCityCoordinate(student.city)
    return coord ? { ...student, coord } : null
  }).filter(Boolean)

  // 按城市分组统计学生数量
  const cityStats = new Map<string, { coord: CityCoordinate; students: Student[]; count: number }>()
  
  studentsWithCoords.forEach((item: any) => {
    const cityKey = `${item.coord.name}-${item.coord.province}`
    if (!cityStats.has(cityKey)) {
      cityStats.set(cityKey, { 
        coord: item.coord, 
        students: [], 
        count: 0 
      })
    }
    const cityData = cityStats.get(cityKey)!
    cityData.students.push(item)
    cityData.count++
  })

  // 清除现有标记点
  cityMarkersGroup.selectAll(".city-marker").remove()
  cityMarkersGroup.selectAll(".city-label").remove()

  // 绘制城市标记点
  Array.from(cityStats.values()).forEach((cityData) => {
    const [x, y] = projection([cityData.coord.lng, cityData.coord.lat])
    
    // 城市标记圆点
    const marker = cityMarkersGroup.append("circle")
      .attr("class", "city-marker")
      .attr("cx", x)
      .attr("cy", y)
      .attr("r", Math.min(8, Math.max(3, cityData.count + 2)))
      .attr("fill", "#ff5722")
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.3))")
      .on("mouseenter", function(this: SVGCircleElement, event: any) {
        // 放大效果
        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", Math.min(12, Math.max(5, cityData.count + 4)))
          .attr("stroke-width", 3)
        
        // 显示城市信息tooltip
        showCityTooltip(event, cityData)
      })
      .on("mouseleave", function(this: SVGCircleElement) {
        // 恢复原大小
        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", Math.min(8, Math.max(3, cityData.count + 2)))
          .attr("stroke-width", 2)
        
        hideTooltip()
      })
      .on("click", function(event: any) {
        // 点击城市标记点时，在数据面板中显示该城市的学生
        showDataPanel.value = true
        selectedProvince.value = cityData.coord.province
        searchKeyword.value = cityData.coord.name
      })

    // 城市名称标签
    if (currentZoomLevel.value > 2) {
      cityMarkersGroup.append("text")
        .attr("class", "city-label")
        .attr("x", x)
        .attr("y", y + 20)
        .attr("text-anchor", "middle")
        .attr("font-size", "10px")
        .attr("font-weight", "500")
        .attr("fill", "#333333")
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 2)
        .attr("paint-order", "stroke")
        .style("pointer-events", "none")
        .text(cityData.coord.name.replace("市", ""))
    }
  })
}

// 显示城市信息tooltip
const showCityTooltip = (event: any, cityData: any) => {
  const existingTooltip = d3.select(".city-tooltip")
  if (!existingTooltip.empty()) {
    existingTooltip.remove()
  }
  
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "city-tooltip")
    .style("position", "absolute")
    .style("background", "rgba(255, 87, 34, 0.95)")
    .style("color", "white")
    .style("border-radius", "8px")
    .style("padding", "12px 16px")
    .style("font-size", "13px")
    .style("pointer-events", "none")
    .style("z-index", "1000")
    .style("opacity", 0)
    .style("box-shadow", "0 4px 12px rgba(0,0,0,0.3)")
    .style("max-width", "280px")

  let content = `<div style="font-weight: 600; margin-bottom: 8px; color: #fff3e0;">${cityData.coord.name}</div>`
  content += `<div style="margin-bottom: 6px;">学生数量: <span style="color: #fff3e0; font-weight: 600;">${cityData.count}人</span></div>`
  
  if (cityData.students.length <= 3) {
    content += `<div style="font-size: 11px; color: #ffccbc;">学生名单:</div>`
    cityData.students.forEach((student: Student) => {
      content += `<div style="font-size: 11px; margin-left: 8px; margin-bottom: 2px;">• ${student.name} - ${student.university}</div>`
    })
  } else {
    content += `<div style="font-size: 11px; color: #ffccbc;">部分学生:</div>`
    cityData.students.slice(0, 2).forEach((student: Student) => {
      content += `<div style="font-size: 11px; margin-left: 8px; margin-bottom: 2px;">• ${student.name} - ${student.university}</div>`
    })
    content += `<div style="font-size: 11px; margin-left: 8px; color: #ffab91;">...还有${cityData.count - 2}人</div>`
  }

  tooltip.html(content)
    .style("left", (event.pageX + 15) + "px")
    .style("top", (event.pageY - 10) + "px")

  tooltip.transition().duration(400).style("opacity", 1)
}

const highlightProvince = (provinceName: string) => {
  // 找到对应省份并高亮显示
  if (svg) {
    svg.selectAll('.province')
      .transition()
      .duration(300)
      .attr('stroke', (d: any) => {
        const studentProvinceName = mapProvinceNameToStudentData(d.properties.name)
        return studentProvinceName === provinceName ? '#ff5722' : '#ffffff'
      })
      .attr('stroke-width', (d: any) => {
        const studentProvinceName = mapProvinceNameToStudentData(d.properties.name)
        return studentProvinceName === provinceName ? 3 : 1.5
      })
      .style('filter', (d: any) => {
        const studentProvinceName = mapProvinceNameToStudentData(d.properties.name)
        return studentProvinceName === provinceName ? 'brightness(1.2) drop-shadow(0 0 8px rgba(255, 87, 34, 0.8))' : 'none'
      })
    
    // 3秒后恢复正常样式
    setTimeout(() => {
      if (svg) {
        svg.selectAll('.province')
          .transition()
          .duration(500)
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 1.5)
          .style('filter', 'none')
      }
    }, 3000)
  }
}

onMounted(() => {
  drawMap()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  // 清理定时器
  d3.selectAll(".tooltip").remove()
})
</script>

<style scoped>
.map-page {
  min-height: 100vh;
  background: #ffffff;
  padding: 0;
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  overflow: hidden;
}

.main-content {
  display: flex;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
}

.map-wrapper {
  flex: 1;
  overflow: hidden;
  transition: all 0.3s ease;
  position: relative;
}

.map-wrapper.with-panel {
  flex: 0 0 calc(100% - 400px);
}

.floating-controls {
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  gap: 12px;
  z-index: 1000;
}

.control-btn {
  padding: 12px 18px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.95);
  color: #495057;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.control-btn:hover {
  background: rgba(255, 255, 255, 1);
  border-color: #1976d2;
  color: #1976d2;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}

.loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #6c757d;
  font-size: 14px;
  z-index: 100;
}

.map-container {
  width: 100%;
  height: 100%;
  background: #fff;
  overflow: hidden;
}

:deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
}

:deep(.province) {
  transition: fill 0.2s ease, stroke 0.2s ease, stroke-width 0.2s ease;
}

:deep(.city-boundary) {
  transition: fill 0.2s ease, stroke 0.2s ease, stroke-width 0.2s ease;
}

:deep(.province-label) {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  user-select: none;
  transition: opacity 0.3s ease;
}

:deep(.student-count-label) {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  user-select: none;
  pointer-events: none;
}

:deep(.province-name-label) {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  user-select: none;
  pointer-events: none;
}

:deep(.legend-group) {
  pointer-events: none;
}

:deep(.legend-group rect) {
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
}

/* 数据面板样式 */
.data-panel {
  width: 400px;
  background: #ffffff;
  border-left: 1px solid #e9ecef;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
}

.panel-header {
  padding: 20px;
  border-bottom: 1px solid #e9ecef;
  background: #f8f9fa;
}

.panel-header h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #212529;
}

.panel-stats {
  display: flex;
  gap: 16px;
}

.stat-item {
  font-size: 12px;
  color: #6c757d;
  background: #ffffff;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #dee2e6;
}

.panel-controls {
  padding: 16px 20px;
  border-bottom: 1px solid #e9ecef;
  background: #ffffff;
}

.search-box {
  margin-bottom: 12px;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #1976d2;
  box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.1);
}

.province-filter {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 14px;
  background: #ffffff;
  cursor: pointer;
}

.student-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 20px;
}

.student-card {
  background: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  margin-bottom: 12px;
  padding: 16px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.student-card:hover {
  border-color: #1976d2;
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.1);
  transform: translateY(-1px);
}

.student-name {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #212529;
}

.student-university {
  margin: 0 0 6px 0;
  font-size: 14px;
  color: #495057;
  font-weight: 500;
}

.student-major {
  margin: 0 0 12px 0;
  font-size: 13px;
  color: #6c757d;
}

.student-location {
  display: flex;
  align-items: center;
  gap: 8px;
}

.location-tag {
  background: linear-gradient(135deg, #1976d2, #42a5f5);
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.city-name {
  font-size: 12px;
  color: #6c757d;
}

.pagination {
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #e9ecef;
  background: #f8f9fa;
}

.page-btn {
  padding: 6px 12px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  background: #ffffff;
  color: #495057;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.page-btn:hover:not(:disabled) {
  border-color: #1976d2;
  color: #1976d2;
}

.page-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.page-info {
  font-size: 12px;
  color: #6c757d;
}

.stats-section {
  padding: 20px;
  border-top: 1px solid #e9ecef;
  background: #f8f9fa;
}

.stats-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #212529;
}

.major-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.major-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 6px;
}

.major-name {
  font-size: 12px;
  color: #495057;
  flex: 1;
}

.major-count {
  font-size: 11px;
  color: #1976d2;
  font-weight: 600;
  background: rgba(25, 118, 210, 0.1);
  padding: 2px 6px;
  border-radius: 10px;
}

.data-panel-toggle {
  background: linear-gradient(135deg, #1976d2, #42a5f5) !important;
  color: white !important;
  border: none !important;
}

.data-panel-toggle:hover {
  background: linear-gradient(135deg, #1565c0, #1976d2) !important;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(25, 118, 210, 0.3) !important;
}

.control-btn.active {
  background: linear-gradient(135deg, #ff5722, #ff7043) !important;
  color: white !important;
  border: none !important;
}

.control-btn.active:hover {
  background: linear-gradient(135deg, #e64a19, #ff5722) !important;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(255, 87, 34, 0.3) !important;
}

/* 城市标记点样式 */
:deep(.city-markers-group) {
  pointer-events: all;
}

:deep(.city-marker) {
  transition: all 0.2s ease;
}

:deep(.city-label) {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  user-select: none;
  pointer-events: none;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .data-panel {
    width: 350px;
  }
  
  .map-wrapper.with-panel {
    flex: 0 0 calc(100% - 350px);
  }
  
  .floating-controls {
    top: 16px;
    right: 16px;
    gap: 8px;
  }
  
  .control-btn {
    padding: 10px 14px;
    font-size: 12px;
  }
}

@media (max-width: 768px) {
  .data-panel {
    width: 100%;
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 1001;
  }
  
  .map-wrapper.with-panel {
    flex: 1;
  }
  
  .floating-controls {
    top: 12px;
    right: 12px;
    gap: 6px;
  }
  
  .control-btn {
    padding: 8px 12px;
    font-size: 11px;
    border-radius: 6px;
  }
}

/* 针对高DPI屏幕优化 */
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  :deep(.province) {
    shape-rendering: geometricPrecision;
  }
  
  :deep(.city-boundary) {
    shape-rendering: geometricPrecision;
  }
}
</style> 