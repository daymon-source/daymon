// 원소(속성) 타입 — 몬스터 부화 후 형태
// 알 타입은 constants/eggs.js에서 관리. 각 알의 element가 여기 MONSTER_IMAGES_BY_ELEMENT와 연결됨.
// 새 속성(물, 땅 등) 추가 시: 여기 이미지 추가 + eggs.js의 해당 알 타입 element와 맞추면 됨

import monsterFireImg from '../assets/monster-fire.png'

export const DEFAULT_ELEMENT = 'fire'

/** 속성별 부화 몬스터 이미지. 없는 속성은 불로 대체 */
export const MONSTER_IMAGES_BY_ELEMENT = {
  fire: monsterFireImg,
  // water: monsterWaterImg,  // 추가 시 assets에 이미지 넣고 import
  // earth: monsterEarthImg,
}

/** 속성 표시 이름 */
export const ELEMENT_LABELS = {
  fire: '불',
  water: '물',
  earth: '땅',
}

export function getMonsterImage(element) {
  const key = element && MONSTER_IMAGES_BY_ELEMENT[element] ? element : DEFAULT_ELEMENT
  return MONSTER_IMAGES_BY_ELEMENT[key] || MONSTER_IMAGES_BY_ELEMENT[DEFAULT_ELEMENT]
}
