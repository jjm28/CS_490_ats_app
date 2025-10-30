// Icon.tsx - Simple icon component
import "../../styles/StyledComponents/Icon.css";
import React from 'react';
import {
  // Navigation
  Home,
  ArrowLeft,
  Menu,
  X,
  
  // Actions
  Plus,
  Edit,
  Trash2,
  Save,
  Search,
  Settings,
  
  // User
  User,
  LogIn,
  LogOut,
  
  // Status
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  
  type LucideIcon,
} from 'lucide-react';

// All available icons
const ICONS = {
  home: Home,
  back: ArrowLeft,
  menu: Menu,
  close: X,
  add: Plus,
  edit: Edit,
  delete: Trash2,
  save: Save,
  search: Search,
  settings: Settings,
  user: User,
  login: LogIn,
  logout: LogOut,
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  loading: Loader2,
} as const;

export type IconName = keyof typeof ICONS;

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}

/**
 * Simple icon component
 * 
 * @example
 * <Icon name="home" size={24} />
 * <Icon name="search" className="text-gray-500" />
 */
export const Icon: React.FC<IconProps> = ({ 
  name, 
  size = 24, 
  className = '' 
}) => {
  const IconComponent = ICONS[name];
  
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found`);
    return null;
  }
  
  return (
    <IconComponent
      size={size}
      className={className}
      strokeWidth={2}
    />
  );
};

export default Icon;