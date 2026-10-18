/**
 * 当地天气 - Local Weather Web App
 * 纯本地运行，免密钥，优雅流畅，支持实时定位与全球搜索
 */

(function () {
  'use strict';

  // ----------------------------------------------------
  // 状态管理
  // ----------------------------------------------------
  const state = {
    unit: localStorage.getItem('local_weather_unit') || 'celsius', // 'celsius' or 'fahrenheit'
    currentLocation: null, // { name, region, country, lat, lon }
    weatherData: null,
    airQualityData: null,
    favorites: JSON.parse(localStorage.getItem('local_weather_favs') || '[]'),
    isLoading: false,
    theme: 'theme-clouds'
  };

  // 默认城市 (北京)
  const DEFAULT_CITY = {
    name: '北京',
    region: '北京市',
    country: '中国',
    lat: 39.9075,
    lon: 116.39723
  };

  // ----------------------------------------------------
  // WMO 天气代码映射表
  // ----------------------------------------------------
  const WMO_CODES = {
    0: { desc: '晴朗', theme: 'clear', icon: 'sun' },
    1: { desc: '晴间多云', theme: 'clear', icon: 'partly-cloudy' },
    2: { desc: '多云', theme: 'clouds', icon: 'partly-cloudy' },
    3: { desc: '阴天', theme: 'clouds', icon: 'overcast' },
    45: { desc: '有雾', theme: 'fog', icon: 'fog' },
    48: { desc: '冻雾', theme: 'fog', icon: 'fog' },
    51: { desc: '轻度毛毛雨', theme: 'rain', icon: 'drizzle' },
    53: { desc: '毛毛雨', theme: 'rain', icon: 'drizzle' },
    55: { desc: '稠密毛毛雨', theme: 'rain', icon: 'drizzle' },
    56: { desc: '轻微冻雨', theme: 'rain', icon: 'sleet' },
    57: { desc: '浓密冻雨', theme: 'rain', icon: 'sleet' },
    61: { desc: '小雨', theme: 'rain', icon: 'rain-light' },
    63: { desc: '中雨', theme: 'rain', icon: 'rain-mod' },
    65: { desc: '大暴雨', theme: 'rain', icon: 'rain-heavy' },
    66: { desc: '冻雨', theme: 'rain', icon: 'sleet' },
    67: { desc: '重度冻雨', theme: 'rain', icon: 'sleet' },
    71: { desc: '小雪', theme: 'snow', icon: 'snow-light' },
    73: { desc: '中雪', theme: 'snow', icon: 'snow-mod' },
    75: { desc: '大暴雪', theme: 'snow', icon: 'snow-heavy' },
    77: { desc: '雪粒/冰雹', theme: 'snow', icon: 'hail' },
    80: { desc: '微弱阵雨', theme: 'rain', icon: 'rain-light' },
    81: { desc: '阵雨', theme: 'rain', icon: 'rain-mod' },
    82: { desc: '暴雨阵雨', theme: 'rain', icon: 'rain-heavy' },
    85: { desc: '小阵雪', theme: 'snow', icon: 'snow-light' },
    86: { desc: '大阵雪', theme: 'snow', icon: 'snow-heavy' },
    95: { desc: '雷阵雨', theme: 'thunder', icon: 'thunder' },
    96: { desc: '雷雨伴有轻度冰雹', theme: 'thunder', icon: 'thunder' },
    99: { desc: '雷暴大冰雹', theme: 'thunder', icon: 'thunder' }
  };

  // ----------------------------------------------------
  // SVG 图标库 (矢量高保真)
  // ----------------------------------------------------
  function getWeatherSvg(iconType, isDay = 1) {
    const isNight = isDay === 0;

    switch (iconType) {
      case 'sun':
        if (isNight) {
          return `
            <svg viewBox="0 0 64 64" fill="none">
              <path d="M42 18A20 20 0 1 1 22 46a22 22 0 0 0 20-28z" fill="#fef08a" stroke="#facc15" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="48" cy="16" r="1.5" fill="#ffffff" opacity="0.8"/>
              <circle cx="52" cy="28" r="1" fill="#ffffff" opacity="0.6"/>
            </svg>`;
        }
        return `
          <svg viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="14" fill="url(#sunGrad)" stroke="#f59e0b" stroke-width="2"/>
            <path d="M32 6v6M32 52v6M6 32h6M52 32h6M13.6 13.6l4.2 4.2M46.2 46.2l4.2 4.2M13.6 50.4l4.2-4.2M46.2 17.8l4.2-4.2" stroke="#f59e0b" stroke-width="3" stroke-linecap="round"/>
            <defs>
              <radialGradient id="sunGrad" cx="35%" cy="35%" r="70%">
                <stop offset="0%" stop-color="#fef08a"/>
                <stop offset="100%" stop-color="#f59e0b"/>
              </radialGradient>
            </defs>
          </svg>`;

      case 'partly-cloudy':
        if (isNight) {
          return `
            <svg viewBox="0 0 64 64" fill="none">
              <path d="M38 12A14 14 0 1 1 24 32a15 15 0 0 0 14-20z" fill="#fef08a" opacity="0.9"/>
              <path d="M46 48H20a12 12 0 0 1-1.8-23.8 16 16 0 0 1 31.2-4.4A12 12 0 0 1 46 48z" fill="url(#cloudGradNight)" stroke="rgba(255,255,255,0.4)" stroke-width="1.5"/>
              <defs>
                <linearGradient id="cloudGradNight" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#94a3b8"/>
                  <stop offset="100%" stop-color="#475569"/>
                </linearGradient>
              </defs>
            </svg>`;
        }
        return `
          <svg viewBox="0 0 64 64" fill="none">
            <circle cx="24" cy="22" r="11" fill="#f59e0b" opacity="0.95"/>
            <path d="M48 50H22a13 13 0 0 1-2.2-25.8 17 17 0 0 1 33.2-4.4A13 13 0 0 1 48 50z" fill="url(#cloudGradDay)" stroke="rgba(255,255,255,0.6)" stroke-width="1.5"/>
            <defs>
              <linearGradient id="cloudGradDay" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#ffffff"/>
                <stop offset="100%" stop-color="#cbd5e1"/>
              </linearGradient>
            </defs>
          </svg>`;

      case 'overcast':
        return `
          <svg viewBox="0 0 64 64" fill="none">
            <path d="M46 46H18a12 12 0 0 1-1.8-23.8 16 16 0 0 1 31.2-4.4A12 12 0 0 1 46 46z" fill="#94a3b8" opacity="0.7"/>
            <path d="M50 52H24a12 12 0 0 1-1.8-23.8 16 16 0 0 1 31.2-4.4A12 12 0 0 1 50 52z" fill="url(#overcastGrad)" stroke="rgba(255,255,255,0.4)" stroke-width="1.5"/>
            <defs>
              <linearGradient id="overcastGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#e2e8f0"/>
                <stop offset="100%" stop-color="#64748b"/>
              </linearGradient>
            </defs>
          </svg>`;

      case 'drizzle':
      case 'rain-light':
        return `
          <svg viewBox="0 0 64 64" fill="none">
            <path d="M48 40H22a12 12 0 0 1-2-23.8 16 16 0 0 1 31.2-4.4A12 12 0 0 1 48 40z" fill="url(#rainCloudGrad)" stroke="rgba(255,255,255,0.5)" stroke-width="1.5"/>
            <line x1="22" y1="46" x2="18" y2="54" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="34" y1="46" x2="30" y2="54" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="46" y1="46" x2="42" y2="54" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/>
            <defs>
              <linearGradient id="rainCloudGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#cbd5e1"/>
                <stop offset="100%" stop-color="#475569"/>
              </linearGradient>
            </defs>
          </svg>`;

      case 'rain-mod':
      case 'rain-heavy':
        return `
          <svg viewBox="0 0 64 64" fill="none">
            <path d="M48 38H20a13 13 0 0 1-2.2-25.8 17 17 0 0 1 33.2-4.4A13 13 0 0 1 48 38z" fill="url(#heavyRainGrad)" stroke="rgba(255,255,255,0.4)" stroke-width="1.5"/>
            <line x1="20" y1="44" x2="14" y2="56" stroke="#0ea5e9" stroke-width="3" stroke-linecap="round"/>
            <line x1="30" y1="44" x2="24" y2="56" stroke="#0ea5e9" stroke-width="3" stroke-linecap="round"/>
            <line x1="40" y1="44" x2="34" y2="56" stroke="#0ea5e9" stroke-width="3" stroke-linecap="round"/>
            <line x1="50" y1="44" x2="44" y2="56" stroke="#0ea5e9" stroke-width="3" stroke-linecap="round"/>
            <defs>
              <linearGradient id="heavyRainGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#94a3b8"/>
                <stop offset="100%" stop-color="#334155"/>
              </linearGradient>
            </defs>
          </svg>`;

      case 'thunder':
        return `
          <svg viewBox="0 0 64 64" fill="none">
            <path d="M48 36H20a13 13 0 0 1-2.2-25.8 17 17 0 0 1 33.2-4.4A13 13 0 0 1 48 36z" fill="#334155" stroke="rgba(255,255,255,0.4)" stroke-width="1.5"/>
            <polygon points="32 36 24 48 33 48 28 60 42 45 34 45" fill="#facc15" stroke="#eab308" stroke-width="1.5"/>
          </svg>`;

      case 'snow-light':
      case 'snow-mod':
      case 'snow-heavy':
      case 'sleet':
      case 'hail':
        return `
          <svg viewBox="0 0 64 64" fill="none">
            <path d="M48 38H22a12 12 0 0 1-2-23.8 16 16 0 0 1 31.2-4.4A12 12 0 0 1 48 38z" fill="#64748b" opacity="0.9"/>
            <circle cx="20" cy="48" r="2.5" fill="#e0f2fe"/>
            <circle cx="32" cy="52" r="2.5" fill="#ffffff"/>
            <circle cx="44" cy="48" r="2.5" fill="#e0f2fe"/>
            <circle cx="26" cy="58" r="2" fill="#ffffff"/>
            <circle cx="38" cy="58" r="2" fill="#e0f2fe"/>
          </svg>`;

      case 'fog':
        return `
          <svg viewBox="0 0 64 64" fill="none">
            <path d="M46 32H20a10 10 0 0 1-1.6-19.8 14 14 0 0 1 27.2-3.8A10 10 0 0 1 46 32z" fill="#94a3b8" opacity="0.6"/>
            <line x1="12" y1="40" x2="52" y2="40" stroke="#e2e8f0" stroke-width="3" stroke-linecap="round"/>
            <line x1="16" y1="48" x2="48" y2="48" stroke="#cbd5e1" stroke-width="3" stroke-linecap="round"/>
            <line x1="20" y1="56" x2="44" y2="56" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/>
          </svg>`;

      default:
        return getWeatherSvg('sun', isDay);
    }
  }

  // ----------------------------------------------------
  // 温度换算与格式化
  // ----------------------------------------------------
  function formatTemp(celsiusVal) {
    if (celsiusVal === undefined || celsiusVal === null || isNaN(celsiusVal)) return '--';
    if (state.unit === 'fahrenheit') {
      const f = (celsiusVal * 9) / 5 + 32;
      return Math.round(f);
    }
    return Math.round(celsiusVal);
  }

  // ----------------------------------------------------
  // 风速与风向换算
  // ----------------------------------------------------
  function getWindDirectionDesc(degrees) {
    if (degrees === undefined || degrees === null) return '微风';
    const directions = ['北风', '东北风', '东风', '东南风', '南风', '西南风', '西风', '西北风'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
  }

  function getBeaufortScale(kmh) {
    if (!kmh || kmh < 1) return { level: 0, text: '无风' };
    if (kmh <= 5) return { level: 1, text: '软风' };
    if (kmh <= 11) return { level: 2, text: '轻风' };
    if (kmh <= 19) return { level: 3, text: '微风' };
    if (kmh <= 28) return { level: 4, text: '和风' };
    if (kmh <= 38) return { level: 5, text: '清风' };
    if (kmh <= 49) return { level: 6, text: '强风' };
    if (kmh <= 61) return { level: 7, text: '疾风' };
    if (kmh <= 74) return { level: 8, text: '大风' };
    return { level: 9, text: '烈风以上' };
  }

  // ----------------------------------------------------
  // 空气质量 AQI 等级评定
  // ----------------------------------------------------
  function getAqiInfo(aqi) {
    if (aqi === undefined || aqi === null) {
      return { level: '未知', class: '', desc: '暂无空气监测数据' };
    }
    if (aqi <= 50) {
      return { level: '优', class: '', desc: '空气质量令人满意，基本无空气污染。' };
    }
    if (aqi <= 100) {
      return { level: '良', class: 'aqi-moderate', desc: '空气质量可接受，敏感人群适当减少户外活动。' };
    }
    if (aqi <= 150) {
      return { level: '轻度污染', class: 'aqi-moderate', desc: '易感人群症状有轻度加剧，健康人群出现刺激症状。' };
    }
    return { level: '中重污染', class: 'aqi-unhealthy', desc: '外出建议佩戴防霾口罩，儿童及老人应留在室内。' };
  }

  // ----------------------------------------------------
  // 紫外线指数说明
  // ----------------------------------------------------
  function getUvInfo(uv) {
    if (uv === undefined || uv === null) return { level: '未知', desc: '正常防护' };
    if (uv <= 2) return { level: '最弱', desc: '无需特殊防护，安全外出' };
    if (uv <= 5) return { level: '中等', desc: '涂擦SPF15防晒霜，戴帽子' };
    if (uv <= 7) return { level: '较强', desc: '外出需遮阳帽、墨镜与防晒霜' };
    if (uv <= 10) return { level: '很强', desc: '尽量避免中午时段长时间外出' };
    return { level: '极强', desc: '极高风险，尽量留在遮荫处' };
  }

  // ----------------------------------------------------
  // 综合生活气象指数算法
  // ----------------------------------------------------
  function generateLifeIndex(current, daily) {
    const temp = current.temperature_2m;
    const precipProb = daily.precipitation_probability_max ? daily.precipitation_probability_max[0] : 0;
    const uvMax = daily.uv_index_max ? daily.uv_index_max[0] : 3;
    const windKmh = current.wind_speed_10m;
    const weatherCode = current.weather_code;

    // 1. 穿衣建议
    let dress = { title: '穿衣指南', icon: '👔', level: '舒适', advice: '建议着单层薄衫、长裤等春秋过渡装。' };
    if (temp <= 0) {
      dress = { title: '穿衣指南', icon: '🧥', level: '寒冷', advice: '严寒天气，请着加厚羽绒服、毛皮大衣并戴手套帽子。' };
    } else if (temp <= 10) {
      dress = { title: '穿衣指南', icon: '🧥', level: '偏冷', advice: '天气较冷，建议穿棉衣、冬大衣、厚毛衣或皮夹克。' };
    } else if (temp <= 18) {
      dress = { title: '穿衣指南', icon: '🧥', level: '凉爽', advice: '建议着风衣、大衣、夹克衫、毛衣等春秋冬季服装。' };
    } else if (temp <= 25) {
      dress = { title: '穿衣指南', icon: '👕', level: '舒适', advice: '气温适宜，建议着单层薄衫、T恤搭薄外套、休闲裤。' };
    } else {
      dress = { title: '穿衣指南', icon: '🎽', level: '炎热', advice: '天气炎热，建议穿着短衫、短裤、薄裙等透气夏装。' };
    }

    // 2. 运动指数
    let sports = { title: '户外运动', icon: '🏃', level: '适宜', advice: '气候良好，推荐慢跑、骑行或球类运动。' };
    if (precipProb > 50 || weatherCode >= 51) {
      sports = { title: '户外运动', icon: '🧘', level: '不适宜', advice: '有降水天气，建议选择室内健身、瑜伽或力量锻炼。' };
    } else if (temp > 33) {
      sports = { title: '户外运动', icon: '🏊', level: '较不宜', advice: '气温过高，避免高温时段剧烈运动，注意补水防中暑。' };
    } else if (temp < 2) {
      sports = { title: '户外运动', icon: '🧤', level: '较适宜', advice: '气温低，户外运动需做好充分热身，防受凉扭伤。' };
    }

    // 3. 感冒指数
    let cold = { title: '感冒预防', icon: '💊', level: '少发', advice: '温差适中，各项气象指标良好，感冒风险较低。' };
    const tempRange = (daily.temperature_2m_max[0] || temp) - (daily.temperature_2m_min[0] || temp);
    if (tempRange >= 10 || temp <= 5) {
      cold = { title: '感冒预防', icon: '🧣', level: '易发', advice: '昼夜温差大或气温偏低，体弱者应注意适时增减衣物。' };
    }

    // 4. 晾晒指数
    let laundry = { title: '衣物晾晒', icon: '🧺', level: '极佳', advice: '阳光充足，空气流通好，非常适宜晾晒衣物。' };
    if (precipProb > 40 || weatherCode >= 51) {
      laundry = { title: '衣物晾晒', icon: '🌧️', level: '不宜', advice: '有降雨风险，不建议室外晾晒衣物，请选择室内烘干。' };
    } else if (current.relative_humidity_2m > 80) {
      laundry = { title: '衣物晾晒', icon: '💨', level: '基本适宜', advice: '空气湿度较高，衣物晾干耗时稍长。' };
    }

    // 5. 洗车指数
    let car = { title: '车辆洗晒', icon: '🚗', level: '适宜', advice: '未来两天无明显降水，适宜清洗爱车。' };
    if (precipProb > 30 || (daily.precipitation_probability_max[1] && daily.precipitation_probability_max[1] > 40)) {
      car = { title: '车辆洗晒', icon: '🚙', level: '不宜', advice: '近期有降雨可能，洗车容易再次被泥雨溅污。' };
    }

    // 6. 舒适度
    let comfort = { title: '体感舒适', icon: '🍃', level: '舒适', advice: '温湿度适宜，感觉轻松惬意。' };
    if (temp > 30 && current.relative_humidity_2m > 70) {
      comfort = { title: '体感舒适', icon: '♨️', level: '闷热', advice: '湿热明显，建议室内开空调抽湿，保持通风。' };
    } else if (temp < 5 && windKmh > 20) {
      comfort = { title: '体感舒适', icon: '❄️', level: '湿冷', advice: '风寒效应显著，出门请防风保暖。' };
    }

    return [dress, sports, cold, laundry, car, comfort];
  }

  // ----------------------------------------------------
  // 动态粒子背景 (Canvas 实现轻量级无依赖雨/雪/星光)
  // ----------------------------------------------------
  const canvas = document.getElementById('weatherCanvas');
  const ctx = canvas.getContext('2d');
  let animationFrameId = null;
  let particles = [];

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  function initParticles(type) {
    particles = [];
    const count = type === 'rain' ? 85 : type === 'snow' ? 50 : type === 'night' ? 65 : 20;

    for (let i = 0; i < count; i++) {
      if (type === 'rain') {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          length: Math.random() * 20 + 10,
          speed: Math.random() * 9 + 12,
          opacity: Math.random() * 0.4 + 0.2
        });
      } else if (type === 'snow') {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 2.5 + 1,
          speedY: Math.random() * 1.5 + 0.8,
          speedX: Math.random() * 1 - 0.5,
          opacity: Math.random() * 0.7 + 0.3
        });
      } else if (type === 'night') {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height * 0.7,
          radius: Math.random() * 1.5 + 0.5,
          alpha: Math.random(),
          speed: Math.random() * 0.02 + 0.005
        });
      } else {
        // 白天微光光斑
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height * 0.5,
          radius: Math.random() * 80 + 40,
          alpha: Math.random() * 0.08 + 0.02,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3
        });
      }
    }
  }

  function renderParticles(type) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (type === 'rain') {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.globalAlpha = p.opacity;
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - 3, p.y + p.length);
        ctx.stroke();

        p.y += p.speed;
        p.x -= 2;
        if (p.y > canvas.height) {
          p.y = -20;
          p.x = Math.random() * canvas.width;
        }
      });
    } else if (type === 'snow') {
      ctx.fillStyle = '#ffffff';
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.globalAlpha = p.opacity;
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        p.y += p.speedY;
        p.x += p.speedX;
        if (p.y > canvas.height) {
          p.y = -5;
          p.x = Math.random() * canvas.width;
        }
      });
    } else if (type === 'night') {
      particles.forEach((p) => {
        p.alpha += p.speed;
        const currentAlpha = (Math.sin(p.alpha) + 1) / 2 * 0.7 + 0.2;
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = currentAlpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      });
    } else {
      // 柔和光晕
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.globalAlpha = p.alpha;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = grad;
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -100) p.x = canvas.width + 100;
        if (p.x > canvas.width + 100) p.x = -100;
      });
    }

    ctx.globalAlpha = 1;
    animationFrameId = requestAnimationFrame(() => renderParticles(type));
  }

  function setWeatherAnimation(themeType, isDay) {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);

    let particleMode = 'day';
    if (themeType === 'rain' || themeType === 'thunder') {
      particleMode = 'rain';
    } else if (themeType === 'snow') {
      particleMode = 'snow';
    } else if (!isDay) {
      particleMode = 'night';
    } else {
      particleMode = 'day';
    }

    initParticles(particleMode);
    renderParticles(particleMode);
  }

  // ----------------------------------------------------
  // UI 辅助方法
  // ----------------------------------------------------
  const toast = document.getElementById('statusToast');
  let toastTimer = null;
  function showToast(message, duration = 3000) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  }

  const loadingOverlay = document.getElementById('loadingOverlay');
  const loadingText = document.getElementById('loadingText');
  function setLoading(loading, text = '正在获取气象数据...') {
    state.isLoading = loading;
    if (loadingOverlay) {
      if (loading) {
        if (loadingText) loadingText.textContent = text;
        loadingOverlay.classList.add('active');
      } else {
        loadingOverlay.classList.remove('active');
      }
    }
  }

  // ----------------------------------------------------
  // 获取天气核心 API
  // ----------------------------------------------------
  async function fetchWeather(lat, lon, locationInfo = null) {
    setLoading(true, '正在连接气象卫星与观测网...');
    const refreshIcon = document.getElementById('refreshIcon');
    if (refreshIcon) refreshIcon.classList.add('rotating');

    try {
      // 1. 查询基础天气数据 (包含当前、逐小时、7日预报)
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure&hourly=temperature_2m,weather_code,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,sunrise,sunset&timezone=auto`;
      
      // 2. 同时查询空气质量数据
      const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm10,pm2_5,us_aqi`;

      const [weatherRes, aqiRes] = await Promise.allSettled([
        fetch(weatherUrl).then((r) => {
          if (!r.ok) throw new Error('天气数据接口请求失败');
          return r.json();
        }),
        fetch(aqiUrl).then((r) => {
          if (!r.ok) return null;
          return r.json();
        })
      ]);

      if (weatherRes.status !== 'fulfilled' || !weatherRes.value) {
        throw new Error('未能获取天气数据，请检查网络连接');
      }

      state.weatherData = weatherRes.value;
      state.airQualityData = aqiRes.status === 'fulfilled' ? aqiRes.value : null;

      if (locationInfo) {
        state.currentLocation = locationInfo;
      }

      // 渲染所有界面
      renderAll();
      showToast(`已更新「${state.currentLocation?.name || '当前位置'}」最新气象数据`);

      // 缓存最后访问的城市
      if (state.currentLocation) {
        localStorage.setItem('local_weather_last_city', JSON.stringify(state.currentLocation));
      }
    } catch (err) {
      console.error('Fetch weather failed:', err);
      showToast('获取天气失败，请稍后重试');
    } finally {
      setLoading(false);
      if (refreshIcon) refreshIcon.classList.remove('rotating');
    }
  }

  // ----------------------------------------------------
  // 定位策略 (HTML5 Geolocation + Photon逆地理 + IP兜底)
  // ----------------------------------------------------
  async function detectLocation() {
    setLoading(true, '正在获取您的地理位置...');

    // 辅助函数：根据经纬度逆地理反查中文城市名 (使用公开免密钥的 Photon API)
    async function reverseGeocode(lat, lon) {
      try {
        const res = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (data && data.features && data.features.length > 0) {
          const props = data.features[0].properties;
          const cityName = props.city || props.district || props.state || props.county || '当地';
          const region = [props.state, props.district].filter(Boolean).join(' · ') || props.country || '';
          return {
            name: cityName,
            region: region,
            country: props.country || '本地',
            lat,
            lon
          };
        }
      } catch (e) {
        console.warn('Reverse geocode failed:', e);
      }
      return {
        name: '当地位置',
        region: `经纬度: ${lat.toFixed(2)}°, ${lon.toFixed(2)}°`,
        country: '定位成功',
        lat,
        lon
      };
    }

    // 优先尝试浏览器原生地理定位
    if (navigator.geolocation) {
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 6000,
            maximumAge: 300000
          });
        });

        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const loc = await reverseGeocode(lat, lon);
        await fetchWeather(lat, lon, loc);
        return;
      } catch (geoErr) {
        console.warn('Browser geolocation declined or timed out, fallback to IP location...', geoErr);
      }
    }

    // 兜底策略：使用高精度 IP 定位服务 (ipwho.is，免密钥，无限制)
    try {
      const ipRes = await fetch('https://ipwho.is/');
      if (ipRes.ok) {
        const ipData = await ipRes.json();
        if (ipData.success && ipData.latitude && ipData.longitude) {
          const loc = {
            name: ipData.city || ipData.region || '本地',
            region: [ipData.region, ipData.country].filter(Boolean).join(' · '),
            country: ipData.country || '',
            lat: ipData.latitude,
            lon: ipData.longitude
          };
          await fetchWeather(loc.lat, loc.lon, loc);
          return;
        }
      }
    } catch (ipErr) {
      console.warn('IP geolocation failed:', ipErr);
    }

    // 最终默认兜底：北京
    showToast('未能获取当前GPS定位，已显示默认城市天气');
    await fetchWeather(DEFAULT_CITY.lat, DEFAULT_CITY.lon, DEFAULT_CITY);
  }

  // ----------------------------------------------------
  // 全球城市搜索与联想 (Open-Meteo Geocoding API)
  // ----------------------------------------------------
  const searchInput = document.getElementById('citySearchInput');
  const searchResults = document.getElementById('searchResults');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  let searchDebounceTimer = null;

  async function performSearch(query) {
    const q = query.trim();
    if (!q) {
      searchResults.classList.remove('active');
      searchResults.innerHTML = '';
      return;
    }

    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=zh&format=json`;
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const data = await res.json();

      if (!data.results || data.results.length === 0) {
        searchResults.innerHTML = `<div class="search-result-item" style="color:var(--text-muted); cursor:default;">未找到与「${escapeHtml(q)}」相关的城市</div>`;
        searchResults.classList.add('active');
        return;
      }

      let html = '';
      data.results.forEach((item, index) => {
        const regionDesc = [item.admin1, item.admin2, item.country].filter(Boolean).join(' · ');
        html += `
          <div class="search-result-item" data-index="${index}">
            <div class="search-result-title">${escapeHtml(item.name)}</div>
            <div class="search-result-sub">${escapeHtml(regionDesc)}</div>
          </div>
        `;
      });

      searchResults.innerHTML = html;
      searchResults.classList.add('active');

      // 绑定点击事件
      searchResults.querySelectorAll('.search-result-item').forEach((elem) => {
        elem.addEventListener('click', () => {
          const idx = parseInt(elem.getAttribute('data-index'), 10);
          const chosen = data.results[idx];
          if (chosen) {
            selectCity({
              name: chosen.name,
              region: [chosen.admin1, chosen.country].filter(Boolean).join(' · '),
              country: chosen.country || '',
              lat: chosen.latitude,
              lon: chosen.longitude
            });
          }
        });
      });
    } catch (e) {
      console.warn('Search failed:', e);
    }
  }

  function selectCity(cityObj) {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    searchResults.classList.remove('active');
    searchResults.innerHTML = '';
    fetchWeather(cityObj.lat, cityObj.lon, cityObj);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const val = e.target.value;
      clearSearchBtn.style.display = val ? 'flex' : 'none';
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        performSearch(val);
      }, 280);
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const firstItem = searchResults.querySelector('.search-result-item');
        if (firstItem && firstItem.hasAttribute('data-index')) {
          firstItem.click();
        } else if (searchInput.value.trim()) {
          performSearch(searchInput.value.trim());
        }
      } else if (e.key === 'Escape') {
        searchResults.classList.remove('active');
      }
    });

    // 点击其他区域关闭下拉
    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
        searchResults.classList.remove('active');
      }
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      clearSearchBtn.style.display = 'none';
      searchResults.classList.remove('active');
      searchInput.focus();
    });
  }

  // ----------------------------------------------------
  // 收藏夹管理
  // ----------------------------------------------------
  function isCurrentCityFavorite() {
    if (!state.currentLocation) return false;
    return state.favorites.some(
      (f) => Math.abs(f.lat - state.currentLocation.lat) < 0.05 && Math.abs(f.lon - state.currentLocation.lon) < 0.05
    );
  }

  function toggleFavorite() {
    if (!state.currentLocation) return;
    const exists = isCurrentCityFavorite();
    if (exists) {
      state.favorites = state.favorites.filter(
        (f) => Math.abs(f.lat - state.currentLocation.lat) >= 0.05 || Math.abs(f.lon - state.currentLocation.lon) >= 0.05
      );
      showToast(`已从收藏夹移除「${state.currentLocation.name}」`);
    } else {
      state.favorites.push({
        name: state.currentLocation.name,
        region: state.currentLocation.region,
        country: state.currentLocation.country,
        lat: state.currentLocation.lat,
        lon: state.currentLocation.lon
      });
      showToast(`已收藏「${state.currentLocation.name}」`);
    }

    localStorage.setItem('local_weather_favs', JSON.stringify(state.favorites));
    renderFavorites();
    updateFavoriteButton();
  }

  function updateFavoriteButton() {
    const favBtn = document.getElementById('favoriteBtn');
    if (!favBtn) return;
    if (isCurrentCityFavorite()) {
      favBtn.classList.add('is-fav');
      favBtn.title = '取消收藏';
    } else {
      favBtn.classList.remove('is-fav');
      favBtn.title = '收藏此城市';
    }
  }

  function renderFavorites() {
    const container = document.getElementById('favoriteChips');
    if (!container) return;

    if (state.favorites.length === 0) {
      container.innerHTML = '';
      return;
    }

    let html = '';
    state.favorites.forEach((fav, index) => {
      const isActive =
        state.currentLocation &&
        Math.abs(fav.lat - state.currentLocation.lat) < 0.05 &&
        Math.abs(fav.lon - state.currentLocation.lon) < 0.05;
      html += `
        <button class="city-chip ${isActive ? 'active' : ''}" data-fav-idx="${index}">
          ⭐ ${escapeHtml(fav.name)}
        </button>
      `;
    });

    container.innerHTML = html;

    container.querySelectorAll('.city-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-fav-idx'), 10);
        const city = state.favorites[idx];
        if (city) {
          fetchWeather(city.lat, city.lon, city);
        }
      });
    });
  }

  // ----------------------------------------------------
  // 主渲染流程 (Hero, Hourly, 7-Day, Metrics, Life Index)
  // ----------------------------------------------------
  function renderAll() {
    if (!state.weatherData) return;

    const current = state.weatherData.current;
    const hourly = state.weatherData.hourly;
    const daily = state.weatherData.daily;

    const codeInfo = WMO_CODES[current.weather_code] || { desc: '多云', theme: 'clouds', icon: 'partly-cloudy' };
    const isDay = current.is_day !== undefined ? current.is_day : 1;

    // 1. 设置主体背景与粒子特效
    let themeClass = `theme-${codeInfo.theme}`;
    if (codeInfo.theme === 'clear' && !isDay) {
      themeClass = 'theme-clear-night';
    } else if (codeInfo.theme === 'clear' && isDay) {
      themeClass = 'theme-clear-day';
    }
    document.body.className = themeClass;
    setWeatherAnimation(codeInfo.theme, isDay);

    // 2. 核心 Hero 卡片
    document.getElementById('cityName').textContent = state.currentLocation?.name || '本地';
    document.getElementById('cityRegion').textContent = state.currentLocation?.region || state.currentLocation?.country || '当前所在地';
    
    // 更新时间
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    document.getElementById('updateTime').textContent = `更新于 ${timeStr}`;

    // 天气主数值与图标
    document.getElementById('currentTemp').textContent = formatTemp(current.temperature_2m);
    document.getElementById('weatherDesc').textContent = codeInfo.desc;
    document.getElementById('heroIconContainer').innerHTML = getWeatherSvg(codeInfo.icon, isDay);
    document.getElementById('conditionBadge').textContent = codeInfo.desc;

    // 今日最高/最低
    const todayMax = daily.temperature_2m_max ? daily.temperature_2m_max[0] : current.temperature_2m;
    const todayMin = daily.temperature_2m_min ? daily.temperature_2m_min[0] : current.temperature_2m;
    document.getElementById('todayMaxTemp').textContent = `${formatTemp(todayMax)}°`;
    document.getElementById('todayMinTemp').textContent = `${formatTemp(todayMin)}°`;
    document.getElementById('feelsLikeTemp').textContent = `${formatTemp(current.apparent_temperature)}°`;

    // AQI 徽标
    const aqiVal = state.airQualityData?.current?.us_aqi;
    const aqiInfo = getAqiInfo(aqiVal);
    const aqiBadge = document.getElementById('aqiBadge');
    if (aqiBadge) {
      aqiBadge.textContent = aqiVal ? `AQI ${aqiVal} · ${aqiInfo.level}` : 'AQI 优良';
      aqiBadge.className = `pill-badge aqi-badge ${aqiInfo.class}`;
    }

    // 今日天气智能总结
    let summary = `今日天气${codeInfo.desc}，实时气温约 ${formatTemp(current.temperature_2m)}°。`;
    if (daily.precipitation_probability_max && daily.precipitation_probability_max[0] > 30) {
      summary += `今日降水概率较高 (${daily.precipitation_probability_max[0]}%)，出行备好雨具。`;
    } else if (current.temperature_2m > 28) {
      summary += `午后气温偏高，外出请做好防晒遮阳并多补充水分。`;
    } else if (current.apparent_temperature < 10) {
      summary += `夜间温度较低，体感偏凉，外出请注意保暖。`;
    } else {
      summary += `微风和畅，气温舒适，非常适宜户外漫步与日常出行。`;
    }
    document.getElementById('weatherSummary').textContent = summary;

    // 3. 逐小时预报 (24小时)
    renderHourlyForecast(hourly);

    // 4. 未来 7 天预报
    renderDailyForecast(daily);

    // 5. 8 项详细气象指标
    renderMetrics(current, daily);

    // 6. 生活气象指数
    renderLifeIndex(current, daily);

    // 7. 更新收藏按钮状态
    updateFavoriteButton();
    renderFavorites();
  }

  // ----------------------------------------------------
  // 逐小时预报渲染 (包含当前往后24小时)
  // ----------------------------------------------------
  function renderHourlyForecast(hourly) {
    const container = document.getElementById('hourlyForecastList');
    if (!container || !hourly || !hourly.time) return;

    // 寻找当前时间点在 hourly.time 中的最接近下标
    const nowIso = new Date().toISOString().slice(0, 13); // e.g. "2026-10-19T01"
    let startIndex = hourly.time.findIndex((t) => t.startsWith(nowIso));
    if (startIndex === -1) startIndex = 0;

    const count = 24;
    let html = '';

    for (let i = 0; i < count; i++) {
      const idx = startIndex + i;
      if (idx >= hourly.time.length) break;

      const timeStr = hourly.time[idx];
      const hourNum = new Date(timeStr).getHours();
      const isNow = i === 0;
      const displayTime = isNow ? '现在' : `${String(hourNum).padStart(2, '0')}:00`;

      const code = hourly.weather_code[idx];
      const codeInfo = WMO_CODES[code] || { desc: '晴', icon: 'sun' };
      const temp = formatTemp(hourly.temperature_2m[idx]);
      const precip = hourly.precipitation_probability ? hourly.precipitation_probability[idx] : 0;
      
      // 判断小时所属昼夜
      const isDayHour = hourNum >= 6 && hourNum < 18 ? 1 : 0;

      html += `
        <div class="hourly-card ${isNow ? 'is-now' : ''}">
          <span class="hourly-time">${displayTime}</span>
          <div class="hourly-icon">${getWeatherSvg(codeInfo.icon, isDayHour)}</div>
          <span class="hourly-temp">${temp}°</span>
          ${precip > 0 ? `<span class="hourly-precip">💧${precip}%</span>` : ''}
        </div>
      `;
    }

    container.innerHTML = html;
  }

  // ----------------------------------------------------
  // 7天预报渲染 (带温度范围图条)
  // ----------------------------------------------------
  function renderDailyForecast(daily) {
    const container = document.getElementById('dailyForecastList');
    if (!container || !daily || !daily.time) return;

    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    
    // 计算未来 7 天全局最高与最低，用来计算进度条跨度
    const allMins = daily.temperature_2m_min.slice(0, 7);
    const allMaxs = daily.temperature_2m_max.slice(0, 7);
    const globalMin = Math.min(...allMins);
    const globalMax = Math.max(...allMaxs);
    const globalSpan = Math.max(globalMax - globalMin, 1);

    let html = '';
    const daysCount = Math.min(daily.time.length, 7);

    for (let i = 0; i < daysCount; i++) {
      const dateObj = new Date(daily.time[i]);
      let dayName = weekDays[dateObj.getDay()];
      if (i === 0) dayName = '今天';
      else if (i === 1) dayName = '明天';

      const code = daily.weather_code[i];
      const codeInfo = WMO_CODES[code] || { desc: '晴', icon: 'sun' };
      const minT = daily.temperature_2m_min[i];
      const maxT = daily.temperature_2m_max[i];
      const precipProb = daily.precipitation_probability_max ? daily.precipitation_probability_max[i] : 0;

      // 进度条百分比
      const leftPercent = ((minT - globalMin) / globalSpan) * 100;
      const widthPercent = Math.max(((maxT - minT) / globalSpan) * 100, 8);

      html += `
        <div class="daily-row">
          <div class="daily-day-name">${dayName}</div>
          <div class="daily-condition">
            <div class="daily-icon">${getWeatherSvg(codeInfo.icon, 1)}</div>
            <span class="daily-desc">${codeInfo.desc}</span>
            ${precipProb > 0 ? `<span class="daily-rain-prob">${precipProb}%</span>` : ''}
          </div>
          <div class="daily-bar-container">
            <div class="temp-bar-track">
              <div class="temp-bar-fill" style="left: ${leftPercent}%; width: ${widthPercent}%;"></div>
            </div>
          </div>
          <div class="daily-temps">
            <span class="daily-temp-min">${formatTemp(minT)}°</span>
            <span class="temp-divider">/</span>
            <span class="daily-temp-max">${formatTemp(maxT)}°</span>
          </div>
        </div>
      `;
    }

    container.innerHTML = html;
  }

  // ----------------------------------------------------
  // 8 项详细气象指标渲染
  // ----------------------------------------------------
  function renderMetrics(current, daily) {
    // 1. 体感温度
    const appTemp = current.apparent_temperature;
    document.getElementById('metricFeelsLike').textContent = formatTemp(appTemp);
    const tempDiff = Math.round(appTemp - current.temperature_2m);
    let feelsDesc = '与实际温度相近';
    if (tempDiff > 2) feelsDesc = '由于湿度影响，体感更暖';
    else if (tempDiff < -2) feelsDesc = '受风力影响，体感偏凉';
    document.getElementById('metricFeelsLikeDesc').textContent = feelsDesc;

    // 2. 湿度
    const hum = current.relative_humidity_2m;
    document.getElementById('metricHumidity').textContent = hum ?? '--';
    let humDesc = '湿度适宜';
    if (hum < 30) humDesc = '空气干燥，多补水滋润';
    else if (hum > 75) humDesc = '空气潮湿，体感偏润';
    document.getElementById('metricHumidityDesc').textContent = humDesc;

    // 3. 风向风力
    const windSpeedKmh = Math.round(current.wind_speed_10m || 0);
    const windScale = getBeaufortScale(windSpeedKmh);
    const windDir = getWindDirectionDesc(current.wind_direction_10m);
    document.getElementById('metricWindSpeed').textContent = windSpeedKmh;
    document.getElementById('metricWindDir').textContent = `${windDir} · ${windScale.level}级 (${windScale.text})`;

    // 4. 紫外线指数
    const uvMax = daily.uv_index_max ? daily.uv_index_max[0] : null;
    const uvInfo = getUvInfo(uvMax);
    document.getElementById('metricUV').textContent = uvMax !== null ? uvMax.toFixed(1) : '--';
    document.getElementById('metricUVDesc').textContent = `${uvInfo.level} · ${uvInfo.desc}`;

    // 5. 空气质量
    const aqi = state.airQualityData?.current?.us_aqi;
    const pm25 = state.airQualityData?.current?.pm2_5;
    const pm10 = state.airQualityData?.current?.pm10;
    const aqiInfo = getAqiInfo(aqi);
    document.getElementById('metricAQI').textContent = aqi !== undefined ? `${aqi} ${aqiInfo.level}` : '良';
    document.getElementById('metricAQIDesc').textContent = pm25 ? `PM2.5: ${Math.round(pm25)} · PM10: ${Math.round(pm10 || 0)}` : aqiInfo.desc;

    // 6. 降水
    const precip = current.precipitation !== undefined ? current.precipitation : 0;
    const rainProb = daily.precipitation_probability_max ? daily.precipitation_probability_max[0] : 0;
    document.getElementById('metricPrecip').textContent = precip.toFixed(1);
    document.getElementById('metricPrecipDesc').textContent = `降水概率: ${rainProb}%`;

    // 7. 气压
    const press = current.surface_pressure ? Math.round(current.surface_pressure) : 1013;
    document.getElementById('metricPressure').textContent = press;
    let pressDesc = '标准气压';
    if (press < 1005) pressDesc = '低气压 (注意天气变化)';
    else if (press > 1020) pressDesc = '高气压 (天气晴朗稳定)';
    document.getElementById('metricPressureDesc').textContent = pressDesc;

    // 8. 日出日落
    const sunriseIso = daily.sunrise ? daily.sunrise[0] : null;
    const sunsetIso = daily.sunset ? daily.sunset[0] : null;
    if (sunriseIso && sunsetIso) {
      const riseDate = new Date(sunriseIso);
      const setDate = new Date(sunsetIso);
      document.getElementById('metricSunrise').textContent = `${String(riseDate.getHours()).padStart(2, '0')}:${String(riseDate.getMinutes()).padStart(2, '0')}`;
      document.getElementById('metricSunset').textContent = `${String(setDate.getHours()).padStart(2, '0')}:${String(setDate.getMinutes()).padStart(2, '0')}`;
    } else {
      document.getElementById('metricSunrise').textContent = '06:15';
      document.getElementById('metricSunset').textContent = '18:10';
    }
  }

  // ----------------------------------------------------
  // 生活气象指数渲染
  // ----------------------------------------------------
  function renderLifeIndex(current, daily) {
    const container = document.getElementById('lifeIndexGrid');
    if (!container) return;

    const indices = generateLifeIndex(current, daily);
    let html = '';

    indices.forEach((item) => {
      html += `
        <div class="life-card">
          <div class="life-card-icon">${item.icon}</div>
          <div class="life-card-content">
            <div class="life-card-top">
              <span class="life-card-title">${item.title}</span>
              <span class="life-card-level">${item.level}</span>
            </div>
            <div class="life-card-advice">${item.advice}</div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  // ----------------------------------------------------
  // 单位切换 (摄氏度 / 华氏度)
  // ----------------------------------------------------
  function toggleUnit() {
    state.unit = state.unit === 'celsius' ? 'fahrenheit' : 'celsius';
    localStorage.setItem('local_weather_unit', state.unit);
    const unitText = document.getElementById('unitText');
    if (unitText) unitText.textContent = state.unit === 'celsius' ? '°C' : '°F';
    renderAll();
    showToast(`已切换温度单位为 ${state.unit === 'celsius' ? '摄氏度 (°C)' : '华氏度 (°F)'}`);
  }

  // ----------------------------------------------------
  // 事件绑定与初始化
  // ----------------------------------------------------
  function initEvents() {
    // 1. 定位按钮
    const locateBtn = document.getElementById('locateMeBtn');
    if (locateBtn) locateBtn.addEventListener('click', () => detectLocation());

    const quickLocate = document.getElementById('quickLocateChip');
    if (quickLocate) quickLocate.addEventListener('click', () => detectLocation());

    // 2. 刷新按钮
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        if (state.currentLocation) {
          fetchWeather(state.currentLocation.lat, state.currentLocation.lon, state.currentLocation);
        } else {
          detectLocation();
        }
      });
    }

    // 3. 温度单位切换
    const unitBtn = document.getElementById('unitToggleBtn');
    if (unitBtn) {
      unitBtn.addEventListener('click', toggleUnit);
      const unitText = document.getElementById('unitText');
      if (unitText) unitText.textContent = state.unit === 'celsius' ? '°C' : '°F';
    }

    // 4. 收藏按钮
    const favBtn = document.getElementById('favoriteBtn');
    if (favBtn) favBtn.addEventListener('click', toggleFavorite);

    // 5. 热门城市快捷按钮
    document.querySelectorAll('.hot-cities-group .city-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cityName = btn.getAttribute('data-city');
        if (cityName) {
          performCityQuickSelect(cityName);
        }
      });
    });

    // 6. 品牌标题点击回顶部或刷新
    const brand = document.querySelector('.brand');
    if (brand) {
      brand.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }

  async function performCityQuickSelect(cityName) {
    setLoading(true, `正在查询「${cityName}」...`);
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=zh&format=json`;
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.results && data.results.length > 0) {
        const item = data.results[0];
        await fetchWeather(item.latitude, item.longitude, {
          name: item.name,
          region: [item.admin1, item.country].filter(Boolean).join(' · '),
          country: item.country || '',
          lat: item.latitude,
          lon: item.longitude
        });
      } else {
        showToast(`未找到「${cityName}」的气象信息`);
      }
    } catch (e) {
      showToast('查询失败，请检查网络');
    } finally {
      setLoading(false);
    }
  }

  // ----------------------------------------------------
  // 入口函数
  // ----------------------------------------------------
  async function init() {
    initEvents();
    renderFavorites();

    // 检查是否有上次查看的城市记录
    const lastCityStr = localStorage.getItem('local_weather_last_city');
    if (lastCityStr) {
      try {
        const lastCity = JSON.parse(lastCityStr);
        if (lastCity && lastCity.lat && lastCity.lon) {
          await fetchWeather(lastCity.lat, lastCity.lon, lastCity);
          return;
        }
      } catch (e) {
        // 解析失败，忽略
      }
    }

    // 否则自动触发定位
    await detectLocation();
  }

  // 页面就绪启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
