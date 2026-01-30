/**
 * 알 타입 통합 설정 — 새 알 추가 시 이 파일과 assets 이미지, elements(몬스터)만 수정하면 됨
 *
 * - element: 부화 후 몬스터 속성 (constants/elements.js의 MONSTER_IMAGES_BY_ELEMENT와 매칭)
 * - images.default / images.ready: 1단계 / 2단계(19칸~) 알 이미지
 * - centerWidthScale: 가운데 알 1단계 크기 비율 (1 = 100%)
 * - centerReadyWidthScale: 가운데 알 2단계 크기 비율 (없으면 centerWidthScale 사용)
 * - slotClass: 슬롯용 CSS 클래스 (App.css에 .egg-slot-img--{id} 정의)
 * - centerEgg1Class: 가운데 1단계 알용 CSS 클래스 (위치 미세 조정, Monster.css)
 * - centerReadyClass: 가운데 2단계 알용 CSS 클래스 (위치 미세 조정, Monster.css)
 */

import eggClassicImg from '../assets/egg-classic.png'
import eggClassicReadyImg from '../assets/egg-classic-ready.png'
import eggNewImg from '../assets/egg-new.png'
import eggWaterReadyImg from '../assets/egg-water-ready.png'

/** 알 타입 ID 목록 — 초기화/랜덤 등에서 사용 */
export const EGG_TYPES = ['classic', 'glow']

/** 알 타입별 설정. 새 알은 여기에 항목 추가 */
export const EGG_CONFIG = {
  classic: {
    element: 'fire',
    label: '불',
    images: {
      default: eggClassicImg,
      ready: eggClassicReadyImg,
    },
    centerWidthScale: 1,
    centerReadyWidthScale: 0.72,
    slotClass: 'egg-slot-img--classic',
    centerEgg1Class: '',
    centerReadyClass: '',
  },
  glow: {
    element: 'water',
    label: '물',
    images: {
      default: eggNewImg,
      ready: eggWaterReadyImg,
    },
    centerWidthScale: 0.7,
    centerReadyWidthScale: 0.7,
    slotClass: '', // 슬롯용 스타일 필요 시 App.css에 .egg-slot-img--water 추가
    centerEgg1Class: 'monster-img--water-egg1',
    centerReadyClass: 'monster-img--water-ready',
  },
  // 새 알 예: earth: { element: 'earth', label: '땅', images: { default: eggEarthImg, ready: eggEarthReadyImg }, ... }
}

/** 슬롯/목록용 1단계 알 이미지 */
export function getEggImage(eggType) {
  const c = EGG_CONFIG[eggType]
  return c ? c.images.default : EGG_CONFIG.glow.images.default
}

/** 가운데 2단계(ready) 알 이미지 */
export function getEggReadyImage(eggType) {
  const c = EGG_CONFIG[eggType]
  return c ? c.images.ready : EGG_CONFIG.glow.images.ready
}

/** 알 타입 → 부화 몬스터 속성 (element) */
export function getElementByEggType(eggType) {
  const c = EGG_CONFIG[eggType]
  return c ? c.element : 'water'
}

/** 속성(element) → 알 타입. 레거시 데이터 정규화용 */
export function getEggTypeByElement(element) {
  const entry = Object.entries(EGG_CONFIG).find(([, config]) => config.element === element)
  return entry ? entry[0] : 'glow'
}

/** 알 타입별 설정 가져오기 */
export function getEggConfig(eggType) {
  return EGG_CONFIG[eggType] || EGG_CONFIG.glow
}
