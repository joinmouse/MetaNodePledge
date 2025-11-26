import './index.less';

import { HomeOutlined, LoadingOutlined, SettingFilled, SmileOutlined, SyncOutlined } from '@ant-design/icons';
import React, { ReactNode } from 'react';

import classnames from 'classnames';

export interface IButtonProps {
  rightAngleDirection?: 'leftTop' | 'leftBottom' | 'rightTop' | 'rightBottom' | 'null';
  type?: 'paramy' | 'default';
  className?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  loading?: boolean;
  onClick?: () => void;
  children: ReactNode;
}

const Button: React.FC<IButtonProps> = ({
  children,
  disabled = false,
  className = '',
  rightAngleDirection = 'null',
  style,
  type = 'paramy',
  loading,
  onClick = () => {},
  ...props
}) => {
  function handleOnClick() {
    if (!disabled && onClick) {
      onClick();
    }
  }
  return (
    <div
      className={classnames(
        'components_button',
        className,
        { [`rad_${rightAngleDirection}`]: rightAngleDirection },
        { [`type_${type}`]: type },
        { btn_disabled: disabled },
      )}
      style={style}
      onClick={handleOnClick}
      {...props}
    >
      {loading == true ? <LoadingOutlined style={{ marginRight: '7px', color: '#fff' }} id="loading" /> : ''}
      {children}
    </div>
  );
};



export default Button;
