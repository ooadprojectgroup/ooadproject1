import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import AdminProducts from './pages/AdminProducts';
import AdminCategories from './pages/AdminCategories';
import ProtectedRoute from './components/ProtectedRoute';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/custom.css';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import AdminOrders from './pages/AdminOrders';
import AdminTransactions from './pages/AdminTransactions';
import AdminGiftShopManager from './pages/AdminGiftShopManager';
import AdminUsers from './pages/AdminUsers';
import CashierDashboard from './pages/cashier/CashierDashboard';
import CashierTransactions from './pages/cashier/CashierTransactions';
import Profile from './pages/Profile';
import { ToastProvider } from './contexts/ToastContext';
import AdminSettings from './pages/AdminSettings';

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <ToastProvider>
          <Router>
            <div className="App">
              <Navbar />
              <main style={{ minHeight: '80vh' }}>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Home />} />
                <Route path="/products" element={<Products />} />
                <Route path="/products/:id" element={<ProductDetail />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                
                {/* Protected Customer Routes */}
                <Route path="/cart" element={
                  <ProtectedRoute requiredRole="customer">
                    <Cart />
                  </ProtectedRoute>
                } />
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } />
                <Route path="/checkout" element={
                  <ProtectedRoute>
                    <Checkout />
                  </ProtectedRoute>
                } />
                <Route path="/orders" element={
                  <ProtectedRoute requiredRole="customer">
                    <Orders />
                  </ProtectedRoute>
                } />
                <Route path="/orders/:id" element={
                  <ProtectedRoute requiredRole="customer">
                    <OrderDetail />
                  </ProtectedRoute>
                } />
                
                {/* Cashier Routes */}
                <Route path="/cashier" element={<Navigate to="/cashier/pos" replace />} />
                <Route path="/cashier/pos" element={
                  <ProtectedRoute requiredRole="cashier">
                    <CashierDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/cashier/transactions" element={
                  <ProtectedRoute requiredRole="cashier">
                    <CashierTransactions />
                  </ProtectedRoute>
                } />
                
                {/* Admin Routes */}
                <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="/admin/dashboard" element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/admin/products" element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminProducts />
                  </ProtectedRoute>
                } />
                <Route path="/admin/categories" element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminCategories />
                  </ProtectedRoute>
                } />
                <Route path="/admin/orders" element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminOrders />
                  </ProtectedRoute>
                } />
                <Route path="/admin/transactions" element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminTransactions />
                  </ProtectedRoute>
                } />
                <Route path="/admin/users" element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminUsers />
                  </ProtectedRoute>
                } />
                <Route path="/admin/giftshop" element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminGiftShopManager />
                  </ProtectedRoute>
                } />
                <Route path="/admin/settings" element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminSettings />
                  </ProtectedRoute>
                } />
              </Routes>
              </main>
              <Footer />
            </div>
          </Router>
        </ToastProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;