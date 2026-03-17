import httpx
import json
import time

def listen_sse():
    print("Listening to SSE for 20 seconds...")
    try:
        with httpx.stream("GET", "http://localhost:8000/api/events", timeout=30.0) as response:
            start_time = time.time()
            for line in response.iter_lines():
                if line:
                    print(f"Received: {line}")
                if time.time() - start_time > 20:
                    break
    except Exception as e:
        print(f"Error in SSE: {e}")

if __name__ == "__main__":
    listen_sse()
    print("Done testing")
