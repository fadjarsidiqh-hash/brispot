import { ImageResponse } from 'next/og'
import { type NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size: sizeParam } = await params
  const size = parseInt(sizeParam, 10) || 192
  const fontSize = Math.round(size * 0.28)
  const dotSize = Math.round(size * 0.1)

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          background: '#002470',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: size * 0.18,
        }}
      >
        {/* Gold accent bar */}
        <div
          style={{
            position: 'absolute',
            top: size * 0.12,
            left: size * 0.2,
            right: size * 0.2,
            height: dotSize,
            background: '#f0b429',
            borderRadius: dotSize,
          }}
        />
        {/* BRIMOS text */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            fontFamily: 'sans-serif',
            fontWeight: 900,
            letterSpacing: size * 0.02,
          }}
        >
          <span style={{ color: '#ffffff', fontSize }}>BRI</span>
          <span style={{ color: '#f0b429', fontSize }}>MOS</span>
        </div>
        {/* Subtitle */}
        <div
          style={{
            color: 'rgba(255,255,255,0.45)',
            fontSize: Math.round(size * 0.07),
            marginTop: size * 0.04,
            fontFamily: 'sans-serif',
            letterSpacing: size * 0.01,
          }}
        >
          BRI
        </div>
        {/* Bottom gold bar */}
        <div
          style={{
            position: 'absolute',
            bottom: size * 0.12,
            left: size * 0.2,
            right: size * 0.2,
            height: dotSize,
            background: '#f0b429',
            borderRadius: dotSize,
          }}
        />
      </div>
    ),
    { width: size, height: size }
  )
}
