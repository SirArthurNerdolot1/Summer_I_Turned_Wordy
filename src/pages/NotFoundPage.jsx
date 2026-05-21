import React from "react";
import { useNavigate } from "react-router-dom";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="font-serif text-4xl mb-2">404</h1>
        <h2 className="font-serif text-2xl mb-4 text-zinc-700">Page not found</h2>
        <p className="text-zinc-600 mb-6">
          The page you're looking for doesn't exist.
        </p>
        <button
          onClick={() => navigate("/")}
          className="inline-block px-6 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition"
        >
          Go Home
        </button>
      </div>
    </div>
  );
}
