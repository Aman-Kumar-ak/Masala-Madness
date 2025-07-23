

import React, { useEffect, useState } from "react";
import { api } from '../../utils/api';

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

function formatMonth(monthKey) {
  const d = new Date(monthKey + '-01');
  return d.toLocaleString('en-IN', { month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

export default function Calendar() {
  const [salesData, setSalesData] = useState([]);
  const [months, setMonths] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchSales() {
      setLoading(true);
      setError(null);
      try {
        // Fetch daily sales summary
        const data = await api.get('/orders/sales-summary');
        setSalesData(data || []);
        if (data && data.length > 0) {
          setSelectedDate(data[0].date); // Default to most recent date
        }
        // Fetch monthly summary
        const monthly = await api.get('/orders/monthly-summary');
        setMonths(monthly || []);
      } catch (err) {
        setError('Failed to fetch sales data.');
      } finally {
        setLoading(false);
      }
    }
    fetchSales();
  }, []);

  const selectedDay = salesData.find(d => d.date === selectedDate);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-orange-50 flex flex-col items-center px-2 py-4 sm:px-0">
      <div className="w-full max-w-lg mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8 mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-blue-700 mb-2 text-center">Sales Calendar</h1>
          <p className="text-gray-600 text-base sm:text-lg mb-4 text-center">View daily sales totals and top-selling items.</p>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-orange-500 mb-4"></div>
              <span className="text-gray-500">Loading sales data...</span>
            </div>
          ) : error ? (
            <div className="text-red-500 text-center py-8">{error}</div>
          ) : (
            <>
              {/* Date selector */}
              <div className="flex flex-wrap gap-2 justify-center mb-4">
                {salesData.map(day => (
                  <button
                    key={day.date}
                    onClick={() => setSelectedDate(day.date)}
                    className={`px-3 py-1 rounded-full font-medium text-sm transition-colors duration-200 border-2 focus:outline-none focus:ring-2 focus:ring-orange-300
                      ${selectedDate === day.date ? 'bg-orange-500 text-white border-orange-500' : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-orange-100 hover:border-orange-300'}`}
                  >
                    {formatDate(day.date)}
                  </button>
                ))}
              </div>

              {/* Selected day summary */}
              {selectedDay ? (
                <div className="bg-gradient-to-r from-orange-50 to-blue-50 rounded-xl p-4 shadow-md mb-2">
                  <h2 className="text-xl font-bold text-orange-700 mb-2 text-center">{formatDate(selectedDay.date)}</h2>
                  <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-4">
                    <div className="flex flex-col items-center">
                      <span className="text-2xl sm:text-3xl font-bold text-green-700">₹{selectedDay.totalAmount.toLocaleString('en-IN')}</span>
                      <span className="text-sm text-gray-500">Total Sales</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-2xl sm:text-3xl font-bold text-blue-700">{selectedDay.totalOrders}</span>
                      <span className="text-sm text-gray-500">Orders</span>
                    </div>
                  </div>
                  <div className="mt-2">
                    <h3 className="text-lg font-semibold text-orange-600 mb-2 text-center">Top-Selling Items</h3>
                    {selectedDay.topItems && selectedDay.topItems.length > 0 ? (
                      <ul className="divide-y divide-orange-100">
                        {selectedDay.topItems.map((item, idx) => (
                          <li key={item.name} className="py-2 flex items-center justify-between">
                            <span className="font-medium text-gray-800 flex-1 truncate">
                              {idx + 1}. {item.name}
                            </span>
                            <span className="text-orange-600 font-bold text-base">{item.quantity} sold - </span>
                            <span className="text-green-700 font-semibold text-base ml-2">₹{item.total.toLocaleString('en-IN')}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-gray-400 text-center py-4">No items sold on this day.</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-gray-400 text-center py-8">No data for selected date.</div>
              )}
            </>
          )}
          {/* Monthly sales summary cards in a separate container */}
        </div>
        {months.length > 0 && (
          <div className="w-full max-w-lg mx-auto bg-white rounded-xl shadow-lg p-4 sm:p-8 mt-6">
            <h3 className="text-lg font-semibold text-blue-700 mb-4 text-center">Monthly Sales</h3>
            <div className="flex flex-col gap-3">
              {months.map(month => (
                <div
                  key={month.month}
                  className="flex flex-row items-center justify-between bg-blue-50 hover:bg-blue-100 transition rounded-lg px-5 py-4 border border-blue-100 shadow-sm w-full"
                >
                  <span className="text-base font-bold text-blue-700">{formatMonth(month.month)}</span>
                  <span className="text-green-700 font-semibold text-lg">₹{month.totalAmount.toLocaleString('en-IN')}</span>
                  <span className="text-xs text-gray-500">{month.totalOrders} orders</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
