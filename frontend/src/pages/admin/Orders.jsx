import React, { useState, useEffect, useRef } from "react";
import BackButton from "../../components/BackButton";
import { useRefresh } from "../../contexts/RefreshContext";
import { useNavigate, Link } from "react-router-dom";
import { api } from '../../utils/api';
import DeleteOrderConfirmation from "../../components/DeleteOrderConfirmation";
import Notification from "../../components/Notification";
import { AnimatePresence, motion } from 'framer-motion';
import { useSpring, animated } from '@react-spring/web';
import ConfirmationDialog from '../../components/ConfirmationDialog';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { useAuth } from "../../contexts/AuthContext";
import { appendQueryParams, getLocationId, getLocationName, isOrderEventForLocation } from "../../utils/location";

// const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// At the top, before component definition:
const ORDER_FILTER_KEY = 'admin-orders-filter';
const ORDER_LOCATION_KEY = 'admin-orders-location';
const LOCATION_BADGE_BASE = 'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] border whitespace-nowrap shadow-sm';
const LOCATION_BADGE_VARIANTS = [
  'bg-sky-50 text-sky-700 border-sky-200',
  'bg-emerald-50 text-emerald-700 border-emerald-200',
  'bg-amber-50 text-amber-700 border-amber-200',
  'bg-violet-50 text-violet-700 border-violet-200',
  'bg-rose-50 text-rose-700 border-rose-200',
  'bg-cyan-50 text-cyan-700 border-cyan-200',
  'bg-orange-50 text-orange-700 border-orange-200',
  'bg-lime-50 text-lime-700 border-lime-200',
];
const DEFAULT_LOCATION_BADGE_CLASS = `${LOCATION_BADGE_BASE} bg-blue-50 text-blue-700 border-blue-100`;

const getLocationBadgeClassName = (locationKey = '') => {
  const normalized = String(locationKey || '').trim().toLowerCase();
  if (!normalized) {
    return DEFAULT_LOCATION_BADGE_CLASS;
  }

  let hash = 0;
  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash * 31 + normalized.charCodeAt(index)) >>> 0;
  }

  const variant = LOCATION_BADGE_VARIANTS[hash % LOCATION_BADGE_VARIANTS.length] || LOCATION_BADGE_VARIANTS[0];
  return `${LOCATION_BADGE_BASE} ${variant}`;
};

// OrderCard component for per-order animation
function OrderCard({ order, isUpdated, parseCustomPaymentAmounts, formatDateIST, handleDeleteClick, deleteLoading, hideDeleteButton, isDeletedSection, activeLocationId }) {
  // Animate totalAmount with Framer Motion
  const amountRef = useRef(null);
  const [displayAmount, setDisplayAmount] = useState(order.totalAmount);
  useEffect(() => {
    if (isUpdated) {
      // Animate number flip
      const start = displayAmount;
      const end = order.totalAmount;
      if (start !== end) {
        let frame;
        let startTime;
        const duration = 400;
        const animate = (timestamp) => {
          if (!startTime) startTime = timestamp;
          const progress = Math.min((timestamp - startTime) / duration, 1);
          const value = start + (end - start) * progress;
          setDisplayAmount(value);
          if (progress < 1) {
            frame = requestAnimationFrame(animate);
          } else {
            setDisplayAmount(end);
          }
        };
        frame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frame);
      }
    } else {
      setDisplayAmount(order.totalAmount);
    }
  }, [order.totalAmount, isUpdated]);

  return (
    <div
      className={
        isDeletedSection
          ? "bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300 relative"
          : order.isPaid
            ? "bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300 relative"
            : "bg-red-50 p-5 rounded-lg shadow-sm border border-red-200 hover:shadow-md transition-all duration-300 relative cursor-pointer"
      }
    >
      <div className="flex justify-between items-start mb-3 relative">
        <div className="relative">
          {!order.isPaid && !isDeletedSection && (
            <span className="absolute -top-4 left-0 bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full shadow-sm z-10 select-none" style={{lineHeight: '1.2', letterSpacing: '0.02em'}}>
              Pending
            </span>
          )}
          <div className="flex items-center">
            <h3 className="text-lg font-semibold mr-2 whitespace-nowrap">Order #{order.orderNumber}</h3>
            {isDeletedSection && (
              <button
                onClick={() => handleDeleteClick(order)}
                disabled={deleteLoading}
                className="ml-2 p-1.5 rounded-full hover:bg-red-100 focus:bg-red-100 focus:outline-none transition-colors duration-200 flex items-center justify-center"
                aria-label="Permanently delete order"
                title="Permanently delete order"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-red-500 hover:text-red-700"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m4-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            )}
            {!isDeletedSection && !hideDeleteButton && (
              <button 
                onClick={() => handleDeleteClick(order)} 
                disabled={deleteLoading}
                className="group p-1.5 rounded-full hover:bg-red-100 focus:bg-red-100 focus:outline-none transition-colors duration-200"
                aria-label="Delete order"
                title="Delete order"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-5 w-5 text-red-500 group-hover:text-red-600 group-active:text-red-600 transition-colors duration-200" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m4-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
                  />
                </svg>
              </button>
            )}
          </div>
          <p className="text-gray-500 text-sm mt-1">
            {formatDateIST(order.createdAt)}
          </p>
          {order.locationName && (
            <div className="mt-2">
              <span className={activeLocationId === 'all'
                ? getLocationBadgeClassName(getLocationId(order.location) || order.locationName)
                : DEFAULT_LOCATION_BADGE_CLASS
              }>
                {order.locationName}
              </span>
            </div>
          )}
          {order.confirmedBy && (
            <p className="text-xs text-black mt-1">Confirmed by: {order.confirmedBy}</p>
          )}
          {isDeletedSection && (
            <p className="text-xs text-gray-700 mt-1">Deleted by: {order.deletedBy || 'Unknown'}</p>
          )}
          {isDeletedSection && order.deletedAt && (
            <p className="text-xs text-gray-500 mt-0.5">Deleted at: {formatDateIST(order.deletedAt)}</p>
          )}
        </div>
        <div className="text-right">
          <div className="flex flex-col items-end sm:items-end md:items-end lg:items-end">
            <span className="text-gray-500 text-sm">
              {order.isPaid ? 'Paid' : ''}
              {order.isPaid ? (
                order.paymentMethod.startsWith('Custom') ? (
                  <span className="font-medium"> Custom</span>
                ) : (
                  <span className="font-medium"> {order.paymentMethod}</span>
                )
              ) : null}
            </span>
            <span
              ref={amountRef}
              className="text-xl font-bold text-gray-800 mt-1 block"
              style={{ marginTop: 4 }}
            >
              ₹{displayAmount.toFixed(2)}
            </span>
            {order.discountAmount > 0 && (
              <p className="text-sm text-gray-500 line-through">
                ₹{order.subtotal.toFixed(2)}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="mt-3 bg-gray-50 p-3 rounded-lg">
        <h4 className="font-medium mb-2">Items:</h4>
        <ul className="space-y-1.5">
          {order.items.map((item, index) => (
            <li
              key={index}
              className="text-sm flex flex-col"
            >
              <span className="font-medium text-gray-800 mb-0.5">{item.name} ({item.type === 'H' ? 'Half' : item.type === 'F' ? 'Full' : item.type})</span>
              <span className="text-gray-600 italic text-xs">{item.quantity} x ₹{item.price.toFixed(2)} = <span className="font-bold">₹{item.totalPrice.toFixed(2)}</span></span>
            </li>
          ))}
        </ul>
        {order.discountAmount > 0 && (
          <div className="mt-3 pt-2 border-t border-gray-200 text-sm font-medium text-green-600 flex justify-between">
            <span>Discount Applied: {order.discountPercentage}%</span>
            <span>-₹{order.discountAmount.toFixed(2)}</span>
          </div>
        )}
        {order.paymentMethod.startsWith('Custom') && (() => {
          const { cash, online } = parseCustomPaymentAmounts(order.paymentMethod);
          return (
            <div className="mt-3 pt-2 border-t border-gray-200 text-sm font-medium text-gray-700">
              <span className="block mb-1">Custom Payment Details:</span>
              <div className="flex flex-wrap gap-2 text-gray-800">
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md flex-grow flex-shrink-0 text-center whitespace-nowrap text-xs">
                  Cash: ₹{cash.toFixed(2)}
                </span>
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-md flex-grow flex-shrink-0 text-center whitespace-nowrap text-xs">
                  Online: ₹{online.toFixed(2)}
                </span>
              </div>
            </div>
          );
        })()}
      </div>
      {/* Pending tag for deleted section */}
      {isDeletedSection && !order.isPaid && (
        <div className="mt-2">
          <span className="inline-block bg-gray-200 text-black text-xs font-semibold px-3 py-1 rounded-md" style={{ minWidth: 60, textAlign: 'left' }}>Pending</span>
        </div>
      )}
    </div>
  );
}

const Orders = () => {
  const { user } = useAuth();
  const currentLocationId = getLocationId(user?.location);
  const [orders, setOrders] = useState([]);
  const [deletedOrders, setDeletedOrders] = useState([]); // Store deleted orders
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalPaidOrders: 0,
    totalRevenue: 0,
    avgOrderValue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false); // Only used to disable delete button, not for global loading
  const [deletingOrderIds, setDeletingOrderIds] = useState([]);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [notification, setNotification] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  });
  const navigate = useNavigate();

  const { refreshKey, socket } = useRefresh();

  const [shouldAnimate, setShouldAnimate] = useState(false);
  const isMounted = useRef(false);

  // Track the last updated orderId for per-order animation
  const [lastUpdatedOrderId, setLastUpdatedOrderId] = useState(null);

  // Replace:
  // const [orderFilter, setOrderFilter] = useState('all');
  // With:
  const [orderFilter, setOrderFilter] = useState('all');
  const [locations, setLocations] = useState([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [selectedLocationId, setSelectedLocationId] = useState(() => localStorage.getItem(ORDER_LOCATION_KEY) || '');
  const activeLocationId = selectedLocationId || currentLocationId || 'all';

  const [confirmDialog, setConfirmDialog] = useState({ open: false, type: '', message: '', onConfirm: null });

  useEffect(() => {
    const loadLocations = async () => {
      try {
        setLocationsLoading(true);
        const data = await api.get('/locations?includeInactive=true');
        setLocations(data || []);
      } catch (error) {
        console.error('Error fetching locations:', error);
        setLocations([]);
      } finally {
        setLocationsLoading(false);
      }
    };

    loadLocations();
  }, []);

  useEffect(() => {
    if (locationsLoading) {
      return;
    }

    if (selectedLocationId === 'all' || !selectedLocationId) {
      return;
    }

    const hasSelectedLocation = locations.some((location) => getLocationId(location) === selectedLocationId);
    if (!hasSelectedLocation) {
      setSelectedLocationId('');
    }
  }, [locations, locationsLoading, selectedLocationId]);

  useEffect(() => {
    if (selectedLocationId) {
      localStorage.setItem(ORDER_LOCATION_KEY, selectedLocationId);
    }
  }, [selectedLocationId]);

  // Helper to parse custom payment amounts from the paymentMethod string
  const parseCustomPaymentAmounts = (paymentMethodString) => {
    const cashMatch = paymentMethodString.match(/Cash: ₹([\d.]+)/);
    const onlineMatch = paymentMethodString.match(/Online: ₹([\d.]+)/);
    
    const cash = cashMatch ? parseFloat(cashMatch[1]) : 0;
    const online = onlineMatch ? parseFloat(onlineMatch[1]) : 0;
    
    return { cash, online };
  };

  // Fetch deleted orders for the selected date
  const loadDeletedOrders = async () => {
    try {
      setError(null);
      const dateToQuery = selectedDate || getCurrentDate();
      const deletedOrdersData = await api.get(appendQueryParams(`/orders/deleted/${dateToQuery}`, { locationId: activeLocationId }));
      setDeletedOrders(deletedOrdersData || []);
    } catch (error) {
      setError('Failed to load deleted orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Update loadOrders to clear deletedOrders if not in deleted filter
  const loadOrders = async () => {
    try {
      setError(null);
      const dateToQuery = selectedDate || getCurrentDate();
      const [ordersData] = await Promise.all([
        api.get(appendQueryParams(`/orders/date/${dateToQuery}`, { locationId: activeLocationId })),
      ]);
      setOrders(ordersData.orders || []);
      setStats(ordersData.stats || {
        totalOrders: 0,
        totalPaidOrders: 0,
        totalRevenue: 0,
        avgOrderValue: 0
      });
      if (orderFilter !== 'deleted') setDeletedOrders([]);
    } catch (error) {
      console.error('Error loading orders:', error);
      setError('Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    setShouldAnimate(false); // Disable animation on initial mount or navigation
    return () => {
      isMounted.current = false;
    };
  }, [selectedDate, refreshKey, activeLocationId]);

  useEffect(() => {
    if (!socket) return;
    const handleOrderUpdate = (data) => {
      if (!isMounted.current) return;
      if (activeLocationId !== 'all' && !isOrderEventForLocation(data, activeLocationId)) {
        return;
      }
      if (data?.type === 'order-deleted' && data?.orderId) {
        // Refetch orders to update order numbers and details live for all users
        loadOrders();
      } else if (data?.order?.orderId) {
        setLastUpdatedOrderId(data.order.orderId);
        setOrders(prevOrders => {
          const filtered = prevOrders.filter(order => order.orderId !== data.order.orderId);
          const newOrders = [data.order, ...filtered];
          // Update stats live
          const paidOrders = newOrders.filter(o => o.isPaid);
          const totalPaidOrders = paidOrders.length;
          const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
          const avgOrderValue = totalPaidOrders > 0 ? totalRevenue / totalPaidOrders : 0;
          setStats({
            totalOrders: newOrders.length,
            totalPaidOrders,
            totalRevenue,
            avgOrderValue
          });
          return newOrders;
        });
      }
    };
    socket.on('order-update', handleOrderUpdate);
    return () => {
      socket.off('order-update', handleOrderUpdate);
    };
  }, [socket, selectedDate, refreshKey, activeLocationId]);

  // In useEffect for filter switching and data loading, clear notification
  useEffect(() => {
    setNotification(null); // Clear notification when switching filters or reloading
    setLoading(true);
    if (orderFilter === 'deleted') {
      loadDeletedOrders();
    } else {
      loadOrders();
    }
    // eslint-disable-next-line
  }, [selectedDate, refreshKey, orderFilter, activeLocationId]);

  const handleDateChange = (e) => {
    if (!e.target.value) {
      const today = getCurrentDate();
      setSelectedDate(today);
    } else {
      setSelectedDate(e.target.value);
    }
  };

  const getCurrentDate = () => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  };

  const formatDateUTC = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      timeZone: 'UTC',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const formatDateIST = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const resetToCurrentDate = () => {
    const today = getCurrentDate();
    setSelectedDate(today);
  };

  const handleDeleteClick = (order) => {
    if (deletingOrderIds.includes(order.orderId)) {
      return;
    }
    setOrderToDelete(order);
    setShowDeleteConfirmation(true);
  };

  const removeOrderFromPage = (orderId) => {
    setOrders((previousOrders) => {
      const nextOrders = previousOrders.filter((order) => order.orderId !== orderId);
      if (nextOrders.length === previousOrders.length) {
        return previousOrders;
      }

      const paidOrders = nextOrders.filter((order) => order.isPaid);
      const totalPaidOrders = paidOrders.length;
      const totalRevenue = paidOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
      setStats({
        totalOrders: nextOrders.length,
        totalPaidOrders,
        totalRevenue,
        avgOrderValue: totalPaidOrders > 0 ? totalRevenue / totalPaidOrders : 0
      });

      return nextOrders;
    });
  };

  const handleConfirmDelete = async () => {
    if (!orderToDelete) return;
    const deletingOrder = orderToDelete;
    setShowDeleteConfirmation(false);
    setOrderToDelete(null);
    setDeleteLoading(true);
    setDeletingOrderIds((previousIds) => [...new Set([...previousIds, deletingOrder.orderId])]);
    removeOrderFromPage(deletingOrder.orderId);

    try {
      const result = await api.delete(appendQueryParams(`/orders/${deletingOrder.orderId}`, {
        locationId: getLocationId(deletingOrder.location) || activeLocationId
      }));
      setNotification({
        message: result?.alreadyDeleted
          ? `Order #${deletingOrder.orderNumber} was already deleted`
          : `Order #${deletingOrder.orderNumber} has been deleted successfully`,
        type: 'delete',
        duration: 2000
      });
      await loadOrders();
    } catch (error) {
      if (error?.status === 404) {
        setNotification({
          message: `Order #${deletingOrder.orderNumber} was already removed. Refreshing the list.`,
          type: 'delete',
          duration: 2000
        });
      } else {
        console.error('Error deleting order:', error);
        setNotification({
          message: `Failed to delete order: ${error.message}`,
          type: 'error',
          duration: 2000
        });
      }
      await loadOrders();
    } finally {
      setDeleteLoading(false);
      setDeletingOrderIds((previousIds) => previousIds.filter((orderId) => orderId !== deletingOrder.orderId));
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirmation(false);
    setOrderToDelete(null);
  };

  // Excel download handler
  const [downloadLoading, setDownloadLoading] = useState(false);
  const handleDownloadExcel = async () => {
    setDownloadLoading(true);
    try {
      // Get signed download link from backend
      const signedUrl = await api.getSignedExcelLink(selectedDate, activeLocationId);
      // Fetch the file as a blob
      const response = await fetch(signedUrl);
      if (!response.ok) throw new Error('Failed to fetch Excel file');
      const blob = await response.blob();

      // --- ANDROID WEBVIEW FIX ---
      if (window.AndroidBridge && typeof window.AndroidBridge.saveExcelBase64 === 'function') {
        // Read blob as base64 and send to Android
        const reader = new FileReader();
        reader.onloadend = function () {
          const base64data = reader.result.split(',')[1];
          window.AndroidBridge.saveExcelBase64(
            base64data,
            `orders_${selectedDate}.xlsx`
          );
          setNotification({
            message: 'Excel file sent to device!',
            type: 'success',
            duration: 2000
          });
        };
        reader.readAsDataURL(blob);
        setDownloadLoading(false);
        return;
      }
      // --- END ANDROID FIX ---

      // Fallback: Create a temporary anchor to trigger download (browser)
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders_${selectedDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setNotification({
        message: 'Excel file download started!',
        type: 'success',
        duration: 2000
      });
    } catch (error) {
      setNotification({
        message: 'Failed to download Excel file',
        type: 'error',
        duration: 2000
      });
    } finally {
      setDownloadLoading(false);
    }
  };

  // Before rendering orders, sort by order time descending
  const sortedOrders = [...orders].sort((a, b) => {
    const aTime = new Date(a.createdAt || a.updatedAt || 0).getTime();
    const bTime = new Date(b.createdAt || b.updatedAt || 0).getTime();

    if (bTime !== aTime) {
      return bTime - aTime;
    }

    return (b.orderNumber || 0) - (a.orderNumber || 0);
  });

  // Filter orders based on filter bar
  const filteredOrders = sortedOrders.filter(order => {
    if (orderFilter === 'all') return true;
    if (orderFilter === 'confirmed') return order.isPaid;
    if (orderFilter === 'pending') return !order.isPaid;
    return true;
  });

  // Permanently delete a single deleted order with confirmation
  const handlePermanentDeleteOne = (order) => {
    setConfirmDialog({ open: false, type: '', message: '', onConfirm: null });
    // Optimistically remove the order from the UI
    setDeletedOrders(prev => prev.filter(item => item.orderId !== order.orderId));
    setLoading(true);
    api.delete(appendQueryParams(`/orders/deleted/permanent/${order.orderId}`, {
      locationId: getLocationId(order.location) || activeLocationId
    }))
      .then(() => {
        setNotification({ message: 'Order permanently deleted.', type: 'delete', duration: 2000 });
        loadDeletedOrders();
      })
      .catch(() => {
        setNotification({ message: 'Failed to permanently delete order.', type: 'error', duration: 2000 });
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // Add this function in the Orders component, before handlePermanentDeleteOne
  const handlePermanentDeleteClick = (order) => {
    setConfirmDialog({
      open: true,
      type: 'single',
      message: 'Are you sure you want to permanently delete this order?',
      onConfirm: () => handlePermanentDeleteOne(order)
    });
  };

  // Permanently delete all deleted orders for the selected date
  const handlePermanentDeleteAll = async () => {
    if (deletedOrders.length === 0) return;
    setConfirmDialog({
      open: true,
      type: 'all',
      message: 'Are you sure you want to permanently delete ALL deleted orders for this date?',
      onConfirm: async () => {
        try {
          setLoading(true);
          await api.delete(appendQueryParams(`/orders/deleted/permanent/all/${selectedDate}`, {
            locationId: activeLocationId
          }));
          setNotification({ message: 'All deleted orders permanently deleted.', type: 'delete', duration: 2000 });
          await loadDeletedOrders();
        } catch (error) {
          setNotification({ message: 'Failed to permanently delete all deleted orders.', type: 'error', duration: 2000 });
        } finally {
          setLoading(false);
          setConfirmDialog({ open: false, type: '', message: '', onConfirm: null });
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-orange-200 bg-opacity-40">
        <DotLottieReact
          src="https://lottie.host/9a942832-f4ef-42c2-be65-d6955d96c3e1/wuEXuiDlyw.lottie"
          loop
          autoplay
          style={{ width: 240, height: 240 }}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-orange-100">
        <BackButton />
        <div className="p-4 pt-16">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline"> {error}</span>
            <button
              className="bg-red-500 text-white px-4 py-2 rounded mt-2"
              onClick={loadOrders}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-100">
      <BackButton />
      <div className="p-4 pt-16">
        <div className="bg-white shadow-md rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-6">Order Management</h1>

          <div className="mb-6 pt-2">
            <div className="flex justify-center">
              <span className="relative z-10 -mb-3 inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-700 shadow-sm">
                Show orders for
              </span>
            </div>
            <div className="rounded-2xl border border-orange-200 bg-gradient-to-b from-orange-50 to-amber-50 px-4 pb-4 pt-5 shadow-sm">
              <label className="sr-only" htmlFor="admin-orders-location-select">
                Show orders for
              </label>
              <select
                id="admin-orders-location-select"
                value={selectedLocationId || currentLocationId || 'all'}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                disabled={locationsLoading}
                className="shadow-sm border border-orange-200 rounded-lg w-full max-w-sm mx-auto py-2.5 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 transition-all duration-200 bg-white"
              >
                <option value="all">All branches</option>
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
              {locationsLoading && (
                <p className="mt-2 text-center text-xs text-gray-500">Loading branches...</p>
              )}
            </div>
          </div>

          {/* Date Picker + Excel Download */}
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Select Date:
            </label>
            <div className="flex flex-wrap gap-3 sm:gap-4 md:gap-6 items-center p-2 sm:p-3 md:p-4 rounded-lg bg-orange-50 border border-orange-100">
              <div className="relative flex-1 min-w-[180px]">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={handleDateChange}
                  max={getCurrentDate()}
                  className="shadow-sm border border-orange-200 rounded-lg w-full py-2.5 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 transition-all duration-200"
                  required
                  style={{
                    colorScheme: 'light'
                  }}
                />
              </div>
              <div className="flex flex-row gap-2 sm:gap-3 md:gap-4 flex-shrink-0">
                <button
                  onClick={resetToCurrentDate}
                  className="bg-orange-100 hover:bg-orange-200 text-orange-800 font-medium py-2.5 px-3 sm:px-4 md:px-5 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 transition-all duration-200 flex-shrink-0 flex items-center whitespace-nowrap text-xs sm:text-sm border border-orange-200"
                  title="Reset to today"
                  style={{marginRight: 0}}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Today</span>
                </button>
                <button
                  onClick={handleDownloadExcel}
                  className="bg-green-500 hover:bg-green-600 text-white font-medium py-2.5 px-3 sm:px-4 md:px-5 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300 transition-all duration-200 flex-shrink-0 flex items-center justify-center whitespace-nowrap text-xs sm:text-sm relative min-w-[120px] border border-green-600"
                  title="Download Excel"
                  disabled={orders.length === 0 || downloadLoading}
                  style={{ opacity: orders.length === 0 || downloadLoading ? 0.5 : 1 }}
                >
                  {downloadLoading ? (
                    <span className="flex items-center justify-center w-full">
                      <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-b-2 border-white border-b-orange-500 mr-2"></span>
                      <span className="ml-1 text-xs sm:text-sm">Preparing...</span>
                    </span>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 4v12" />
                      </svg>
                      <span>Download Excel</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            {orders.length === 0 && (
              <div className="mt-2 text-center text-red-600 font-medium">
                No orders available to download
              </div>
            )}
          </div>

          {/* Enhanced Stats Display */}
          {orders.length > 0 && (
            <>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg shadow-sm border border-orange-200 transition-all duration-300 hover:shadow-md">
                  <h3 className="text-lg font-semibold text-gray-700">Paid Orders</h3>
                  <p className="text-3xl font-bold text-orange-600 mt-2">
                    {stats.totalPaidOrders}
                  </p>
                </div>
                <div
                  className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg shadow-sm border border-yellow-200 transition-all duration-300 hover:shadow-md cursor-pointer"
                  onClick={() => navigate('/pending-orders')}
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') navigate('/pending-orders'); }}
                  aria-label="View Pending Orders"
                >
                  <h3 className="text-lg font-semibold text-gray-700">Unpaid Orders</h3>
                  <p className="text-3xl font-bold text-yellow-600 mt-2">
                    {orders.filter(o => !o.isPaid).length}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gradient-to-br from-orange-50 to-green-100 p-4 rounded-lg shadow-sm border border-green-200 transition-all duration-300 hover:shadow-md">
                  <h3 className="text-lg font-semibold text-gray-700">Revenue</h3>
                  <p className="text-3xl font-bold text-green-600 mt-2">
                    ₹{stats.totalRevenue.toLocaleString('en-IN')}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">From Paid Orders</p>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-purple-100 p-4 rounded-lg shadow-sm border border-purple-200 transition-all duration-300 hover:shadow-md">
                  <h3 className="text-lg font-semibold text-gray-700">Avg. Order Value</h3>
                  <p className="text-3xl font-bold text-purple-600 mt-2">
                    ₹{Math.round(stats.avgOrderValue).toLocaleString('en-IN')}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">Per Paid Order</p>
                </div>
              </div>
            </>
          )}

          {/* Divider above Filter Bar */}
          <div className="w-full border-t border-gray-200 mb-3"></div>
          {/* Filter Bar */}
          <div className="flex gap-1 mb-6 overflow-x-auto hide-scrollbar pb-2">
            <button
              className={`px-3 py-2 rounded-full font-medium whitespace-nowrap transition-colors duration-200 focus:outline-none ${orderFilter === 'all' ? 'bg-orange-100 text-orange-700 shadow-sm' : 'bg-transparent text-gray-700 hover:bg-orange-50'}`}
              onClick={() => setOrderFilter('all')}
            >
              All
            </button>
            <button
              className={`px-5 py-2 rounded-full font-medium whitespace-nowrap transition-colors duration-200 focus:outline-none ${orderFilter === 'confirmed' ? 'bg-green-100 text-green-700 shadow-sm' : 'bg-transparent text-gray-700 hover:bg-green-50'}`}
              onClick={() => setOrderFilter('confirmed')}
            >
              Confirmed
            </button>
            <button
              className={`px-5 py-2 rounded-full font-medium whitespace-nowrap transition-colors duration-200 focus:outline-none ${orderFilter === 'pending' ? 'bg-yellow-100 text-yellow-700 shadow-sm' : 'bg-transparent text-gray-700 hover:bg-yellow-50'}`}
              onClick={() => setOrderFilter('pending')}
            >
              Pending
            </button>
            <button
              className={`px-5 py-2 rounded-full font-medium whitespace-nowrap transition-colors duration-200 focus:outline-none ${orderFilter === 'deleted' ? 'bg-red-100 text-red-700 shadow-sm' : 'bg-transparent text-gray-700 hover:bg-red-50'}`}
              onClick={() => setOrderFilter('deleted')}
            >
              Deleted
            </button>
          </div>

          {/* Orders List */}
          <div className="space-y-4 relative">
            {orderFilter === 'deleted' ? (
              <>
                {deletedOrders.length > 0 && (
                  <div className="flex items-center gap-2 mb-4">
                    <button
                      className="px-3 py-1.5 rounded-full bg-red-500 text-white font-semibold text-sm shadow-sm hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-300 transition-colors duration-150"
                      onClick={handlePermanentDeleteAll}
                    >
                      Delete All
                    </button>
                  </div>
                )}
                {deletedOrders.length === 0 ? (
                  <p className="text-gray-600 text-center py-8 bg-white rounded-lg shadow-sm border border-gray-200">No deleted orders for this date</p>
                ) : (
                  deletedOrders.map(order => (
                    <OrderCard
                      key={order.orderId}
                      order={order}
                      isUpdated={false}
                      parseCustomPaymentAmounts={parseCustomPaymentAmounts}
                      formatDateIST={formatDateIST}
                      handleDeleteClick={handlePermanentDeleteClick}
                      deleteLoading={false}
                      hideDeleteButton={false}
                      isDeletedSection={true}
                      activeLocationId={activeLocationId}
                    />
                  ))
                )}
              </>
            ) : (
              filteredOrders.length === 0 ? (
                <p className="text-gray-600 text-center py-8 bg-white rounded-lg shadow-sm border border-gray-200">No orders found for this filter</p>
            ) : (
              filteredOrders.map(order => (
                <div key={order.orderId}>
                  <OrderCard
                    order={order}
                    isUpdated={order.orderId === lastUpdatedOrderId}
                    parseCustomPaymentAmounts={parseCustomPaymentAmounts}
                    formatDateIST={formatDateIST}
                    handleDeleteClick={handleDeleteClick}
                    deleteLoading={deletingOrderIds.includes(order.orderId)}
                    hideDeleteButton={false}
                    isDeletedSection={false}
                    activeLocationId={activeLocationId}
                  />
                </div>
              ))
              )
            )}
          </div>
        </div>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <DeleteOrderConfirmation
        isOpen={showDeleteConfirmation}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        orderNumber={orderToDelete?.orderNumber}
        isLoading={deleteLoading}
      />

      {/* Notification */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          duration={notification.duration}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Confirmation Dialog for permanent delete actions */}
      <ConfirmationDialog
        isOpen={confirmDialog.open}
        title="Confirm Permanent Deletion"
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ open: false, type: '', message: '', onConfirm: null })}
        isLoading={loading}
      />
    </div>
  );
};

export default Orders;
