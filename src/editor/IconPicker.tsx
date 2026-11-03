import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { MENU_ICON_LABELS, MENU_ICON_MAP } from '../registry/menuIcons';
import { MENU_ICONS } from '../schema/types';
import type { MenuIconKey } from '../schema/types';

interface IconPickerProps {
  value?: MenuIconKey;
  onChange: (icon: MenuIconKey) => void;
}

const isIconKey = (key: string): key is MenuIconKey =>
  (MENU_ICONS as readonly string[]).includes(key);

/** 图标是 Schema 里的字符串 key，这里只负责「选 key」，不产生任何非序列化数据 */
const IconPicker = ({ value, onChange }: IconPickerProps) => {
  const items: MenuProps['items'] = MENU_ICONS.map((key) => ({
    key,
    icon: MENU_ICON_MAP[key],
    label: MENU_ICON_LABELS[key],
  }));

  return (
    <Dropdown
      trigger={['click']}
      menu={{
        items,
        selectable: true,
        selectedKeys: value ? [value] : [],
        onClick: ({ key }) => {
          if (isIconKey(key)) onChange(key);
        },
      }}
    >
      <button
        type="button"
        className="icon-picker"
        onClick={(event) => event.stopPropagation()}
      >
        {MENU_ICON_MAP[value ?? 'file']}
      </button>
    </Dropdown>
  );
};

export default IconPicker;
