import React, { useState } from 'react';

export const Avatar = ({ 
  src, 
  alt, 
  name,
  size = 'md',
  status,
  statusPosition = 'bottom-right',
  border = false,
  borderColor = 'primary',
  animation,
  onClick,
  className = ''
}) => {
  const [imageError, setImageError] = useState(false);
  
  // Get initials from name
  const getInitials = (name) => {
    if (!name) return '?';
    
    const names = name.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };
  
  // Size variants
  const sizeClasses = {
    'xs': 'w-6 h-6 text-xs',
    'sm': 'w-8 h-8 text-sm',
    'md': 'w-10 h-10 text-md',
    'lg': 'w-16 h-16 text-lg',
    'xl': 'w-24 h-24 text-xl',
    '2xl': 'w-32 h-32 text-2xl'
  };
  
  // Border variants
  const borderVariants = {
    'primary': 'border-primary-500',
    'secondary': 'border-secondary-500',
    'accent': 'border-accent-500',
    'white': 'border-white',
    'gray': 'border-neutral-300'
  };
  
  // Animation variants
  const animationVariants = {
    'pulse': 'animate-pulse',
    'bounce': 'animate-bounce',
    'spin': 'animate-spin',
    'ping': 'animate-ping'
  };
  
  // Status colors
  const statusColors = {
    'online': 'bg-green-500',
    'offline': 'bg-neutral-400',
    'busy': 'bg-red-500',
    'away': 'bg-yellow-500'
  };
  
  // Status position
  const statusPositionClasses = {
    'top-right': 'top-0 right-0',
    'top-left': 'top-0 left-0',
    'bottom-right': 'bottom-0 right-0',
    'bottom-left': 'bottom-0 left-0'
  };
  
  // Generate fallback URL for ui-avatars service
  const getFallbackAvatarUrl = () => {
    const bgColor = Math.random().toString(16).slice(2, 8);
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || alt || '?')}&background=${bgColor}&color=fff&size=256`;
  };
  
  // Handle image load error
  const handleError = () => {
    console.warn('Avatar image failed to load:', src);
    setImageError(true);
  };
  
  return (
    <div 
      className={`relative flex-shrink-0 ${sizeClasses[size]} ${animation ? animationVariants[animation] : ''} ${className}`}
      onClick={onClick}
    >
      <div className={`
        rounded-full overflow-hidden
        ${border ? `border-2 ${borderVariants[borderColor]}` : ''}
        ${onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}
        h-full w-full
      `}>
        {!src || imageError ? (
          <div className="w-full h-full flex items-center justify-center bg-primary-100 text-primary-700 font-semibold">
            {getInitials(name || alt)}
          </div>
        ) : (
          <img 
            src={src} 
            alt={alt || name || 'Avatar'}
            className="w-full h-full object-cover"
            onError={handleError}
            loading="lazy"
          />
        )}
      </div>
      
      {/* Status indicator */}
      {status && (
        <span className={`
          absolute block rounded-full ring-2 ring-white
          ${statusColors[status]}
          ${statusPositionClasses[statusPosition]}
          ${size === 'xs' ? 'w-1.5 h-1.5' : 
            size === 'sm' ? 'w-2 h-2' : 
            size === 'md' ? 'w-2.5 h-2.5' : 
            size === 'lg' ? 'w-3.5 h-3.5' : 
            size === 'xl' ? 'w-4 h-4' : 'w-5 h-5'}
        `}></span>
      )}
    </div>
  );
};

export const AvatarGroup = ({ 
  avatars, 
  limit = 3, 
  size = 'md',
  overlap = true,
  border = true,
  borderColor = 'white'
}) => {
  // Calculate offset based on size
  const offsetMap = {
    'xs': overlap ? '-mr-1' : 'mr-1',
    'sm': overlap ? '-mr-2' : 'mr-1.5',
    'md': overlap ? '-mr-3' : 'mr-2',
    'lg': overlap ? '-mr-4' : 'mr-3',
    'xl': overlap ? '-mr-6' : 'mr-4',
    '2xl': overlap ? '-mr-8' : 'mr-5',
  };
  
  // Visible avatars
  const visibleAvatars = avatars.slice(0, limit);
  const remainingCount = avatars.length - limit;
  
  return (
    <div className="flex items-center">
      {visibleAvatars.map((avatar, index) => (
        <div key={index} className={offsetMap[size]}>
          <Avatar 
            src={avatar.src} 
            alt={avatar.alt || avatar.name} 
            name={avatar.name}
            size={size}
            status={avatar.status}
            border={border}
            borderColor={borderColor}
          />
        </div>
      ))}
      
      {remainingCount > 0 && (
        <div className={offsetMap[size]}>
          <div className={`
            flex items-center justify-center rounded-full bg-neutral-200 text-neutral-600 font-medium
            ${border ? `border-2 ${borderColor === 'white' ? 'border-white' : `border-${borderColor}-500`}` : ''}
            ${size === 'xs' ? 'w-6 h-6 text-xs' : 
              size === 'sm' ? 'w-8 h-8 text-xs' : 
              size === 'md' ? 'w-10 h-10 text-sm' : 
              size === 'lg' ? 'w-16 h-16 text-base' : 
              size === 'xl' ? 'w-24 h-24 text-lg' : 'w-32 h-32 text-xl'}
          `}>
            +{remainingCount}
          </div>
        </div>
      )}
    </div>
  );
}; 