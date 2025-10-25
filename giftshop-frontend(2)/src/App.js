import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [products, setProducts] = useState([]);
  const [newProduct, setNewProduct] = useState({ name: "", price: "", stock: "" });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await axios.get("http://localhost:8082/products");
      setProducts(res.data);
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:8082/products", newProduct);
      setNewProduct({ name: "", price: "", stock: "" });
      fetchProducts();
    } catch (err) {
      console.error("Error adding product:", err);
    }
  };

  const handleDeleteProduct = async (id) => {
    try {
      await axios.delete(`http://localhost:8082/products/${id}`);
      fetchProducts();
    } catch (err) {
      console.error("Error deleting product:", err);
    }
  };

  const handleUpdateStock = async (id, stock) => {
    try {
      await axios.put(`http://localhost:8082/products/${id}/stock`, { stock });
      fetchProducts();
    } catch (err) {
      console.error("Error updating stock:", err);
    }
  };

  // 📊 summary values
  const totalProducts = products.length;
  const lowStockCount = products.filter((p) => p.stock < 10).length;
  const avgPrice =
    products.length > 0
      ? (products.reduce((sum, p) => sum + p.price, 0) / products.length).toFixed(2)
      : 0;

  return (
    <div className="App">
      <h1>Gift Shop Manager</h1>

      {/* 📊 Dashboard Summary */}
      <div className="dashboard">
        <div className="card">
          <h3>Total Products</h3>
          <p>{totalProducts}</p>
        </div>
        <div className="card">
          <h3>Low Stock (&lt; 10)</h3>
          <p>{lowStockCount}</p>
        </div>
        <div className="card">
          <h3>Average Price</h3>
          <p>${avgPrice}</p>
        </div>
      </div>

      {/* 🔎 Legend */}
      <div className="legend">Rows in light red are <strong>Low Stock (&lt; 10)</strong>.</div>

      {/* ➕ Add New Product Form */}
      <form onSubmit={handleAddProduct}>
        <input
          type="text"
          placeholder="Name"
          value={newProduct.name}
          onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
          required
        />
        <input
          type="number"
          placeholder="Price"
          value={newProduct.price}
          onChange={(e) =>
            setNewProduct({ ...newProduct, price: parseFloat(e.target.value) || 0 })
          }
          required
        />
        <input
          type="number"
          placeholder="Stock"
          value={newProduct.stock}
          onChange={(e) =>
            setNewProduct({ ...newProduct, stock: parseInt(e.target.value || "0", 10) })
          }
          required
        />
        <button type="submit">Add Product</button>
      </form>

      {/* 📋 Products Table */}
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Price ($)</th>
            <th>Stock</th>
            <th>Update Stock</th>
            <th>Delete</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className={p.stock < 10 ? "row-low" : ""}>
              <td>{p.id}</td>
              <td>{p.name}</td>
              <td>{p.price}</td>
              <td>
                <span className={`badge ${p.stock < 10 ? "badge-low" : "badge-ok"}`}>
                  {p.stock}
                </span>
              </td>
              <td>
                <button onClick={() => handleUpdateStock(p.id, p.stock + 1)}>+1</button>
                <button onClick={() => p.stock > 0 && handleUpdateStock(p.id, p.stock - 1)}>
                  -1
                </button>
              </td>
              <td>
                <button onClick={() => handleDeleteProduct(p.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;
