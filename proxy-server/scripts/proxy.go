package main

/*
API Client CORS Proxy Server (Go)

A lightweight proxy server to bypass CORS restrictions during API development.
No external dependencies - uses only Go standard library.

Usage:
  go run proxy.go [flags]

Flags:
  -port int      Port to listen on (default 9090)
  -host string   Host to bind to (default "0.0.0.0")
  -origin string CORS origin to allow (default "*")
  -username string Basic auth username
  -password string Basic auth password
  -verbose       Enable verbose logging
*/

import (
	"encoding/base64"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"
)

type Config struct {
	Port     int
	Host     string
	Origin   string
	Username string
	Password string
	Verbose  bool
}

type HealthResponse struct {
	Status  string  `json:"status"`
	Version string  `json:"version"`
	Uptime  float64 `json:"uptime"`
}

type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
}

var (
	config    Config
	startTime time.Time
)

func main() {
	// Parse command line flags
	flag.IntVar(&config.Port, "port", 9090, "Port to listen on")
	flag.StringVar(&config.Host, "host", "0.0.0.0", "Host to bind to")
	flag.StringVar(&config.Origin, "origin", "*", "CORS origin to allow")
	flag.StringVar(&config.Username, "username", "", "Basic auth username")
	flag.StringVar(&config.Password, "password", "", "Basic auth password")
	flag.BoolVar(&config.Verbose, "verbose", false, "Enable verbose logging")
	flag.Parse()

	startTime = time.Now()

	// Set up routes
	http.HandleFunc("/health", handleHealth)
	http.HandleFunc("/", handleProxy)

	// Start server
	addr := fmt.Sprintf("%s:%d", config.Host, config.Port)
	fmt.Printf(`
🚀 API Client CORS Proxy Server (Go) started!
   
   Listening on: http://%s
   Health check: http://%s/health
   
   Usage:
   - Add X-Target-URL header with the target API URL
   - Or use ?url=<target-url> query parameter
   
   %s
   %s

`, addr, addr,
		func() string {
			if config.Username != "" {
				return "🔒 Authentication enabled"
			}
			return "🔓 No authentication"
		}(),
		func() string {
			if config.Verbose {
				return "📝 Verbose logging enabled"
			}
			return ""
		}())

	log.Fatal(http.ListenAndServe(addr, nil))
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	setCORSHeaders(w, r)
	
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(HealthResponse{
		Status:  "ok",
		Version: "1.0.0",
		Uptime:  time.Since(startTime).Seconds(),
	})
}

func handleProxy(w http.ResponseWriter, r *http.Request) {
	setCORSHeaders(w, r)
	
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	// Check authentication
	if !checkAuth(r) {
		w.Header().Set("WWW-Authenticate", `Basic realm="Proxy"`)
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte("Unauthorized"))
		return
	}

	// Extract target URL
	targetURL := r.Header.Get("X-Target-URL")
	if targetURL == "" {
		targetURL = r.URL.Query().Get("url")
	}

	if targetURL == "" {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("Missing target URL. Use X-Target-URL header or ?url= parameter"))
		return
	}

	// Create proxy request
	proxyReq, err := http.NewRequest(r.Method, targetURL, r.Body)
	if err != nil {
		sendError(w, "Invalid target URL", err)
		return
	}

	// Copy headers
	skipHeaders := map[string]bool{
		"Host":               true,
		"Connection":         true,
		"Proxy-Authorization": true,
		"X-Target-URL":       true,
		"Origin":             true,
		"Referer":            true,
	}

	for key, values := range r.Header {
		if !skipHeaders[key] {
			for _, value := range values {
				proxyReq.Header.Add(key, value)
			}
		}
	}

	// Log request if verbose
	if config.Verbose {
		log.Printf("[%s] %s %s", time.Now().Format("2006-01-02 15:04:05"), r.Method, targetURL)
	}

	// Make request
	client := &http.Client{
		Timeout: 30 * time.Second,
	}
	resp, err := client.Do(proxyReq)
	if err != nil {
		sendError(w, "Proxy error", err)
		if config.Verbose {
			log.Printf("[%s] %s %s -> Error: %v", time.Now().Format("2006-01-02 15:04:05"), r.Method, targetURL, err)
		}
		return
	}
	defer resp.Body.Close()

	// Log response if verbose
	if config.Verbose {
		log.Printf("[%s] %s %s -> %d", time.Now().Format("2006-01-02 15:04:05"), r.Method, targetURL, resp.StatusCode)
	}

	// Copy response headers
	for key, values := range resp.Header {
		if key != "Connection" && key != "Transfer-Encoding" {
			for _, value := range values {
				w.Header().Add(key, value)
			}
		}
	}

	// Set CORS headers (after copying response headers to override)
	setCORSHeaders(w, r)

	// Set status code
	w.WriteHeader(resp.StatusCode)

	// Copy response body
	io.Copy(w, resp.Body)
}

func setCORSHeaders(w http.ResponseWriter, r *http.Request) {
	origin := r.Header.Get("Origin")
	if origin == "" {
		origin = "*"
	}

	if config.Origin == "*" {
		w.Header().Set("Access-Control-Allow-Origin", origin)
	} else {
		w.Header().Set("Access-Control-Allow-Origin", config.Origin)
	}

	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD")
	w.Header().Set("Access-Control-Allow-Headers", "*")
	w.Header().Set("Access-Control-Allow-Credentials", "true")
	w.Header().Set("Access-Control-Max-Age", "86400")
}

func checkAuth(r *http.Request) bool {
	if config.Username == "" || config.Password == "" {
		return true
	}

	auth := r.Header.Get("Proxy-Authorization")
	if auth == "" {
		auth = r.Header.Get("Authorization")
	}

	if auth == "" {
		return false
	}

	parts := strings.SplitN(auth, " ", 2)
	if len(parts) != 2 || parts[0] != "Basic" {
		return false
	}

	decoded, err := base64.StdEncoding.DecodeString(parts[1])
	if err != nil {
		return false
	}

	credentials := strings.SplitN(string(decoded), ":", 2)
	if len(credentials) != 2 {
		return false
	}

	return credentials[0] == config.Username && credentials[1] == config.Password
}

func sendError(w http.ResponseWriter, message string, err error) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusInternalServerError)
	json.NewEncoder(w).Encode(ErrorResponse{
		Error:   message,
		Message: err.Error(),
	})
}