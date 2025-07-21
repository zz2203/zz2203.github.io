export interface Student {
    province: "北京" | "上海" | "天津" | "重庆" | "河北" | "山西" | "辽宁" | "吉林" | "黑龙江" | "江苏" | "浙江" | "安徽" | "福建" | "江西" | "山东" | "河南" | "湖北" | "湖南" | "广东" | "海南" | "四川" | "贵州" | "云南" | "陕西" | "甘肃" | "青海" | "台湾" | "内蒙古" | "广西" | "西藏" | "宁夏" | "新疆" | "香港" | "澳门"
    city: string
    name: string
    university: string
    major: string
}

export const students: Student[] = [
    {
        province: "北京",
        city: "北京市",
        name: "张伟",
        university: "清华大学",
        major: "计算机科学与技术"
    },
    {
        province: "北京",
        city: "北京市",
        name: "李娜",
        university: "北京大学",
        major: "法学"
    },
    {
        province: "上海",
        city: "上海市",
        name: "王强",
        university: "复旦大学",
        major: "经济学"
    },
    {
        province: "上海",
        city: "上海市",
        name: "赵敏",
        university: "上海交通大学",
        major: "机械工程"
    },
    {
        province: "广东",
        city: "广州市",
        name: "陈思",
        university: "中山大学",
        major: "生物科学"
    },
    {
        province: "广东",
        city: "深圳市",
        name: "林涛",
        university: "深圳大学",
        major: "电子信息工程"
    },
    {
        province: "江苏",
        city: "南京市",
        name: "周洁",
        university: "南京大学",
        major: "历史学"
    },
    {
        province: "江苏",
        city: "苏州市",
        name: "徐磊",
        university: "苏州大学",
        major: "材料科学与工程"
    },
    {
        province: "浙江",
        city: "杭州市",
        name: "孙丽",
        university: "浙江大学",
        major: "环境科学"
    },
    {
        province: "山东",
        city: "济南市",
        name: "马超",
        university: "山东大学",
        major: "数学"
    },
    {
        province: "湖北",
        city: "武汉市",
        name: "刘洋",
        university: "武汉大学",
        major: "新闻传播学"
    },
    {
        province: "湖南",
        city: "长沙市",
        name: "唐雪",
        university: "中南大学",
        major: "土木工程"
    },
    {
        province: "四川",
        city: "成都市",
        name: "何俊",
        university: "四川大学",
        major: "临床医学"
    },
    {
        province: "辽宁",
        city: "沈阳市",
        name: "高峰",
        university: "东北大学",
        major: "冶金工程"
    },
    {
        province: "吉林",
        city: "长春市",
        name: "吴婷",
        university: "吉林大学",
        major: "化学"
    },
    {
        province: "黑龙江",
        city: "哈尔滨市",
        name: "宋明",
        university: "哈尔滨工业大学",
        major: "航天工程"
    },
    {
        province: "重庆",
        city: "重庆市",
        name: "杨帆",
        university: "重庆大学",
        major: "建筑学"
    },
    {
        province: "安徽",
        city: "合肥市",
        name: "许静",
        university: "中国科学技术大学",
        major: "物理学"
    },
    {
        province: "福建",
        city: "厦门市",
        name: "邓凯",
        university: "厦门大学",
        major: "会计学"
    },
    {
        province: "江西",
        city: "南昌市",
        name: "罗丹",
        university: "南昌大学",
        major: "软件工程"
    },
    {
        province: "河北",
        city: "石家庄市",
        name: "崔琳",
        university: "河北大学",
        major: "英语"
    },
    {
        province: "山西",
        city: "太原市",
        name: "郭亮",
        university: "山西大学",
        major: "地理科学"
    },
    {
        province: "云南",
        city: "昆明市",
        name: "李欣",
        university: "云南大学",
        major: "生态学"
    },
    {
        province: "贵州",
        city: "贵阳市",
        name: "潘涛",
        university: "贵州大学",
        major: "食品科学与工程"
    },
    {
        province: "海南",
        city: "海口市",
        name: "郑丽",
        university: "海南大学",
        major: "旅游管理"
    },
    {
        province: "甘肃",
        city: "兰州市",
        name: "韩雪",
        university: "兰州大学",
        major: "大气科学"
    },
    {
        province: "青海",
        city: "西宁市",
        name: "马志",
        university: "青海大学",
        major: "水利工程"
    },
    {
        province: "内蒙古",
        city: "呼和浩特市",
        name: "包娜",
        university: "内蒙古大学",
        major: "草业科学"
    },
    {
        province: "广西",
        city: "南宁市",
        name: "韦明",
        university: "广西大学",
        major: "民族学"
    },
    {
        province: "新疆",
        city: "乌鲁木齐市",
        name: "阿不都",
        university: "新疆大学",
        major: "资源勘查工程"
    },
    {
        province: "香港",
        city: "香港",
        name: "陈嘉欣",
        university: "香港大学",
        major: "金融学"
    }
]