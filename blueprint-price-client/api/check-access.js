// Vercel Serverless Function to check IP access
export default function handler(req, res) {
  // 允許的 IP 地址
  const ALLOWED_IPS = ['211.21.66.134'];
  
  // 獲取客戶端真實 IP
  const forwardedFor = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];
  const clientIp = forwardedFor?.split(',')[0] || realIp || req.connection.remoteAddress;
  
  console.log(`Client IP: ${clientIp}`);
  
  // 允許 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // 檢查是否為允許的 IP
  if (!ALLOWED_IPS.includes(clientIp)) {
    return res.status(403).json({
      error: 'Access Denied',
      message: 'Your IP address is not authorized to access this application.',
      ip: clientIp,
      allowed: false
    });
  }
  
  return res.status(200).json({
    message: 'Access granted',
    ip: clientIp,
    allowed: true
  });
}