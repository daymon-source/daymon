/**
 * 알 타입 통합 설정 — 7속성 알
 */

import eggFireImg from '../assets/egg-fire.png'
import eggWaterImg from '../assets/egg-water.png'
import eggWoodImg from '../assets/egg-wood.png'
import eggMetalImg from '../assets/egg-metal.png'
import eggEarthImg from '../assets/egg-earth.png'
import eggLightImg from '../assets/egg-light.png'
import eggDarkImg from '../assets/egg-dark.png'

/** 알 타입 ID 목록 */
export const EGG_TYPES = ['fire', 'water', 'wood', 'metal', 'earth', 'light', 'dark']

/** 알 타입별 설정 */
export const EGG_CONFIG = {
  fire: {
    element: 'fire',
    label: '불',
    images: {
      default: eggFireImg,
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
    images: {
      default: eggWaterImg,
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
    images: {
      default: eggWoodImg,
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
    images: {
      default: eggMetalImg,
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
    images: {
      default: eggEarthImg,
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
    images: {
      default: eggLightImg,
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
