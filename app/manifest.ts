import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Smart Hall Pass',
    short_name: 'Hall Pass',
    description: 'Classroom check-in / hall pass tracker',
    start_url: '/',
    display: 'standalone',
    background_color: '#4c1d95',
    theme_color: '#5b21b6',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
