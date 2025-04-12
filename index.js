const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const { URL } = require('url');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Simple in-memory cache using native JavaScript
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// Enhanced proxy route
app.use('/proxy', async (req, res) => {
  const targetUrl = req.query.url;
  const { method } = req;
  
  // Validate URL
  if (!targetUrl) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }
  
  try {
    // Basic URL validation
    const parsedUrl = new URL(targetUrl);
    
    // Caching for GET requests
    const cacheKey = `${method}:${targetUrl}:${JSON.stringify(req.body)}`;
    if (method === 'GET') {
      const cachedResponse = cache.get(cacheKey);
      if (cachedResponse) {
        const { data, status, headers, timestamp } = cachedResponse;
        
        // Check if cache is still valid
        if (Date.now() - timestamp < CACHE_DURATION) {
          console.log(`Cache hit for: ${targetUrl}`);
          
          // Set response headers from cache
          Object.entries(headers).forEach(([key, value]) => {
            if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(key.toLowerCase())) {
              res.set(key, value);
            }
          });
          
          return res.status(status).send(data);
        }
        // Cache expired, remove it
        cache.delete(cacheKey);
      }
    }
    
    console.log(`Proxying ${method} request to: ${targetUrl}`);
    
    // Remove headers that shouldn't be forwarded
    const cleanHeaders = {...req.headers};
    delete cleanHeaders.host;
    delete cleanHeaders['content-length'];
    delete cleanHeaders.connection;
    
    const axiosConfig = {
      method: method,
      url: targetUrl,
      headers: {
        ...cleanHeaders,
        host: parsedUrl.host
      },
      timeout: 30000, // 30 second timeout
      validateStatus: null, // Don't throw on any status code
      decompress: true
    };
    
    // Handle request body for appropriate methods
    if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      axiosConfig.data = req.body;
    }
    
    // Make the request
    const response = await axios(axiosConfig);
    
    // Set all response headers
    Object.entries(response.headers).forEach(([key, value]) => {
      if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(key.toLowerCase())) {
        res.set(key, value);
      }
    });
    
    // Cache successful GET responses
    if (method === 'GET' && response.status >= 200 && response.status < 300) {
      cache.set(cacheKey, {
        data: response.data,
        status: response.status,
        headers: response.headers,
        timestamp: Date.now()
      });
      
      // Basic cache management - limit size
      if (cache.size > 100) { // Limit cache to 100 entries
        const oldestKey = [...cache.keys()][0];
        cache.delete(oldestKey);
      }
    }
    
    res.status(response.status).send(response.data);
  } catch (error) {
    console.error('Proxy error:', error.message);
    
    const errorResponse = {
      error: 'Proxy request failed',
      message: error.message
    };
    
    if (error.response) {
      // The request was made and the server responded with an error status
      errorResponse.status = error.response.status;
      errorResponse.data = error.response.data;
      
      res.status(error.response.status).json(errorResponse);
    } else if (error.request) {
      // The request was made but no response was received
      res.status(504).json({
        error: 'Gateway Timeout',
        message: 'No response received from target server'
      });
    } else {
      // Something happened in setting up the request
      res.status(500).json(errorResponse);
    }
  }
});

// Simple health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});

module.exports = app;
