import React, { useState, useEffect } from 'react';

const IPCheck = ({ children }) => {
  const [isAuthorized, setIsAuthorized] = useState(null);
  const [userIP, setUserIP] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkIPAccess();
  }, []);

  const checkIPAccess = async () => {
    try {
      const response = await fetch('/api/check-access');
      const data = await response.json();
      
      setUserIP(data.ip);
      setIsAuthorized(data.allowed);
      
      if (!data.allowed) {
        console.log('Access denied for IP:', data.ip);
      }
    } catch (error) {
      console.error('Error checking IP access:', error);
      setIsAuthorized(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #007bff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p style={{ color: '#666', fontSize: '14px' }}>正在驗證存取權限...</p>
          <style jsx>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#ffe6e6'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(220, 38, 38, 0.2)',
          border: '2px solid #ef4444',
          maxWidth: '500px'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            backgroundColor: '#ef4444',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            color: 'white',
            fontSize: '24px',
            fontWeight: 'bold'
          }}>
            ✗
          </div>
          <h1 style={{
            color: '#dc2626',
            fontSize: '24px',
            marginBottom: '1rem',
            fontWeight: '600'
          }}>
            存取被拒絕
          </h1>
          <p style={{
            color: '#666',
            fontSize: '16px',
            lineHeight: '1.5',
            marginBottom: '1rem'
          }}>
            很抱歉，您的 IP 地址沒有存取此應用程式的權限。
          </p>
          <p style={{
            color: '#888',
            fontSize: '14px',
            fontFamily: 'monospace',
            backgroundColor: '#f5f5f5',
            padding: '0.5rem',
            borderRadius: '4px',
            display: 'inline-block'
          }}>
            您的 IP: {userIP}
          </p>
          <div style={{
            marginTop: '2rem',
            padding: '1rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '6px',
            fontSize: '14px',
            color: '#666'
          }}>
            如需存取權限，請聯繫系統管理員。
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default IPCheck;