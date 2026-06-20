
import Link from 'next/link';

export default function login() {
  return (
    <div className="font-Arial bg-[#0a0d36] flex justify-center items-center h-screen m-0">
      <div className="bg-[#05081C] p-8 rounded shadow-md w-full max-w-sm">
        <h2 className="text-2xl font-bold flex justify-center items-center">Login</h2>
        <form>

          <div className="username mt-3">
            <label className="block text-gray-700 text-sm font-bold">
              Username
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="username"
              type="text"
              placeholder="Username"
            />
          </div>

          
          <div className="password mt-3">
            <label className="block text-gray-700 text-sm font-bold">
              Password
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="password"
              type="password"
              placeholder="Password"
            />
          </div>
          

          <div className="flex items-center justify-between mt-4">
            
              <Link href ="/main" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              type="button">
              Sign In
            </Link>
            <Link href="/signup" className="inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800">
              Don't have an account? Sign Up
            </Link>
          </div>
        </form>
      </div>
    </div> 
  )
}
