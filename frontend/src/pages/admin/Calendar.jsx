import React, { useEffect, useState } from "react";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import ConfirmationDialog from '../../components/ConfirmationDialog';
import { api } from '../../utils/api';
import BackButton from '../../components/BackButton';

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

function formatMonth(monthKey) {
  const d = new Date(monthKey + '-01');
  return d.toLocaleString('en-IN', { month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

function Calendar() {
  const [availableDates, setAvailableDates] = useState([]); // Dates for selector
  const [months, setMonths] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null); // Data for selected date
  const [dayCache, setDayCache] = useState({}); // Cache for daily summaries
  const [monthsCache, setMonthsCache] = useState(null); // Cache for monthly summary
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dayLoading, setDayLoading] = useState(false);
  const [dayError, setDayError] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch available dates and monthly summary on mount
  useEffect(() => {
    async function fetchInitial() {
      setLoading(true);
      setError(null);
      try {
        // Check cache first
        if (monthsCache && availableDates.length > 0) {
          setMonths(monthsCache);
          setSelectedDate(availableDates[0]);
          setLoading(false);
          return;
        }
        // Fetch available sales dates
        const data = await api.get('/orders/sales-summary/dates');
        setAvailableDates(data || []);
        if (data && data.length > 0) {
          setSelectedDate(data[0]); // Default to most recent date
        }
        // Fetch monthly summary
        const monthly = await api.get('/orders/monthly-summary');
        setMonths(monthly || []);
        setMonthsCache(monthly || []);
      } catch (err) {
        setError('Failed to fetch sales data.');
      } finally {
        setLoading(false);
      }
    }
    fetchInitial();
  }, []);

  // Fetch sales summary for selected date
  useEffect(() => {
    if (!selectedDate) return;
    async function fetchDay() {
      setDayLoading(true);
      setDayError(null);
      try {
        // Always send date in YYYY-MM-DD format
        const dateObj = new Date(selectedDate);
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const formattedDate = `${yyyy}-${mm}-${dd}`;
        // Check cache first
        if (dayCache[formattedDate]) {
          setSelectedDay(dayCache[formattedDate]);
          setDayLoading(false);
          return;
        }
        const day = await api.get(`/orders/sales-summary?date=${formattedDate}`);
        setSelectedDay(day || null);
        setDayCache(prev => ({ ...prev, [formattedDate]: day || null }));
      } catch (err) {
        setDayError('Failed to fetch sales for selected date.');
        setSelectedDay(null);
      } finally {
        setDayLoading(false);
      }
    }
    fetchDay();
  }, [selectedDate]);

  // Handler for deleting all sales and orders
  const [notification, setNotification] = useState(null);
  async function handleDeleteAll() {
    setShowDeleteDialog(false);
    try {
      await api.delete('/orders/all'); // You need to implement this backend route
      // Clear caches and refetch everything after delete
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;
      setSelectedDate(todayStr);
      setSelectedDay(null);
      setMonths([]);
      setAvailableDates([]);
      setDayCache({});
      setMonthsCache(null);
      setLoading(true);
      // Optionally show a success message
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      setNotification({ message: 'Failed to delete all sales and orders.', type: 'error' });
    }
  }

  return (
    <>
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          duration={2000}
          onClose={() => setNotification(null)}
        />
      )}
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-orange-50 flex flex-col items-center px-2 pt-8 sm:px-0">
        <BackButton />
        <div className="w-full max-w-lg mx-auto mt-2">
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8 mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-blue-700 mb-2 text-center">Sales Calendar</h1>
            <p className="text-gray-600 text-base sm:text-lg mb-4 text-center">View daily sales totals and top-selling items.</p>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="flex justify-center items-center">
                  <DotLottieReact
                    src="https://lottie.host/9a942832-f4ef-42c2-be65-d6955d96c3e1/wuEXuiDlyw.lottie"
                    loop
                    autoplay
                    style={{ width: 220, height: 220 }}
                  />
                </div>
                <span className="text-gray-500 mt-2">Loading sales data...</span>
              </div>
            ) : error ? (
              <div className="text-red-500 text-center py-8">{error}</div>
            ) : (
              <>
                {/* Date selector */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {/* Previous date button */}
          <button
            type="button"
            className="rounded-full bg-orange-100 hover:bg-orange-300 text-orange-700 px-3 py-2 shadow transition disabled:opacity-50"
            disabled={!selectedDate || availableDates.indexOf(selectedDate) === availableDates.length - 1}
            onClick={() => {
              const idx = availableDates.indexOf(selectedDate);
              if (idx < availableDates.length - 1) setSelectedDate(availableDates[idx + 1]);
            }}
            aria-label="Previous date"
          >
            &#60;
          </button>
          <input
            type="date"
            className="border rounded-lg px-6 py-2 text-base focus:outline-none focus:ring-2 focus:ring-orange-300 bg-orange-50 text-center appearance-none"
            value={selectedDate || ''}
            min={availableDates.length > 0 ? availableDates[availableDates.length - 1] : ''}
            max={availableDates.length > 0 ? availableDates[0] : ''}
            onChange={e => setSelectedDate(e.target.value)}
            pattern="\d{4}-\d{2}-\d{2}"
            inputMode="numeric"
            style={{ fontSize: '1.1rem', minWidth: '160px', maxWidth: '220px', paddingLeft: '18px', paddingRight: '18px' }}
          />
          {/* Next date button */}
          <button
            type="button"
            className="rounded-full bg-orange-100 hover:bg-orange-300 text-orange-700 px-3 py-2 shadow transition disabled:opacity-50"
            disabled={!selectedDate || availableDates.indexOf(selectedDate) === 0}
            onClick={() => {
              const idx = availableDates.indexOf(selectedDate);
              if (idx > 0) setSelectedDate(availableDates[idx - 1]);
            }}
            aria-label="Next date"
          >
            &#62;
          </button>
        </div>
        {/* Today and Delete buttons */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <button
            type="button"
            className="bg-blue-100 hover:bg-blue-300 text-blue-700 font-semibold px-4 py-2 rounded-lg shadow transition"
            onClick={() => {
              if (availableDates.length > 0) setSelectedDate(availableDates[0]);
            }}
          >
            Today
          </button>
          <button
            type="button"
            className="bg-red-100 hover:bg-red-300 text-red-700 font-semibold px-4 py-2 rounded-lg shadow transition"
            onClick={() => setShowDeleteDialog(true)}
          >
            Delete
          </button>
        </div>
        <ConfirmationDialog
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={handleDeleteAll}
          title="Delete All Sales & Orders?"
          message="Are you sure you want to delete all sales and orders data? This action cannot be undone."
          confirmText="Delete All"
          cancelText="Cancel"
          type="danger"
        />

                {/* Selected day summary */}
                {dayLoading ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-orange-500 mb-4"></div>
                    <span className="text-gray-500">Loading selected day...</span>
                  </div>
                ) : dayError ? (
                  <div className="text-red-500 text-center py-8">{dayError}</div>
                ) : selectedDay ? (
                  <div className="bg-gradient-to-r from-orange-50 to-blue-50 rounded-xl p-4 shadow-md mb-2">
                    <h2 className="text-xl sm:text-xl font-bold text-orange-700 mb-2 text-center break-words whitespace-normal" style={{ fontSize: '1.1rem', wordBreak: 'break-word' }}>{formatDate(selectedDay.date)}</h2>
                    <div className="flex flex-row justify-center items-center gap-6 mb-4 flex-wrap">
                      <div className="flex flex-col items-center min-w-[120px]">
                        <span className="text-2xl sm:text-3xl font-bold text-green-700">₹{selectedDay.totalAmount?.toLocaleString('en-IN') ?? 0}</span>
                        <span className="text-sm text-gray-500">Total Sales</span>
                      </div>
                      <div className="flex flex-col items-center min-w-[100px]">
                        <span className="text-2xl sm:text-3xl font-bold text-blue-700">{selectedDay.totalOrders ?? 0}</span>
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
                              <span className="text-green-700 font-semibold text-base ml-2">₹{item.total?.toLocaleString('en-IN') ?? 0}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-gray-400 text-center py-4">No items sold on this day.</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gradient-to-r from-orange-50 to-blue-50 rounded-xl p-4 shadow-md mb-2">
                    <h2 className="text-xl sm:text-xl font-bold text-orange-700 mb-2 text-center break-words whitespace-normal" style={{ fontSize: '1.1rem', wordBreak: 'break-word' }}>{selectedDate ? formatDate(selectedDate) : formatDate(new Date())}</h2>
                    <div className="flex flex-row justify-center items-center gap-6 mb-4 flex-wrap">
                      <div className="flex flex-col items-center min-w-[120px]">
                        <span className="text-2xl sm:text-3xl font-bold text-green-700">₹0</span>
                        <span className="text-sm text-gray-500">Total Sales</span>
                      </div>
                      <div className="flex flex-col items-center min-w-[100px]">
                        <span className="text-2xl sm:text-3xl font-bold text-blue-700">0</span>
                        <span className="text-sm text-gray-500">Orders</span>
                      </div>
                    </div>
                    <div className="mt-2">
                      <h3 className="text-lg font-semibold text-orange-600 mb-2 text-center">Top-Selling Items</h3>
                      <div className="text-gray-400 text-center py-4">No items sold on this day.</div>
                    </div>
                  </div>
                )}
              </>
            )}
            {/* Monthly sales summary cards in a separate container */}
          </div>
          {months.length > 0 && (
            <div className="w-full max-w-lg mx-auto bg-white rounded-xl shadow-lg p-4 sm:p-8 mt-6 mb-8">
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
    </>
  );
}

export default Calendar;
