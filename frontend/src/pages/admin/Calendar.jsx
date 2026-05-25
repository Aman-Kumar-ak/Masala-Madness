import React, { useEffect, useState, useCallback, useRef } from "react";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import ConfirmationDialog from '../../components/ConfirmationDialog';
import { api } from '../../utils/api';
import BackButton from '../../components/BackButton';
import { useNotification } from '../../components/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { appendQueryParams, getLocationId, getLocationName } from '../../utils/location';

const CALENDAR_LOCATION_KEY = 'admin-sales-calendar-location';
const ALL_LOCATIONS_VALUE = 'all';

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

function formatMonth(monthKey) {
  const d = new Date(monthKey + '-01');
  return d.toLocaleString('en-IN', { month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

function getTodayStr() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function Calendar() {
  const { showSuccess, showError } = useNotification();
  const { user } = useAuth();
  const currentLocationId = getLocationId(user?.location);
  const [locations, setLocations] = useState([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [selectedLocationId, setSelectedLocationId] = useState(() => localStorage.getItem(CALENDAR_LOCATION_KEY) || currentLocationId || ALL_LOCATIONS_VALUE);
  const [availableDates, setAvailableDates] = useState([]); // Dates for selector
  const [months, setMonths] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null); // Data for selected date
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dayLoading, setDayLoading] = useState(false);
  const [dayError, setDayError] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const calendarCacheRef = useRef({});
  const dayCacheRef = useRef({});
  const activeLocationId = selectedLocationId || currentLocationId || ALL_LOCATIONS_VALUE;
  const selectedLocation = locations.find((location) => getLocationId(location) === activeLocationId) || null;
  const selectedLocationLabel = activeLocationId === ALL_LOCATIONS_VALUE
    ? 'All Branches'
    : getLocationName(selectedLocation, 'Selected branch');

  useEffect(() => {
    localStorage.setItem(CALENDAR_LOCATION_KEY, selectedLocationId);
  }, [selectedLocationId]);

  const loadLocations = useCallback(async () => {
    try {
      setLocationsLoading(true);
      const data = await api.get('/locations?includeInactive=true');
      const nextLocations = Array.isArray(data) ? data : [];
      setLocations(nextLocations);
      setSelectedLocationId((previousLocationId) => {
        if (previousLocationId === ALL_LOCATIONS_VALUE) {
          return ALL_LOCATIONS_VALUE;
        }

        if (previousLocationId && nextLocations.some((location) => getLocationId(location) === previousLocationId)) {
          return previousLocationId;
        }

        if (currentLocationId && nextLocations.some((location) => getLocationId(location) === currentLocationId)) {
          return currentLocationId;
        }

        return ALL_LOCATIONS_VALUE;
      });
    } catch (error) {
      console.error('Error fetching locations:', error);
      setLocations([]);
    } finally {
      setLocationsLoading(false);
    }
  }, [currentLocationId]);

  const loadCalendarData = useCallback(async (locationId = activeLocationId) => {
    const cacheKey = locationId || ALL_LOCATIONS_VALUE;
    const cachedData = calendarCacheRef.current[cacheKey];

    setLoading(true);
    setError(null);
    setDayLoading(true);
    setDayError(null);
    setSelectedDay(null);

    if (cachedData) {
      setAvailableDates(cachedData.availableDates || []);
      setMonths(cachedData.months || []);
      setSelectedDate((currentSelectedDate) => {
        if (!cachedData.availableDates || cachedData.availableDates.length === 0) {
          return getTodayStr();
        }

        if (currentSelectedDate && cachedData.availableDates.includes(currentSelectedDate)) {
          return currentSelectedDate;
        }

        return cachedData.availableDates[0];
      });
      setLoading(false);
      return;
    }

    try {
      const [dates, monthly] = await Promise.all([
        api.get(appendQueryParams('/orders/sales-summary/dates', { locationId: cacheKey })),
        api.get(appendQueryParams('/orders/monthly-summary', { locationId: cacheKey }))
      ]);
      const nextAvailableDates = Array.isArray(dates) ? dates : [];
      const nextMonths = Array.isArray(monthly) ? monthly : [];
      calendarCacheRef.current[cacheKey] = {
        availableDates: nextAvailableDates,
        months: nextMonths
      };
      setAvailableDates(nextAvailableDates);
      setMonths(nextMonths);
      setSelectedDate((currentSelectedDate) => {
        if (nextAvailableDates.length === 0) {
          return getTodayStr();
        }

        if (currentSelectedDate && nextAvailableDates.includes(currentSelectedDate)) {
          return currentSelectedDate;
        }

        return nextAvailableDates[0];
      });
    } catch (error) {
      console.error('Error fetching sales data:', error);
      setError('Failed to fetch sales data.');
    } finally {
      setLoading(false);
    }
  }, [activeLocationId]);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  useEffect(() => {
    loadCalendarData(activeLocationId);
  }, [activeLocationId, loadCalendarData]);

  // Fetch sales summary for selected date
  useEffect(() => {
    if (!selectedDate) return;
    async function fetchDay() {
      setDayLoading(true);
      setDayError(null);
      try {
        const formattedDate = selectedDate;
        const cacheKey = `${activeLocationId}:${formattedDate}`;
        const cachedDay = dayCacheRef.current[cacheKey];
        if (cachedDay) {
          setSelectedDay(cachedDay);
          setDayLoading(false);
          return;
        }
        const day = await api.get(appendQueryParams('/orders/sales-summary', { date: formattedDate, locationId: activeLocationId }));
        setSelectedDay(day || null);
        dayCacheRef.current[cacheKey] = day || null;
      } catch (err) {
        setDayError('Failed to fetch sales for selected date.');
        setSelectedDay(null);
      } finally {
        setDayLoading(false);
      }
    }
    fetchDay();
  }, [selectedDate, activeLocationId]);

  const [deleteLoading, setDeleteLoading] = useState(false);
  async function handleDeleteAll() {
    if (activeLocationId === ALL_LOCATIONS_VALUE) {
      showError('Choose a single branch before deleting sales and orders.');
      return;
    }
    setShowDeleteDialog(false);
    setDeleteLoading(true);
    try {
      await api.delete(appendQueryParams('/orders/all', { locationId: activeLocationId }));
      delete calendarCacheRef.current[activeLocationId];
      Object.keys(dayCacheRef.current).forEach((key) => {
        if (key.startsWith(`${activeLocationId}:`)) {
          delete dayCacheRef.current[key];
        }
      });
      await loadCalendarData(activeLocationId);
      showSuccess('All sales and orders deleted successfully.');
    } catch (err) {
      showError('Failed to delete all sales and orders.');
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-orange-50 flex flex-col items-center px-2 pt-8 sm:px-0">
        <BackButton />
        <div className="w-full max-w-lg mx-auto mt-2">
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8 mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-blue-700 mb-2 text-center">Sales Calendar</h1>
            <p className="text-gray-600 text-base sm:text-lg mb-4 text-center">View daily sales totals and top-selling items.</p>
            {deleteLoading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="flex justify-center items-center">
                  <DotLottieReact
                    src="https://lottie.host/9a942832-f4ef-42c2-be65-d6955d96c3e1/wuEXuiDlyw.lottie"
                    loop
                    autoplay
                    style={{ width: 220, height: 220 }}
                  />
                </div>
                <span className="text-gray-500 mt-2">Deleting all sales and orders...</span>
              </div>
            ) : loading ? (
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
                <div className="mb-4 pt-2">
                  <div className="flex justify-center">
                    <span className="relative z-10 -mb-3 inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-700 shadow-sm">
                      Show sales for
                    </span>
                  </div>
                  <div className="rounded-2xl border border-blue-200 bg-gradient-to-b from-blue-50 to-orange-50 px-4 pb-4 pt-5 shadow-sm">
                    <label className="sr-only" htmlFor="sales-calendar-location-select">
                      Show sales for
                    </label>
                    <select
                      id="sales-calendar-location-select"
                      value={selectedLocationId}
                      onChange={(e) => setSelectedLocationId(e.target.value)}
                      disabled={locationsLoading}
                      className="shadow-sm border border-blue-200 rounded-lg w-full max-w-sm mx-auto py-2.5 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 transition-all duration-200 bg-white"
                    >
                      <option value={ALL_LOCATIONS_VALUE}>All branches</option>
                      {locations.map((location) => {
                        const locationId = getLocationId(location);
                        return (
                          <option key={locationId} value={locationId}>
                            {getLocationName(location, 'Unassigned')}
                            {location.isActive === false ? ' (Archived)' : ''}
                          </option>
                        );
                      })}
                    </select>
                    <p className="mt-2 text-center text-xs text-blue-700 font-medium">
                      Viewing {selectedLocationLabel}
                    </p>
                    {locationsLoading && (
                      <p className="mt-1 text-center text-xs text-gray-500">Loading branches...</p>
                    )}
                  </div>
                </div>

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
                      setSelectedDate(availableDates.length > 0 ? availableDates[0] : getTodayStr());
                    }}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    className="bg-red-100 hover:bg-red-300 text-red-700 font-semibold px-4 py-2 rounded-lg shadow transition disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={activeLocationId === ALL_LOCATIONS_VALUE}
                    title={activeLocationId === ALL_LOCATIONS_VALUE ? 'Choose a single branch to delete sales and orders' : 'Delete all sales and orders'}
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
