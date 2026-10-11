import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

const QUOTES = [
  '"Not all those who wander are lost — but this URL certainly is."',
  '"This page has been withdrawn pending peer review."',
  '"404: it exists only in a preprint nobody can access."',
  '"Somewhere, a librarian is quietly reshelving this page."',
]

const NAV_LINKS = [
  { label: 'Current Issue', to: '/current-issue' },
  { label: 'For Authors', to: '/guidelines' },
  { label: 'Editorial Board', to: '/board' },
  { label: 'Contact', to: '/contact' },
]

export default function NotFound() {
  const canvasRef = useRef(null)
  const sealRef = useRef(null)
  const clockRef = useRef(null)
  const lostRef = useRef(null)
  const fromRef = useRef(null)
  const quoteRef = useRef(null)
  const tiltRef = useRef(null)

  /* ── Gold dust canvas ── */
  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return

    let W, H, P = [], raf

    const size = () => {
      const d = Math.min(devicePixelRatio || 1, 2)
      W = innerWidth; H = innerHeight
      cv.width = W * d; cv.height = H * d
      ctx.setTransform(d, 0, 0, d, 0, 0)
    }
    const init = () => {
      P = Array.from({ length: 60 }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        r: 0.7 + Math.random() * 1.6,
        vy: 0.12 + Math.random() * 0.35,
        ph: Math.random() * Math.PI * 2, sp: 0.3 + Math.random() * 0.7,
        tw: Math.random() * Math.PI * 2, a: 0.12 + Math.random() * 0.4,
      }))
    }
    const loop = () => {
      ctx.clearRect(0, 0, W, H)
      for (const p of P) {
        p.y -= p.vy; p.ph += 0.007; p.tw += 0.028
        p.x += Math.sin(p.ph) * p.sp * 0.35
        if (p.y < -6) { p.y = H + 6; p.x = Math.random() * W }
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(210,164,62,${(p.a * (0.6 + 0.4 * Math.sin(p.tw))).toFixed(3)})`
        ctx.fill()
      }
      raf = requestAnimationFrame(loop)
    }
    size(); init(); loop()
    const onResize = () => { size(); init() }
    addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(raf)
      removeEventListener('resize', onResize)
    }
  }, [])

  /* ── Parallax tilt ── */
  useEffect(() => {
    const tilt = tiltRef.current
    if (!tilt) return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced || !matchMedia('(pointer:fine)').matches) return
    let raf = null
    const onMove = (e) => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        const x = e.clientX / innerWidth - 0.5
        const y = e.clientY / innerHeight - 0.5
        tilt.style.transform = `rotateX(${(-y * 4).toFixed(2)}deg) rotateY(${(x * 5).toFixed(2)}deg)`
        raf = null
      })
    }
    const onLeave = () => { tilt.style.transform = '' }
    addEventListener('mousemove', onMove)
    document.addEventListener('mouseleave', onLeave)
    return () => {
      removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  /* ── Seal fast-spin on click ── */
  const handleSealClick = () => {
    const seal = sealRef.current
    if (!seal) return
    const rotor = seal.querySelector('.nf-rotor')
    const ring2 = seal.querySelector('.nf-ring2')
    if (rotor) rotor.style.animationDuration = '2.6s'
    if (ring2) ring2.style.animationDuration = '4s'
    setTimeout(() => {
      if (rotor) rotor.style.animationDuration = '26s'
      if (ring2) ring2.style.animationDuration = '44s'
    }, 2400)
  }

  /* ── Clock + astray timer ── */
  useEffect(() => {
    const t0 = Date.now()
    const tick = () => {
      if (clockRef.current)
        clockRef.current.textContent = new Date().toLocaleTimeString([], { hour12: false })
      if (lostRef.current) {
        const s = Math.floor((Date.now() - t0) / 1000)
        lostRef.current.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  /* ── Referrer ── */
  useEffect(() => {
    try {
      const h = new URL(document.referrer).hostname
      if (h && fromRef.current) fromRef.current.textContent = `You drifted in from ${h}`
    } catch (_) {}
  }, [])

  /* ── Quote rotator ── */
  useEffect(() => {
    const el = quoteRef.current
    if (!el || QUOTES.length <= 1) return
    let qi = 0
    const id = setInterval(() => {
      el.style.opacity = '0'
      setTimeout(() => {
        qi = (qi + 1) % QUOTES.length
        el.textContent = QUOTES[qi]
        el.style.opacity = '1'
      }, 420)
    }, 6000)
    return () => clearInterval(id)
  }, [])

  return (
    <>
      <style>{`
        .nf-body {
          font-family: 'Inter', system-ui, sans-serif;
          color: #f6f3ec;
          background:
            radial-gradient(1100px 620px at 50% -12%, #17355f 0%, transparent 62%),
            linear-gradient(165deg, #0d2247 0%, #081226 55%, #060d1c 100%);
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
          position: relative;
        }
        .nf-body::before {
          content: ""; position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(210,164,62,.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(210,164,62,.05) 1px, transparent 1px);
          background-size: 56px 56px;
          -webkit-mask-image: radial-gradient(circle at 50% 32%, #000 0%, transparent 72%);
                  mask-image: radial-gradient(circle at 50% 32%, #000 0%, transparent 72%);
        }
        .nf-body::after {
          content: ""; position: fixed; inset: 0; z-index: 2; pointer-events: none;
          background: radial-gradient(ellipse at center, transparent 52%, rgba(3,7,15,.5) 100%);
        }
        .nf-frame {
          position: fixed; inset: 14px;
          border: 1px solid rgba(210,164,62,.28);
          z-index: 3; pointer-events: none;
        }
        .nf-frame::after {
          content: ""; position: absolute; inset: 5px;
          border: 1px solid rgba(210,164,62,.12);
        }
        @media (max-width: 640px) { .nf-frame { inset: 9px; } }
        #nf-dust { position: fixed; inset: 0; z-index: 1; pointer-events: none; }
        .nf-stage {
          flex: 1; display: grid; place-items: center;
          padding: 72px 24px 48px;
          position: relative; z-index: 5; perspective: 1100px;
        }
        .nf-content {
          text-align: center; max-width: 880px; width: 100%;
          transform-style: preserve-3d; will-change: transform;
        }
        .nf-badge {
          display: inline-flex; align-items: center; gap: 9px;
          font-size: 10.5px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase;
          color: #e3c883; border: 1px solid rgba(210,164,62,.4);
          background: rgba(210,164,62,.07); padding: 8px 18px; border-radius: 999px;
        }
        .nf-dot {
          width: 6px; height: 6px; border-radius: 50%; background: #d2a43e;
          animation: nf-blink 2.4s infinite;
        }
        @keyframes nf-blink { 50% { opacity: .25; } }
        .nf-code {
          position: relative; display: flex; align-items: center; justify-content: center;
          gap: .05em; margin: 26px auto 6px;
          font-family: 'Playfair Display', 'Cormorant Garamond', Georgia, serif;
          font-weight: 700; line-height: 1; letter-spacing: -.02em;
          font-size: clamp(96px, 23vw, 188px);
          filter: drop-shadow(0 16px 44px rgba(210,164,62,.16));
          transform-style: preserve-3d;
        }
        .nf-digit {
          display: inline-block;
          background: linear-gradient(180deg, #fdfbf5 22%, #c4cfe3 92%);
          -webkit-background-clip: text; background-clip: text; color: transparent;
          transition: transform .35s cubic-bezier(.2,.9,.3,1.4);
          transform: translateZ(18px);
        }
        .nf-digit:hover { transform: translateZ(18px) translateY(-7px); }
        .nf-seal {
          width: .8em; height: .8em; cursor: pointer;
          transform: translateZ(46px); flex-shrink: 0;
        }
        .nf-seal svg { width: 100%; height: 100%; display: block; overflow: visible; }
        .nf-rotor, .nf-ring2 { transform-box: fill-box; transform-origin: center; }
        .nf-rotor { animation: nf-spin 26s linear infinite; }
        .nf-ring2 { animation: nf-spinRev 44s linear infinite; }
        @keyframes nf-spin { to { transform: rotate(360deg); } }
        @keyframes nf-spinRev { to { transform: rotate(-360deg); } }
        .nf-ring-text {
          fill: #e3c883;
          font-family: 'Inter', system-ui, sans-serif;
          font-weight: 600; font-size: 11px; letter-spacing: 4.5px;
        }
        .nf-stamp {
          position: absolute; top: -34px; right: -14px; z-index: 6;
          font-weight: 800; font-size: 14px; letter-spacing: 4px; line-height: 1.35;
          text-transform: uppercase; color: rgba(228,182,92,.95);
          border: 3px double rgba(228,182,92,.9); border-radius: 6px;
          padding: 9px 15px; transform: rotate(-13deg);
          opacity: 0; animation: nf-slam .55s cubic-bezier(.2,1.5,.4,1) 1.35s forwards;
          pointer-events: none;
        }
        @keyframes nf-slam {
          0%   { opacity: 0; transform: rotate(-13deg) scale(2.7); }
          62%  { opacity: 1; transform: rotate(-13deg) scale(.93); }
          82%  { transform: rotate(-13deg) scale(1.05); }
          100% { opacity: .95; transform: rotate(-13deg) scale(1); }
        }
        .nf-h1 {
          font-family: 'Playfair Display', 'Cormorant Garamond', Georgia, serif; font-weight: 600;
          font-size: clamp(30px, 4.6vw, 44px); margin-top: 4px; color: #f6f3ec;
        }
        .nf-lede {
          font-size: 16px; line-height: 1.75; color: #a9b8d4;
          max-width: 540px; margin: 14px auto 0;
        }
        .nf-actions {
          display: flex; gap: 14px; justify-content: center;
          flex-wrap: wrap; margin-top: 28px;
        }
        .nf-btn {
          display: inline-flex; align-items: center; gap: 9px; cursor: pointer;
          font-family: 'Inter', system-ui, sans-serif; font-weight: 700;
          font-size: 11.5px; letter-spacing: 2px; text-transform: uppercase;
          padding: 15px 26px; border-radius: 8px; border: 1px solid transparent;
          text-decoration: none;
          transition: transform .25s, box-shadow .25s, border-color .25s, color .25s;
        }
        .nf-btn-gold {
          background: linear-gradient(135deg, #e0b25a, #c3912c);
          color: #241a08; box-shadow: 0 12px 30px rgba(195,145,44,.3);
        }
        .nf-btn-gold:hover { transform: translateY(-2px); box-shadow: 0 18px 40px rgba(195,145,44,.42); }
        .nf-btn-ghost { border-color: rgba(255,255,255,.28); color: #e9eef7; }
        .nf-btn-ghost:hover { border-color: #d2a43e; color: #e3c883; }
        .nf-try {
          margin-top: 26px; font-size: 11px; letter-spacing: 1.6px;
          text-transform: uppercase; color: #7f93b8;
        }
        .nf-try a { color: #cfd9ea; text-decoration: none; transition: color .2s; }
        .nf-try a:hover { color: #e3c883; }
        .nf-sep { color: #d2a43e; margin: 0 10px; opacity: .7; }
        .nf-status {
          display: flex; flex-wrap: wrap; justify-content: center; align-items: center;
          gap: 8px 14px; margin-top: 36px; padding-top: 18px;
          border-top: 1px solid rgba(255,255,255,.09);
          font-size: 11px; letter-spacing: 1.8px; text-transform: uppercase;
          color: #7f93b8; font-variant-numeric: tabular-nums;
        }
        .nf-sdiv { color: #d2a43e; opacity: .65; }
        .nf-sgold { color: #e3c883; }
        .nf-quote {
          font-family: 'Playfair Display', 'Cormorant Garamond', Georgia, serif;
          font-style: italic; font-weight: 500;
          font-size: 15.5px; color: #cdb87e; margin: 16px auto 0; max-width: 520px;
          min-height: 48px; display: flex; align-items: center; justify-content: center;
          transition: opacity .4s; line-height: 1.6;
        }
        .nf-footer {
          position: relative; z-index: 5; text-align: center;
          padding: 20px 16px 24px;
          font-size: 10.5px; letter-spacing: 1.4px; text-transform: uppercase; color: #67799a;
        }
        .nf-footer b { color: #e3c883; font-weight: 600; }
        @media (max-width: 640px) {
          .nf-stamp { font-size: 10px; letter-spacing: 3px; padding: 7px 11px; top: -30px; right: -4px; }
          .nf-status { gap: 6px 10px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .nf-rotor, .nf-ring2, .nf-dot { animation: none !important; }
          .nf-stamp { opacity: .95; animation: none !important; }
          .nf-digit { transition: none !important; }
        }
      `}</style>

      <div className="nf-body">
        <canvas id="nf-dust" ref={canvasRef} aria-hidden="true" />
        <div className="nf-frame" aria-hidden="true" />

        <main className="nf-stage">
          <div className="nf-content" ref={tiltRef}>

            <span className="nf-badge">
              <span className="nf-dot" />
              Error 404 · Record Not Found
            </span>

            <div className="nf-code" role="img" aria-label="Error 404">
              <span className="nf-digit" aria-hidden="true">4</span>

              <span
                className="nf-seal"
                ref={sealRef}
                title="Give it a spin"
                aria-hidden="true"
                onClick={handleSealClick}
              >
                <svg viewBox="0 0 160 160">
                  <defs>
                    <path id="nf-cpath" d="M80,80 m-57,0 a57,57 0 1,1 114,0 a57,57 0 1,1 -114,0" />
                  </defs>
                  <circle className="nf-ring2" cx="80" cy="80" r="75" fill="none"
                    stroke="rgba(210,164,62,.5)" strokeWidth="1" strokeDasharray="3 8" />
                  <g className="nf-rotor">
                    <text className="nf-ring-text">
                      <textPath href="#nf-cpath">PAGE NOT FOUND ✦ ERROR 404 ✦ </textPath>
                    </text>
                  </g>
                  <circle cx="80" cy="80" r="45" fill="none" stroke="rgba(210,164,62,.55)" strokeWidth="1" />
                  <g stroke="#d2a43e" strokeWidth="3" fill="none" strokeLinecap="round">
                    <circle cx="74" cy="74" r="15" />
                    <line x1="85" y1="85" x2="98" y2="98" />
                  </g>
                  <circle cx="71" cy="71" r="3" fill="#d2a43e" opacity=".7" />
                </svg>
              </span>

              <span className="nf-digit" aria-hidden="true">4</span>
              <span className="nf-stamp">Not<br />Found</span>
            </div>

            <h1 className="nf-h1">Lost in the stacks.</h1>
            <p className="nf-lede">
              The page you requested was either moved, renamed, or quietly withdrawn before it survived review.
              The librarian has been notified.
            </p>

            <div className="nf-actions">
              <Link to="/" className="nf-btn nf-btn-gold">Return to the Library →</Link>
              <Link to="/archives" className="nf-btn nf-btn-ghost">Browse Archives</Link>
            </div>

            <p className="nf-try">
              or try{' '}
              {NAV_LINKS.map((l, i) => (
                <span key={l.to}>
                  <Link to={l.to}>{l.label}</Link>
                  {i < NAV_LINKS.length - 1 && <span className="nf-sep">✦</span>}
                </span>
              ))}
            </p>

            <div className="nf-status">
              <span ref={clockRef}>—</span>
              <span className="nf-sdiv">✦</span>
              <span>Astray for <span className="nf-sgold" ref={lostRef}>0:00</span></span>
              <span className="nf-sdiv">✦</span>
              <span ref={fromRef}>You drifted in from the void</span>
            </div>

            <blockquote className="nf-quote" ref={quoteRef}>
              {QUOTES[0]}
            </blockquote>
          </div>
        </main>

        <footer className="nf-footer">
          <b>Asgard International Research Publication</b> · ISSN 2654-6725 · © 2026 · CC BY 4.0
        </footer>
      </div>
    </>
  )
}
