import atexit
import signal
import sys
import requests
import threading
import time
import subprocess
# Ollama API endpoint
OLLAMA_URL = "http://localhost:11434/api/generate"

# Global flag to track if we started Ollama and need to clean up
ollama_started_by_app = False

def run_system_command(command):
    """Run a system command and return the result"""
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=30)
        return result.returncode == 0, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return False, "", "Command timed out"
    except Exception as e:
        return False, "", str(e)

def start_ollama_service():
    """Start the Ollama system service"""
    print("Starting Ollama service...")
    success, stdout, stderr = run_system_command("sudo systemctl start ollama")
    if success:
        print("Ollama service started successfully")
        # Wait a bit for the service to fully start
        time.sleep(3)
        return True
    else:
        print(f"Failed to start Ollama service: {stderr}")
        return False

def stop_ollama_service():
    """Stop the Ollama system service"""
    print("Stopping Ollama service...")
    success, stdout, stderr = run_system_command("sudo systemctl stop ollama")
    if success:
        print("Ollama service stopped successfully")
        return True
    else:
        print(f"Failed to stop Ollama service: {stderr}")
        return False

def check_ollama_running():
    """Check if Ollama is running and accessible"""
    try:
        response = requests.post(OLLAMA_URL, json={"model": "llama3.1:8b", "prompt": "test"}, timeout=2)
        return response.status_code == 200
    except:
        return False

def start_ollama_if_needed():
    """Start Ollama if it's not running"""
    global ollama_started_by_app
    
    if not check_ollama_running():
        print("Ollama is not running. Attempting to start it...")
        if start_ollama_service():
            ollama_started_by_app = True
            # Wait a bit for the API to become available
            for i in range(10):
                time.sleep(1)
                if check_ollama_running():
                    print("Ollama is now running and accessible")
                    return True
            print("Ollama service started but API not responding yet")
            return False
        else:
            print("Could not start Ollama service automatically")
            return False
    return True



def cleanup():
    """Cleanup function to stop Ollama when the Flask app exits"""
    global ollama_started_by_app
    
    if ollama_started_by_app:
        print("Shutting down... stopping Ollama service")
        stop_ollama_service()
        ollama_started_by_app = False

# Register cleanup function to run when the app exits
atexit.register(cleanup)

# Handle signal interrupts with a flag to prevent multiple executions
shutting_down = False

def signal_handler(sig, frame):
    global shutting_down
    if not shutting_down:
        shutting_down = True
        print('Interrupt received, shutting down...')
        cleanup()
        sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)