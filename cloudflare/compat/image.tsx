import type { ImgHTMLAttributes } from 'react';
type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string | { src: string; width?: number; height?: number };
  fill?: boolean; priority?: boolean; quality?: number; unoptimized?: boolean; placeholder?: string; blurDataURL?: string;
};
export default function Image({ src, fill, priority, quality, unoptimized, placeholder, blurDataURL, style, ...props }: Props) {
  return <img {...props} src={typeof src === 'string' ? src : src.src} loading={priority ? 'eager' : props.loading || 'lazy'} style={fill ? { position: 'absolute', height: '100%', width: '100%', inset: 0, ...style } : style} />;
}
