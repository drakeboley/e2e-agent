const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3000');

ws.on('open', () => {
    console.log('Connected to Testing Agent Server');
    
    // Simulate an agent sending a goto command
    const gotoCommand = {
        id: 'cmd-1',
        type: 'goto',
        url: 'https://example.com'
    };
    
    console.log('Sending command:', gotoCommand);
    ws.send(JSON.stringify(gotoCommand));
});

ws.on('message', (data) => {
    const response = JSON.parse(data);
    console.log('Received response from Agent Server:', response);
    
    // If the goto succeeded, try getting the DOM
    if (response.actionId === 'cmd-1' && response.success) {
        const domCommand = {
            id: 'cmd-2',
            type: 'getText',
            selector: 'h1'
        };
        console.log('Sending command:', domCommand);
        ws.send(JSON.stringify(domCommand));
    }
    
    // Disconnect after getting the text
    if (response.actionId === 'cmd-2' && response.success) {
        console.log('Successfully extracted text:', response.text);
        ws.close();
    }
});

ws.on('close', () => {
    console.log('Disconnected');
});
