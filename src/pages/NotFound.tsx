import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Log the error for debugging
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
      "- Auto-redirecting to main app..."
    );
    
    // Auto-redirect after 2 seconds
    const timer = setTimeout(() => {
      navigate('/');
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [location.pathname, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4 text-gray-800">Redirecting...</h1>
        <p className="text-xl text-gray-600 mb-6">Taking you back to the app</p>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
        <p className="text-sm text-gray-500 mt-6">
          If you're not redirected, <a href="/" className="text-blue-500 hover:text-blue-700 underline">click here</a>
        </p>
      </div>
    </div>
  );
};

export default NotFound;
