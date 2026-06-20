import Link from 'next/link';

export default function Page() {
  return (
    <div>
      <p>page</p>
      
      {}
      <Link 
        href="/login" 
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
      <Link 
        href="/signup" 
        style={{ 
          padding: '8px 16px', 
          backgroundColor: '#000', 
          color: '#fff', 
          borderRadius: '4px',
          textDecoration: 'none'
        }}
      >
        Signup
      </Link>
      <Link 
        href="/member" 
        style={{ 
          padding: '8px 16px', 
          backgroundColor: '#000', 
          color: '#fff', 
          borderRadius: '4px',
          textDecoration: 'none'
        }}
      >
        member
      </Link>
    </div>
  );
}