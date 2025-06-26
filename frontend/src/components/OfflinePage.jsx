import React, { useState, useEffect } from 'react';

const OfflinePage = ({ onRetry }) => {
  const [isPressing, setIsPressing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [hideButton, setHideButton] = useState(false);

  // Auto-detect network restoration and trigger onRetry
  useEffect(() => {
    const handleOnline = () => {
      setIsLoading(true);
      onRetry();
    };
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [onRetry]);

  const handleRetryClick = async () => {
    setIsLoading(true);
    setTimeout(() => {
      if (navigator.onLine) {
        onRetry();
      } else {
        setIsLoading(false);
        setShake(true);
        setTimeout(() => setShake(false), 600);
      }
    }, 400);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fff8f0',
        padding: '24px 8px',
        boxSizing: 'border-box',
        width: '100vw',
        maxWidth: '100vw',
      }}
    >
      <img
        src="/images/icons/icon-512X512.png"
        alt="No Internet"
        style={{
          width: 90,
          height: 90,
          marginBottom: 18,
          borderRadius: 16,
          boxShadow: '0 2px 8px #ff660022',
          objectFit: 'cover',
        }}
      />
      <h2
        style={{
          color: '#ff6600',
          marginBottom: 10,
          fontWeight: 700,
          fontSize: 22,
          textAlign: 'center',
          lineHeight: 1.2,
        }}
      >
        No Internet Connection
      </h2>
      <p
        style={{
          color: '#555',
          marginBottom: 20,
          fontSize: 15,
          textAlign: 'center',
          maxWidth: 260,
          lineHeight: 1.4,
        }}
      >
        You are currently offline. Please check your internet connection and try again. Your session and data are safe.
      </p>
      {!hideButton && (
        <button
          onMouseDown={() => setIsPressing(true)}
          onMouseUp={() => setIsPressing(false)}
          onMouseLeave={() => setIsPressing(false)}
          onTouchStart={() => setIsPressing(true)}
          onTouchEnd={() => setIsPressing(false)}
          onClick={handleRetryClick}
          disabled={isLoading}
          className={shake ? 'shake-horizontal' : ''}
          style={{
            padding: '12px 0',
            width: 160,
            background: isPressing || isLoading ? '#e65100' : '#ff6600',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 17,
            boxShadow: isPressing || isLoading ? '0 2px 8px #ff660033' : '0 4px 16px #ff660022',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s, box-shadow 0.15s',
            outline: 'none',
            marginBottom: 18,
            position: 'relative',
          }}
        >
          {isLoading ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: 20,
                  height: 20,
                  border: '3px solid #fff',
                  borderTop: '3px solid #ff6600',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  marginRight: 8,
                  background: 'transparent',
                }}
              />
              Loading...
            </span>
          ) : (
            'Retry'
          )}
        </button>
      )}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .shake-horizontal {
          animation: shake-horizontal 0.6s cubic-bezier(.36,.07,.19,.97) both;
        }
        @keyframes shake-horizontal {
          10%, 90% { transform: translateX(-1px); }
          20%, 80% { transform: translateX(2px); }
          30%, 50%, 70% { transform: translateX(-4px); }
          40%, 60% { transform: translateX(4px); }
        }
      `}</style>
      <div
        style={{
          marginTop: 18,
          color: '#aaa',
          fontSize: 13,
          textAlign: 'center',
          maxWidth: 220,
        }}
      >
        Tip: You can keep using the app. When you are back online, just press Retry!
      </div>
    </div>
  );
};

export default OfflinePage;
