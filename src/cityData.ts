export interface CityCoordinate {
    name: string
    province: string
    lng: number  // 经度
    lat: number  // 纬度
}

// 主要城市坐标数据（基于学生数据中的城市）
export const cityCoordinates: CityCoordinate[] = [
    // 直辖市
    { name: "北京市", province: "北京", lng: 116.4074, lat: 39.9042 },
    { name: "上海市", province: "上海", lng: 121.4737, lat: 31.2304 },
    { name: "重庆市", province: "重庆", lng: 106.5516, lat: 29.5630 },
    
    // 广东省
    { name: "广州市", province: "广东", lng: 113.2644, lat: 23.1291 },
    { name: "深圳市", province: "广东", lng: 114.0579, lat: 22.5431 },
    
    // 江苏省
    { name: "南京市", province: "江苏", lng: 118.7969, lat: 32.0603 },
    { name: "苏州市", province: "江苏", lng: 120.6197, lat: 31.2989 },
    
    // 浙江省
    { name: "杭州市", province: "浙江", lng: 120.1551, lat: 30.2741 },
    
    // 山东省
    { name: "济南市", province: "山东", lng: 117.0009, lat: 36.6758 },
    
    // 湖北省
    { name: "武汉市", province: "湖北", lng: 114.2985, lat: 30.5844 },
    
    // 湖南省
    { name: "长沙市", province: "湖南", lng: 112.9388, lat: 28.2282 },
    
    // 四川省
    { name: "成都市", province: "四川", lng: 104.0657, lat: 30.6587 },
    
    // 辽宁省
    { name: "沈阳市", province: "辽宁", lng: 123.4315, lat: 41.8057 },
    
    // 吉林省
    { name: "长春市", province: "吉林", lng: 125.3245, lat: 43.8868 },
    
    // 黑龙江省
    { name: "哈尔滨市", province: "黑龙江", lng: 126.5358, lat: 45.8023 },
    
    // 安徽省
    { name: "合肥市", province: "安徽", lng: 117.2272, lat: 31.8206 },
    
    // 福建省
    { name: "厦门市", province: "福建", lng: 118.1689, lat: 24.4797 },
    
    // 江西省
    { name: "南昌市", province: "江西", lng: 115.8579, lat: 28.6890 },
    
    // 河北省
    { name: "石家庄市", province: "河北", lng: 114.4995, lat: 38.1006 },
    
    // 山西省
    { name: "太原市", province: "山西", lng: 112.5489, lat: 37.8706 },
    
    // 云南省
    { name: "昆明市", province: "云南", lng: 102.8329, lat: 24.8801 },
    
    // 贵州省
    { name: "贵阳市", province: "贵州", lng: 106.7135, lat: 26.5783 },
    
    // 海南省
    { name: "海口市", province: "海南", lng: 110.3312, lat: 20.0458 },
    
    // 甘肃省
    { name: "兰州市", province: "甘肃", lng: 103.8236, lat: 36.0581 },
    
    // 青海省
    { name: "西宁市", province: "青海", lng: 101.7782, lat: 36.6171 },
    
    // 内蒙古自治区
    { name: "呼和浩特市", province: "内蒙古", lng: 111.7508, lat: 40.8414 },
    
    // 广西壮族自治区
    { name: "南宁市", province: "广西", lng: 108.3661, lat: 22.8172 },
    
    // 新疆维吾尔自治区
    { name: "乌鲁木齐市", province: "新疆", lng: 87.6177, lat: 43.7928 },
    
    // 特别行政区
    { name: "香港", province: "香港", lng: 114.1694, lat: 22.3193 },
]

// 根据城市名称获取坐标
export const getCityCoordinate = (cityName: string): CityCoordinate | undefined => {
    return cityCoordinates.find(city => city.name === cityName)
}

// 根据省份获取该省份的所有城市
export const getCitiesByProvince = (provinceName: string): CityCoordinate[] => {
    return cityCoordinates.filter(city => city.province === provinceName)
} 