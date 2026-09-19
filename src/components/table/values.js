/** 几个跨模块共用的小工具，纯函数，不依赖 Vue。 */

/** '' / null / undefined 都算空值 */
export function isEmptyValue(value) {
  return value === '' || value === null || value === undefined
}

/** 比大小/判等之前统一成字符串，避免 null 与 'null' 之类混在一起 */
export function toComparableString(value) {
  return value === null || value === undefined ? '' : String(value)
}
