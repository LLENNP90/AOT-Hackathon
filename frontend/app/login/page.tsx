
import Link from 'next/link';

export default function login() {
  return (
    <div>login
        <Link 
        href="/" 
        style={{ 
          padding: '8px 16px', 
          backgroundColor: '#000', 
          color: '#fff', 
          borderRadius: '4px',
          textDecoration: 'none'
        }}
      >
        Login
      </Link>
    </div>
  )
}
