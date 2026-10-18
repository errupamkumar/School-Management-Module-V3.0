'use client';
import { useState } from 'react';
import {
  Package, Plus, Search, Filter, AlertTriangle, CheckCircle2,
  TrendingDown, ArrowDownRight, ArrowUpRight, DollarSign,
  Printer, Download, X, Layers, ShoppingBag
} from 'lucide-react';

interface StockItem {
  id: string;
  sku: string;
  name: string;
  category: 'BOOKS' | 'UNIFORM' | 'LAB' | 'IT' | 'SPORTS';
  quantity: number;
  unit: string;
  minThreshold: number;
  unitPrice: number;
  location: string;
  lastRestocked: string;
}

const initialInventory: StockItem[] = [
  { id: '1', sku: 'BK-NCERT-10M', name: 'NCERT Mathematics Class 10 Textbook', category: 'BOOKS', quantity: 180, unit: 'Copies', minThreshold: 30, unitPrice: 195, location: 'Store Room B-1', lastRestocked: '2026-09-01' },
  { id: '2', sku: 'UN-BLZ-32', name: 'Navy Blue Winter Blazer (Size 32)', category: 'UNIFORM', quantity: 14, unit: 'Pieces', minThreshold: 25, unitPrice: 1450, location: 'Uniform Depot A', lastRestocked: '2026-08-20' },
  { id: '3', sku: 'LB-MIC-01', name: 'Compound Optical Microscope 1000x', category: 'LAB', quantity: 24, unit: 'Units', minThreshold: 5, unitPrice: 5800, location: 'Biology Lab 2', lastRestocked: '2026-07-15' },
  { id: '4', sku: 'IT-TNR-88A', name: 'HP LaserJet 88A Black Toner Cartridge', category: 'IT', quantity: 3, unit: 'Units', minThreshold: 6, unitPrice: 2100, location: 'IT Server Room', lastRestocked: '2026-09-10' },
  { id: '5', sku: 'SP-BB-7', name: 'Spalding Size 7 Competition Basketball', category: 'SPORTS', quantity: 32, unit: 'Balls', minThreshold: 10, unitPrice: 1200, location: 'Sports Gymnasium', lastRestocked: '2026-08-10' },
  { id: '6', sku: 'UN-TIE-01', name: 'School Crest Monogram Satin Necktie', category: 'UNIFORM', quantity: 450, unit: 'Pieces', minThreshold: 50, unitPrice: 120, location: 'Uniform Depot B', lastRestocked: '2026-09-05' },
  { id: '7', sku: 'LB-TST-50', name: 'Borosilicate Glass Test Tubes (Pack of 50)', category: 'LAB', quantity: 15, unit: 'Packs', minThreshold: 20, unitPrice: 480, location: 'Chemistry Lab Store', lastRestocked: '2026-08-28' },
];

export default function InventoryPage() {
  const [items, setItems] = useState<StockItem[]>(initialInventory);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedItemForIssue, setSelectedItemForIssue] = useState<StockItem | null>(null);
  const [issueQty, setIssueQty] = useState(1);

  // Form State
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category: 'BOOKS' as StockItem['category'],
    quantity: 10,
    unit: 'Pieces',
    minThreshold: 10,
    unitPrice: 250,
    location: 'Main Store Room',
  });

  const totalValuation = items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  const lowStockCount = items.filter(item => item.quantity <= item.minThreshold).length;

  const filteredItems = items.filter(item => {
    if (selectedCategory !== 'ALL' && item.category !== selectedCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.sku) return;

    const newItem: StockItem = {
      id: String(Date.now()),
      sku: formData.sku,
      name: formData.name,
      category: formData.category,
      quantity: Number(formData.quantity) || 1,
      unit: formData.unit,
      minThreshold: Number(formData.minThreshold) || 5,
      unitPrice: Number(formData.unitPrice) || 0,
      location: formData.location || 'Store Room',
      lastRestocked: new Date().toISOString().split('T')[0],
    };

    setItems([newItem, ...items]);
    setShowAddModal(false);
    setFormData({
      sku: '',
      name: '',
      category: 'BOOKS',
      quantity: 10,
      unit: 'Pieces',
      minThreshold: 10,
      unitPrice: 250,
      location: 'Main Store Room',
    });
  };

  const handleIssueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForIssue) return;

    setItems(items.map(i => {
      if (i.id === selectedItemForIssue.id) {
        return { ...i, quantity: Math.max(0, i.quantity - issueQty) };
      }
      return i;
    }));

    setShowIssueModal(false);
    setSelectedItemForIssue(null);
    setIssueQty(1);
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-purple-200 text-xs font-semibold uppercase tracking-wider mb-2">
              <Package size={16} />
              <span>Asset & Store Ledger • स्टॉक और इन्वेंटरी</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              School Stock & Inventory Register
            </h1>
            <p className="text-purple-100/90 text-sm mt-1 max-w-xl">
              Track textbook stores, student uniforms, laboratory chemicals, computer hardware, and sports assets with automated reorder warnings.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-2xl text-xs sm:text-sm shadow-md transition-all transform hover:-translate-y-0.5"
            >
              <Plus size={16} />
              <span>Add Stock Item</span>
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-3 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-2xl text-xs backdrop-blur-sm border border-white/20 transition-all"
            >
              <Printer size={15} />
              <span className="hidden sm:inline">Print Stock</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-purple-100/80 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Inventory Value</span>
          <p className="text-2xl font-black text-gray-900 mt-2">₹{totalValuation.toLocaleString('en-IN')}</p>
          <p className="text-xs text-purple-600 font-semibold mt-1">Across 5 store departments</p>
        </div>
        <div className="bg-white rounded-3xl p-5 border border-purple-100/80 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">SKUs Registered</span>
          <p className="text-2xl font-black text-emerald-600 mt-2">{items.length} Items</p>
          <p className="text-xs text-gray-400 mt-1">Categorized & barcoded</p>
        </div>
        <div className="bg-white rounded-3xl p-5 border border-purple-100/80 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Low Stock Warnings</span>
          <p className="text-2xl font-black text-rose-600 mt-2">{lowStockCount} Items</p>
          <p className="text-xs text-rose-500 font-semibold mt-1">Below minimum threshold</p>
        </div>
        <div className="bg-white rounded-3xl p-5 border border-purple-100/80 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Audit Health</span>
          <p className="text-2xl font-black text-purple-700 mt-2">Verified</p>
          <p className="text-xs text-gray-400 mt-1">Last audit: Sep 2026</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {['ALL', 'BOOKS', 'UNIFORM', 'LAB', 'IT', 'SPORTS'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat === 'ALL' ? 'All Stock' : cat}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search SKU, name, store..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none transition-all"
          />
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-gray-50/80 text-gray-500 uppercase tracking-wider text-[11px] font-bold border-b border-gray-100">
              <tr>
                <th className="px-5 py-3.5">SKU & Item Details</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Storage Location</th>
                <th className="px-5 py-3.5">Current Stock</th>
                <th className="px-5 py-3.5">Unit Price</th>
                <th className="px-5 py-3.5">Total Valuation</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
              {filteredItems.map((item) => {
                const isLow = item.quantity <= item.minThreshold;
                return (
                  <tr key={item.id} className="hover:bg-purple-50/20 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-gray-900">{item.name}</div>
                      <div className="text-[11px] text-gray-400 font-mono">{item.sku}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 text-xs font-bold">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-600 font-semibold">{item.location}</td>
                    <td className="px-5 py-4">
                      <div className="font-bold text-gray-900">{item.quantity} {item.unit}</div>
                      <div className="text-[10px] text-gray-400">Min safe: {item.minThreshold}</div>
                    </td>
                    <td className="px-5 py-4 font-semibold text-gray-800">
                      ₹{item.unitPrice.toLocaleString('en-IN')}
                    </td>
                    <td className="px-5 py-4 font-black text-gray-900">
                      ₹{(item.quantity * item.unitPrice).toLocaleString('en-IN')}
                    </td>
                    <td className="px-5 py-4 text-center">
                      {isLow ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          <AlertTriangle size={11} /> Low Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 size={11} /> Healthy
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => { setSelectedItemForIssue(item); setShowIssueModal(true); }}
                        className="px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-xl text-xs font-bold transition-all"
                      >
                        Issue / Deduct
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <Package size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Register New Stock SKU</h3>
                  <p className="text-xs text-gray-400">Add an inventory line item to campus stock</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Item Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Class 9 Physics Lab Manual"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">SKU / Item Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BK-PHY-09"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
                  >
                    <option value="BOOKS">Books & Worksheets</option>
                    <option value="UNIFORM">School Uniforms</option>
                    <option value="LAB">Science Lab Supplies</option>
                    <option value="IT">IT Hardware & Toners</option>
                    <option value="SPORTS">Sports Equipment</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Unit</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Unit Cost (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.unitPrice}
                    onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Min Threshold Alert</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.minThreshold}
                    onChange={(e) => setFormData({ ...formData, minThreshold: parseInt(e.target.value) || 5 })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Store / Cupboard Room</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md transition-all"
                >
                  Save Stock Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Issue Modal */}
      {showIssueModal && selectedItemForIssue && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100">
            <h4 className="font-bold text-gray-900 text-base">Issue / Deduct Stock</h4>
            <p className="text-xs text-gray-500 mt-1">Item: <strong>{selectedItemForIssue.name}</strong></p>
            <p className="text-xs text-purple-700 font-bold">Currently in stock: {selectedItemForIssue.quantity} {selectedItemForIssue.unit}</p>

            <form onSubmit={handleIssueSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Quantity to Deduct</label>
                <input
                  type="number"
                  min="1"
                  max={selectedItemForIssue.quantity}
                  value={issueQty}
                  onChange={(e) => setIssueQty(parseInt(e.target.value) || 1)}
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow"
                >
                  Confirm Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
