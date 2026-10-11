"use client"

import Link from "next/link";
import React, { useState } from "react";
import { motion } from "framer-motion";

export interface StackingNavbarItemData {
  href: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  active?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
  badge?: React.ReactNode;
}

export interface StackingNavbarProps {
  items?: StackingNavbarItemData[];
  className?: string;
  itemClassName?: string;
  activeItemClassName?: string;
  initialExpanded?: boolean;
  controlledExpanded?: boolean;
  onExpandChange?: (expanded: boolean) => void;
  gap?: number;
}

const defaultItems: StackingNavbarItemData[] = [
  { href: "#", label: "Projects" },
  { href: "#", label: "Components" },
  { href: "#", label: "Information" },
];

const StackingNavbar: React.FC<StackingNavbarProps> = ({
  items = defaultItems,
  className = "",
  itemClassName = "",
  activeItemClassName = "",
  initialExpanded = false,
  controlledExpanded,
  onExpandChange,
  gap = 8,
}) => {
  const [internalExpanded, setInternalExpanded] = useState(initialExpanded);
  const isControlled = controlledExpanded !== undefined;
  const expanded = isControlled ? controlledExpanded : internalExpanded;

  const handleMouseEnter = () => {
    if (!isControlled) setInternalExpanded(true);
    onExpandChange?.(true);
  };

  const handleMouseLeave = () => {
    if (!isControlled) setInternalExpanded(false);
    onExpandChange?.(false);
  };

  return (
    <div
      className={`flex items-center ${className}`}
      style={{ gap: `${gap}px` }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {items.map((item, index) => (
        <StackingNavbarItem
          href={item.href}
          expanded={expanded}
          key={index}
          index={index}
          active={item.active}
          onClick={item.onClick}
          style={item.style}
          className={itemClassName}
          activeClassName={activeItemClassName}
          icon={item.icon}
          badge={item.badge}
        >
          {item.label}
        </StackingNavbarItem>
      ))}
    </div>
  );
};

export interface StackingNavbarItemProps {
  href: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  expanded: boolean;
  index: number;
  active?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  activeClassName?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

const StackingNavbarItem: React.FC<StackingNavbarItemProps> = ({
  href,
  children,
  style,
  expanded,
  index,
  active = false,
  onClick,
  className = "",
  activeClassName = "",
  icon,
  badge,
}) => {
  const baseClassName =
    className ||
    "flex items-center text-sm px-5 py-3 rounded-3xl bg-[#b0aaaa1a] no-underline text-black backdrop-blur-lg hover:bg-black hover:text-white transition-colors duration-300 ease-in-out";

  const effectiveClassName = active && activeClassName
    ? `${baseClassName} ${activeClassName}`
    : baseClassName;

  return (
    <motion.div
      initial={{ x: -100 * index }}
      animate={{ x: expanded ? 0 : -100 * index }}
      transition={{
        duration: 0.6,
        ease: "circInOut",
        delay: 0.1 * index,
        type: "spring",
      }}
      style={{ zIndex: 100 - index }}
    >
      <Link
        className={effectiveClassName}
        href={href}
        style={style}
        onClick={onClick}
      >
        {icon && <span style={{ marginRight: '0.45rem', display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
        <span>{children}</span>
        {badge && <span style={{ marginLeft: '0.45rem' }}>{badge}</span>}
      </Link>
    </motion.div>
  );
};

export { StackingNavbar, StackingNavbarItem };
