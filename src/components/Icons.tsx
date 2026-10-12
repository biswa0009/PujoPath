import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}

export function SearchIcon({ className = '', size = 18, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, flexShrink: 0, ...style }}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

export function MapPinIcon({ className = '', size = 16, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, flexShrink: 0, ...style }}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
    </svg>
  );
}

export function RouteIcon({ className = '', size = 16, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, flexShrink: 0, ...style }}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  );
}

export function MetroIcon({ className = '', size = 16, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, flexShrink: 0, ...style }}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M4 16c0 1.1.9 2 2 2h1v2a1 1 0 002 0v-2h6v2a1 1 0 002 0v-2h1c1.1 0 2-.9 2-2V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm9 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm-9.5-6V6h10v4H7z" />
    </svg>
  );
}

export function CloseIcon({ className = '', size = 16, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, flexShrink: 0, ...style }}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export function ExternalLinkIcon({ className = '', size = 14, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, flexShrink: 0, ...style }}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

export function VerifiedCheckIcon({ className = '', size = 14, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, flexShrink: 0, ...style }}
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  );
}

export function HeartIcon({
  filled = false,
  className = '',
  size = 14,
  style,
}: {
  filled?: boolean;
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, flexShrink: 0, ...style }}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  );
}

export function ShareIcon({ className = '', size = 14, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, flexShrink: 0, ...style }}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
  );
}

export function SparklesIcon({ className = '', size = 14, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, flexShrink: 0, ...style }}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />
    </svg>
  );
}

export function WalkIcon({ className = '', size = 14, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, flexShrink: 0, ...style }}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="4" r="2" strokeWidth={2} />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 22l2-7 3 3v4M8 13l2-4 3 1 2 4M9 9l3-2 3 2" />
    </svg>
  );
}

export function FilterIcon({ className = '', size = 14, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, flexShrink: 0, ...style }}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  );
}
