// App.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Cart from "./pages/Cart";
import Admin from "./pages/Admin";
import Orders from "./pages/Orders";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/orders" element={<Orders />} />
    </Routes>
  );
}
