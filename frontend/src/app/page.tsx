// import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900">Welcome to Calendar App</h1>
          <p className="mt-2 text-gray-600">View and manage your Google Calendar events</p>
        </div>
        <div className="mt-8">
          <a
            href="http://localhost:4000/auth/google"
            className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Sign in with Google
          </a>
        </div>
      </div>
    </div>
  );
}