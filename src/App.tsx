import { useEffect } from "react";
import "./App.css";

function App() {
  // Redirect to news page on component mount
  useEffect(() => {
    window.location.href = '/news.html';
  }, []);

  return (
    <main className="w-full">
      <header className="bg-white border-b border-gray-200 py-8">
        <h1 className="text-4xl font-bold text-center text-gray-800">News Portal</h1>
        <nav className="max-w-md mx-auto mt-6 flex justify-center">
          <a href="/news.html" className="flex items-center px-5 py-2 text-sm font-medium text-gray-700 hover:text-blue-600">
            Create Articles
          </a>
          <a href="/articles.html" className="flex items-center px-5 py-2 text-sm font-medium text-gray-700 hover:text-blue-600">
            View Articles
          </a>
        </nav>
      </header>
      
      <div className="flex justify-center items-center h-[70vh]">
        <div className="flex items-center gap-3">
          <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">Redirecting to News Portal...</p>
        </div>
      </div>
    </main>
  );
}

export default App;
