
document.addEventListener('DOMContentLoaded', function () {
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const conversation = document.getElementById('conversation');
    const typingIndicator = document.getElementById('typingIndicator');
    const statusIndicator = document.getElementById('statusIndicator');
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const copyButton = document.getElementById("copyb");
    let isOnline = false;



    // Check server status on load and periodically
    checkServerStatus();
    //setInterval(checkServerStatus, 10000); // Check every 10 seconds

    // Auto-resize textarea
    messageInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });


    function updateStatus(online) {
        isOnline = online;
        if (online) {
            statusDot.className = 'status-dot status-online';
            statusText.textContent = 'Online';
            sendButton.disabled = false;
            messageInput.placeholder = 'Type your question here...';
        } else {
            statusDot.className = 'status-dot status-offline';
            statusText.textContent = 'Offline';
            sendButton.disabled = true;
            messageInput.placeholder = 'Server is offline...';
        }
    }


    function checkServerStatus() {
        fetch('/health')
            .then(response => response.json())
            .then(data => {
                updateStatus(data.status === 'running');
            })
            .catch(error => {
                console.error('Error checking server status:', error);
                updateStatus(false);
            });
    }

    function addMessage(text, isUser) {
        //replacing the text format to present data friendly way
        let headers_text = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b><br/>'); // making headers bold 
        let code_text = headers_text.replace(/```([^]*?)```/gs,
            '<div class="code-container">' +
            '  <button class="copy-button">Copy</button>' +
            '  <div class="code-output">$1</div>' +
            '</div>'); // coding for script div


        let italics_text = code_text.replace(/`([^]*?)`/gs, '<br/><b><i>$1</i></b>'); // subheading to italics and bold


        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        messageElement.classList.add(isUser ? 'user-message' : 'ai-message');



        const now = new Date();
        const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // put all to main 
        messageElement.innerHTML = italics_text + '<div class="timestamp">' + timestamp + '</div>';
        conversation.insertBefore(messageElement, typingIndicator);

        // Scroll to bottom
        //conversation.scrollTop = conversation.scrollHeight;

        return messageElement;
    }

    function addErrorMessage(text) {
        const errorElement = document.createElement('div');
        errorElement.classList.add('error-message');
        errorElement.textContent = text;
        conversation.insertBefore(errorElement, typingIndicator);

        // Scroll to bottom
        conversation.scrollTop = conversation.scrollHeight;
    }

    function showTypingIndicator() {
        typingIndicator.style.display = 'block';
        conversation.scrollTop = conversation.scrollHeight;
    }

    function hideTypingIndicator() {
        typingIndicator.style.display = 'none';
    }

    function sendMessage() {
        console.log("message sent!")
        const message = messageInput.value.trim();

        if (!message || !isOnline) return;

        // Add user message to chat
        addMessage(message, true);

        // Clear input and reset height
        messageInput.value = '';
        messageInput.style.height = 'auto';

        // Show typing indicator
        showTypingIndicator();

        // Send the message to the backend
        fetch('/ask-llama', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: message })
        })
            .then(response => response.json())
            .then(data => {
                hideTypingIndicator();

                if (data.success) {
                    addMessage(data.response, false);
                } else {
                    addErrorMessage("Error: " + data.error);
                }
            })
            .catch(error => {
                hideTypingIndicator();
                addErrorMessage("Error connecting to the server. Please try again.");
                console.error('Error:', error);
            });
    }

    sendButton.addEventListener('click', sendMessage);



    messageInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
});


//listens to only copy buttons for code scripts and copys the content
document.addEventListener('click', function (event) {
    if (event.target && event.target.classList.contains('copy-button')) {
        const button = event.target;
        const codeBlock = button.nextElementSibling; // The code block is right after the button
        button.classList.add('clicked-button');
        button.textContent = 'Copied!';

        setTimeout(() => {
            button.classList.remove('clicked-button');
            button.textContent = "Copy"; // This will reset to "Copy"
        }, 1300);

        if (codeBlock && codeBlock.classList.contains('code-output')) {
            const range = document.createRange();
            range.selectNode(codeBlock);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(range);
            document.execCommand('copy');
            window.getSelection().removeAllRanges()
        }




    }
});