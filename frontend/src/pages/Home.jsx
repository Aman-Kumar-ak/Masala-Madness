import React from "react";
import Menu from "../components/Menu";

export default function Home() {
  return (
    <div className="min-h-screen bg-orange-100">
      <div className="bg-white shadow-md">
        <div className="container mx-auto">
          <h1 className="text-2xl text-center font-bold py-4">Masala Madness</h1>
        </div>
      </div>
      <Menu />
    </div>
  );
}
