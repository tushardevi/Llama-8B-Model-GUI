from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from tools import *

app = Flask(__name__)
CORS(app)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/bold')
def bold():
    return render_template('bold.html')

@app.route('/ask-llama', methods=['POST'])
def ask_llama():
    try:
        data = request.get_json()
        user_message = data.get('message', '')
        
        if not user_message:
            return jsonify({'success': False, 'error': 'No message provided'})
        
       
        real_ip = request.headers.get('X-Forwarded-For', request.remote_addr)
        print(f"Received question: {user_message} .:. from UserIP: {real_ip}") 

        # Check if Ollama is running and start if needed
        if not start_ollama_if_needed():
            return jsonify({'successs': False, 'error': 'Ollama is not running and could not be started automatically.'})
        
        # Send request to Ollama API
        payload = {
            "model": "llama3.1:8b",
            "prompt": user_message,
            "stream": False
        }
        
        response = requests.post(OLLAMA_URL, json=payload, timeout=60)
        
        if response.status_code == 200:
            result = response.json()
            llm_response = result.get('response', 'No response received')
            #print(f"Sending response: {llm_response}")
            return jsonify({'success': True, 'response': llm_response})
        else:
            return jsonify({'success': False, 'error': f'Ollama API error: {response.status_code}'})
    
    except requests.exceptions.Timeout:
        return jsonify({'success': False, 'error': 'Request timeout'})
    except requests.exceptions.ConnectionError:
        return jsonify({'success': False, 'error': 'Cannot connect to Ollama. Make sure it is running.'})
    except Exception as e:
        print(f"Error processing message: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/health',methods=['GET'])
def health_check():
    """Check if the Ollama API is accessible"""
    if check_ollama_running():
        return jsonify({'status': 'running'})
    else:
        return jsonify({'status': 'not running'})
    



if __name__ == '__main__':
    print("Starting Flask server with Ollama API integration...")
    print("Attempting to start Ollama service automatically...")
    
    # Try to start Ollama when the app starts
    start_ollama_if_needed()
    
    app.run(debug=True, host='0.0.0.0', port=5000)

