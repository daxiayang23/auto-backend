import type { DbTable } from '../../schema/types';

/** ER 画布上卡片的几何常量，连线与卡片共用，保证对得齐 */
export const CARD_WIDTH = 224;
export const CARD_HEADER_HEIGHT = 42;
export const CARD_ROW_HEIGHT = 26;
export const CARD_FOOTER_HEIGHT = 8;

export const cardHeight = (table: DbTable): number =>
  CARD_HEADER_HEIGHT +
  table.columns.length * CARD_ROW_HEIGHT +
  CARD_FOOTER_HEIGHT;

/** 卡片中心点，连线从中心画、压在卡片下层，露出部分就是连线 */
export const cardCenter = (table: DbTable): { x: number; y: number } => ({
  x: table.x + CARD_WIDTH / 2,
  y: table.y + cardHeight(table) / 2,
});
