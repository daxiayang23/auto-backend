import type { MouseEvent, ReactNode } from 'react';
import type { ElementRef } from '../store/projectStore';
import { useProjectStore } from '../store/projectStore';

interface EditableBoxProps {
  /** 元素在 Schema 中的定位，点击即选中它 */
  target: ElementRef;
  /** 悬浮角标文字，例如「菜单项」「页面」 */
  label: string;
  className?: string;
  /** 额外的高亮条件，例如当前所在页面 */
  selected?: boolean;
  /** hover / 选中时右上角出现的快捷操作 */
  actions?: ReactNode;
  onClick?: () => void;
  onDoubleClick?: () => void;
  children: ReactNode;
}

/**
 * 编辑态的统一包装器：任何元素套一层它就具备「可编辑」的视觉与选中能力。
 * 预览态它是透明的——直接把 children 渲染出来，不留任何编辑痕迹。
 * 后面表格列、卡片、筛选项接入编辑时都复用这个壳，不必各写一套选中逻辑。
 */
const EditableBox = ({
  target,
  label,
  className,
  selected,
  actions,
  onClick,
  onDoubleClick,
  children,
}: EditableBoxProps) => {
  const deskMode = useProjectStore((state) => state.deskMode);
  const selectedElement = useProjectStore((state) => state.selectedElement);
  const selectElement = useProjectStore((state) => state.selectElement);

  if (deskMode !== 'edit') {
    return <div className={className}>{children}</div>;
  }

  const isSelected =
    selected === true ||
    (selectedElement?.kind === target.kind &&
      selectedElement.key === target.key);

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    selectElement(target);
    onClick?.();
  };

  return (
    <div
      className={[
        'editable-box',
        isSelected ? 'is-selected' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={handleClick}
      onDoubleClick={onDoubleClick}
    >
      <span className="editable-tag">{label}</span>
      {actions ? <div className="editable-actions">{actions}</div> : null}
      {children}
    </div>
  );
};

export default EditableBox;
