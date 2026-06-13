import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useEffect, useRef, useState } from 'react'
import BrandLogo from '../../components/BrandLogo'
import '../../css/admin.css'

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  const [highlightStyle, setHighlightStyle] = useState({})
  const navRef = useRef(null)
  const prevIndexRef = useRef(0)

  const getPathIndex = (pathname) => {
    if (pathname.includes('/admin/analytics')) return 0
    if (pathname.includes('/admin/staff')) return 1
    if (pathname.includes('/admin/reports')) return 2
    return 0
  }

  const handleTransitionNavigate = (e, to) => {
    if (document.startViewTransition) {
      e.preventDefault()
      
      // Calculate sliding direction before state update
      const currentIndex = getPathIndex(to)
      const prevIndex = getPathIndex(location.pathname)
      if (currentIndex > prevIndex) {
        document.documentElement.classList.remove('slide-backward')
        document.documentElement.classList.add('slide-forward')
      } else if (currentIndex < prevIndex) {
        document.documentElement.classList.remove('slide-forward')
        document.documentElement.classList.add('slide-backward')
      }
      prevIndexRef.current = currentIndex

      document.startViewTransition(() => {
        navigate(to)
      })
    }
  }

  useEffect(() => {
    const updateHighlight = () => {
      if (!navRef.current) return
      const activeLink = navRef.current.querySelector('.dock-nav-item.active')
      if (activeLink) {
        setHighlightStyle({
          left: `${activeLink.offsetLeft}px`,
          width: `${activeLink.offsetWidth}px`,
          opacity: 1
        })
      }
    }
    
    // Sync direction class if navigation happened via back/forward browser buttons
    const currentIndex = getPathIndex(location.pathname)
    const prevIndex = prevIndexRef.current
    if (currentIndex > prevIndex) {
      document.documentElement.classList.remove('slide-backward')
      document.documentElement.classList.add('slide-forward')
    } else if (currentIndex < prevIndex) {
      document.documentElement.classList.remove('slide-forward')
      document.documentElement.classList.add('slide-backward')
    }
    prevIndexRef.current = currentIndex

    // Delay slightly to ensure DOM is fully rendered/painted
    setTimeout(updateHighlight, 50)
    window.addEventListener('resize', updateHighlight)
    return () => {
      window.removeEventListener('resize', updateHighlight)
    }
  }, [location.pathname])

  useEffect(() => {
    return () => {
      document.documentElement.classList.remove('slide-forward', 'slide-backward')
    }
  }, [])

  return (
    <div className="admin-page">
      <header className="admin-header">
        <BrandLogo subtitle="Admin" />
        <div className="header-right">
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/')}>← Reception</button>
          <span className="header-user">👤 {user?.name}</span>
          <button className="btn btn-danger btn-sm" onClick={logout}>Logout</button>
        </div>
      </header>

      <div className="admin-layout">
        <main className="admin-content">
          <div key={location.pathname} className="page-transition-enter admin-page-wrapper">
            <Outlet />
          </div>
        </main>

        {/* Glass Dock Navigation */}
        <nav className="glass-dock-wrapper">
          <div className="glass-layer-blur" />
          <div className="glass-layer-bg" />
          <div className="glass-layer-shadow" />
          
          <div className="glass-content" ref={navRef}>
            <div className="dock-highlight" style={highlightStyle} />
            <NavLink 
              to="/admin/analytics" 
              className={({ isActive }) => `dock-nav-item ${isActive ? 'active' : ''}`}
              onClick={(e) => handleTransitionNavigate(e, '/admin/analytics')}
            >
              📈 Analytics
            </NavLink>
            <NavLink 
              to="/admin/staff" 
              className={({ isActive }) => `dock-nav-item ${isActive ? 'active' : ''}`}
              onClick={(e) => handleTransitionNavigate(e, '/admin/staff')}
            >
              👥 Staff & Doctors
            </NavLink>
            <NavLink 
              to="/admin/reports" 
              className={({ isActive }) => `dock-nav-item ${isActive ? 'active' : ''}`}
              onClick={(e) => handleTransitionNavigate(e, '/admin/reports')}
            >
              📊 Reports
            </NavLink>
          </div>
        </nav>
      </div>

      {/* SVG Filter for Glass Distortion */}
      <svg style={{ display: "none" }}>
        <filter
          id="glass-distortion"
          x="0%"
          y="0%"
          width="100%"
          height="100%"
          filterUnits="objectBoundingBox"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.001 0.005"
            numOctaves="1"
            seed="17"
            result="turbulence"
          />
          <feComponentTransfer in="turbulence" result="mapped">
            <feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5" />
            <feFuncG type="gamma" amplitude="0" exponent="1" offset="0" />
            <feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5" />
          </feComponentTransfer>
          <feGaussianBlur in="turbulence" stdDeviation="3" result="softMap" />
          <feSpecularLighting
            in="softMap"
            surfaceScale="5"
            specularConstant="1"
            specularExponent="100"
            lightingColor="white"
            result="specLight"
          >
            <fePointLight x="-200" y="-200" z="300" />
          </feSpecularLighting>
          <feComposite
            in="specLight"
            operator="arithmetic"
            k1="0"
            k2="1"
            k3="1"
            k4="0"
            result="litImage"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="softMap"
            scale="200"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>
    </div>
  )
}
