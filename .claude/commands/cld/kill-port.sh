
lsof -ti:"$1" | xargs kill -9 2>/dev/null || echo "No process found on port $1"