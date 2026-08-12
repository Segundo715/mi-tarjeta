'use client'

// html5-qrcode se importa dinámicamente dentro de useEffect (SSR-unsafe, lanza en Node).
// didScanRef evita el doble disparo de onScan que ocurre en algunos navegadores móviles.
import { useEffect, useRef } from 'react'

interface Props {
  onScan: (value: string) => void
  onCameraError: () => void
}

export function QRScanner({ onScan, onCameraError }: Props) {
  const scannerRef = useRef<{ stop: () => Promise<void>; isScanning: boolean } | null>(null)
  const didScanRef = useRef(false)

  useEffect(() => {
    let mounted = true
    didScanRef.current = false

    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (!mounted) return

      const scanner = new Html5Qrcode('qr-reader')
      scannerRef.current = scanner

      scanner
        .start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (text: string) => {
            if (didScanRef.current) return
            didScanRef.current = true
            scanner
              .stop()
              .catch(() => {})
              .finally(() => onScan(text))
          },
          () => {}
        )
        .catch(() => {
          if (mounted) onCameraError()
        })
    })

    return () => {
      mounted = false
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative w-full">
      <div id="qr-reader" className="w-full rounded-xl overflow-hidden" />
      <p className="text-center text-xs text-zinc-500 mt-2">
        Apunta la cámara al código QR del cliente
      </p>
    </div>
  )
}
