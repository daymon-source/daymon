/**
 * 알 타입 통합 설정 — 7속성 알
 * 
 * images, CSS 클래스 등 프론트 전용 설정은 여기에 유지.
 * hatchHours, crackAtHours 등 게임 밸런스 수치는 DB(egg_types 테이블)에서 가져옴.
 * DB 로드 전/실패 시 여기의 기본값이 폴백으로 사용됨.
 */

import eggFireImg from '../assets/egg-fire.png'
import eggFireCrackedImg from '../assets/egg-fire-cracked.png'
import eggWaterImg from '../assets/egg-water.png'
import eggWaterCrackedImg from '../assets/egg-water-cracked.png'
import eggWoodImg from '../assets/egg-wood.png'
import eggWoodCrackedImg from '../assets/egg-wood-cracked.png'
import eggMetalImg from '../assets/egg-metal.png'
import eggMetalCrackedImg from '../assets/egg-metal-cracked.png'
import eggEarthImg from '../assets/egg-earth.png'
import eggEarthCrackedImg from '../assets/egg-earth-cracked.png'
import eggLightImg from '../assets/egg-light.png'
import eggLightCrackedImg from '../assets/egg-light-cracked.png'
import eggDarkImg from '../assets/egg-dark.png'

/** 알 타입 ID 목록 */
export const EGG_TYPES = ['fire', 'water', 'wood', 'metal', 'earth', 'light', 'dark']

/** 기본 밸런스 수치 (DB 로드 전/실패 시 폴백) */
const DEFAULT_HATCH_HOURS = 24
const DEFAULT_CRACK_AT_HOURS = 19

/** 알 타입별 설정 (프론트 전용 + 밸런스 기본값) */
export const EGG_CONFIG = {
  fire: {
    element: 'fire',
    label: '불',
    hatchHours: DEFAULT_HATCH_HOURS,
    crackAtHours: DEFAULT_CRACK_AT_HOURS,
    images: {
      default: eggFireImg,
      cracked: eggFireCrackedImg,
      ready: eggFireImg,
    },
    centerWidthScale: 1,
    centerReadyWidthScale: 1,
    slotClass: '',
    centerEgg1Class: '',
    centerReadyClass: '',
  },
  water: {
    element: 'water',
    label: '물',
    hatchHours: DEFAULT_HATCH_HOURS,
    crackAtHours: DEFAULT_CRACK_AT_HOURS,
    images: {
      default: eggWaterImg,
      cracked: eggWaterCrackedImg,
      ready: eggWaterImg,
    },
    centerWidthScale: 1,
    centerReadyWidthScale: 1,
    slotClass: '',
    centerEgg1Class: '',
    centerReadyClass: '',
  },
  wood: {
    element: 'wood',
    label: '나무',
    hatchHours: DEFAULT_HATCH_HOURS,
    crackAtHours: DEFAULT_CRACK_AT_HOURS,
    images: {
      default: eggWoodImg,
      cracked: eggWoodCrackedImg,
      ready: eggWoodImg,
    },
    centerWidthScale: 1,
    centerReadyWidthScale: 1,
    slotClass: '',
    centerEgg1Class: '',
    centerReadyClass: '',
  },
  metal: {
    element: 'metal',
    label: '금속',
    hatchHours: DEFAULT_HATCH_HOURS,
    crackAtHours: DEFAULT_CRACK_AT_HOURS,
    images: {
      default: eggMetalImg,
      cracked: eggMetalCrackedImg,
      ready: eggMetalImg,
    },
    centerWidthScale: 1,
    centerReadyWidthScale: 1,
    slotClass: '',
    centerEgg1Class: '',
    centerReadyClass: '',
  },
  earth: {
    element: 'earth',
    label: '땅',
    hatchHours: DEFAULT_HATCH_HOURS,
    crackAtHours: DEFAULT_CRACK_AT_HOURS,
    images: {
      default: eggEarthImg,
      cracked: eggEarthCrackedImg,
      ready: eggEarthImg,
    },
    centerWidthScale: 1,
    centerReadyWidthScale: 1,
    slotClass: '',
    centerEgg1Class: '',
    centerReadyClass: '',
  },
  light: {
    element: 'light',
    label: '빛',
    hatchHours: DEFAULT_HATCH_HOURS,
    crackAtHours: DEFAULT_CRACK_AT_HOURS,
    images: {
      default: eggLightImg,
      cracked: eggLightCrackedImg,
      ready: eggLightImg,
    },
    centerWidthScale: 1,
    centerReadyWidthScale: 1,
    slotClass: '',
    centerEgg1Class: '',
    centerReadyClass: '',
  },
  dark: {
    element: 'dark',
    label: '어둠',
    hatchHours: DEFAULT_HATCH_HOURS,
    crackAtHours: DEFAULT_CRACK_AT_HOURS,
    images: {
      default: eggDarkImg,
      ready: eggDarkImg,
    },
    centerWidthScale: 1,
    centerReadyWidthScale: 1,
    slotClass: '',
    centerEgg1Class: '',
    centerReadyClass: '',
  },
}

/**
 * DB에서 가져온 egg_types 데이터를 로컬 EGG_CONFIG에 병합.
 * 밸런스 수치(hatchHours, crackAtHours)만 덮어씀.
 * @param {Array} dbEggTypes - Supabase egg_types 테이블 rows
 */
export function applyDbEggTypes(dbEggTypes) {
  if (!Array.isArray(dbEggTypes)) return
  for (const row of dbEggTypes) {
    const config = EGG_CONFIG[row.element]
    if (!config) continue
    if (row.hatch_hours != null) config.hatchHours = row.hatch_hours
    if (row.crack_at_hours != null) config.crackAtHours = row.crack_at_hours
  }
  console.log('🥚 DB egg_types 적용 완료:', dbEggTypes.map(r => `${r.element}: ${r.hatch_hours}h/${r.crack_at_hours}h`).join(', '))
}

/** 슬롯/목록용 1단계 알 이미지 */
export function getEggImage(eggType) {
  const c = EGG_CONFIG[eggType]
  return c ? c.images.default : EGG_CONFIG.fire.images.default
}

/** 가운데 2단계(ready) 알 이미지 */
export function getEggReadyImage(eggType) {
  const c = EGG_CONFIG[eggType]
  return c ? c.images.ready : EGG_CONFIG.fire.images.ready
}

/** 알 타입 → 부화 몬스터 속성 (element) */
export function getElementByEggType(eggType) {
  const c = EGG_CONFIG[eggType]
  return c ? c.element : 'fire'
}

/** 속성(element) → 알 타입 */
export function getEggTypeByElement(element) {
  const entry = Object.entries(EGG_CONFIG).find(([, config]) => config.element === element)
  return entry ? entry[0] : 'fire'
}

/** 알 타입별 설정 가져오기 */
export function getEggConfig(eggType) {
  return EGG_CONFIG[eggType] || EGG_CONFIG.fire
}

/** 프리로드용: 모든 알 이미지 URL 배열 반환 */
export function getAllEggImages() {
  const urls = []
  Object.values(EGG_CONFIG).forEach(config => {
    if (config.images.default) urls.push(config.images.default)
    if (config.images.cracked) urls.push(config.images.cracked)
    if (config.images.ready) urls.push(config.images.ready)
  })
  return [...new Set(urls)] // 중복 제거
}
