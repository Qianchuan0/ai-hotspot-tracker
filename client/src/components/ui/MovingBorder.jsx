import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

/**
 * Aceternity UI MovingBorder 组件
 * 在卡片周围创建旋转的渐变边框动画效果
 */
export const MovingBorder = ({
  children,
  duration = 6000,
  className,
  containerClassName,
  as: Component = 'div',
  ...props
}) => {
  return (
    <Component
      className={cn(
        'relative overflow-hidden rounded-xl p-[1px]',
        containerClassName
      )}
      {...props}
    >
      <motion.div
        style={{
          position: 'absolute',
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          background: 'conic-gradient(from 0deg, transparent 0%, #7c3aed 8%, #22d3ee 16%, transparent 24%)',
        }}
        animate={{ rotate: 360 }}
        transition={{
          duration: duration / 1000,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
      <div className={cn('relative rounded-xl', className)}>
        {children}
      </div>
    </Component>
  );
};
