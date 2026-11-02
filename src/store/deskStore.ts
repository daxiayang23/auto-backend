import { create } from 'zustand';
import { createElement } from 'react';
import { DashboardOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import type { ItemType } from 'antd/es/menu/interface';

export type DeskMode = 'edit' | 'preview';

interface DeskStore {
  deskMode: DeskMode;
  setDeskMode: (mode: DeskMode) => void;
  previewMenuItems: MenuProps['items'];
  setPreviewMenuItemLabel: (key: string, label: string) => void;
}

const updateMenuItemLabel = (
  items: MenuProps['items'],
  key: string,
  label: string,
): ItemType[] =>
  (items ?? []).map((item): ItemType => {
    if (!item) return item;
    if ('type' in item && item.type === 'divider') return item;
    if ('children' in item && item.children) {
      return {
        ...item,
        children: updateMenuItemLabel(item.children, key, label),
      };
    }
    return item.key === key ? { ...item, label } : item;
  });

export const useDeskStore = create<DeskStore>((set) => ({
  deskMode: 'edit',
  setDeskMode: (deskMode) => set({ deskMode }),
  previewMenuItems: [
    {
      type: 'group',
      children: [
        {
          key: 'dashboard',
          icon: createElement(DashboardOutlined),
          label: '仪表板',
        },
      ],
    },
  ],
  setPreviewMenuItemLabel: (key, label) =>
    set((state) => ({
      previewMenuItems: updateMenuItemLabel(state.previewMenuItems, key, label),
    })),
}));
