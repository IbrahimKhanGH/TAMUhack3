import { useState, useEffect } from 'react'

function App() {
  const [events, setEvents] = useState([]);
  const [health, setHealth] = useState(null);

  useEffect(() => {
    // Fetch health status
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setHealth(data))
      .catch(err => console.error('Error fetching health:', err));

    // Connect to SSE endpoint
    const eventSource = new EventSource('/api/events');
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      // Simplify the data before storing
      const simplifiedData = {
        type: data.type,
        timestamp: data.timestamp,
        callDetails: {
          id: data.data.call_id,
          status: data.data.call_status,
          duration: data.data.duration_ms ? `${(data.data.duration_ms / 1000).toFixed(1)}s` : 'ongoing',
          analysis: data.data.call_analysis?.custom_analysis_data || {}
        }
      };
      setEvents(prev => [simplifiedData, ...prev].slice(0, 10)); // Keep only last 10 events
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          Talk TUAH - AI Call Assistant
        </h1>
        
        {health && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Service Status: 
              <span className="ml-2 text-green-600">{health.status}</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="font-medium text-gray-700">Inbound Bot</div>
                <div className="text-sm text-gray-600">{health.services?.bot1}</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="font-medium text-gray-700">Consent Bot</div>
                <div className="text-sm text-gray-600">{health.services?.bot2}</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="font-medium text-gray-700">Confirmation Bot</div>
                <div className="text-sm text-gray-600">{health.services?.bot3}</div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Recent Calls</h2>
          {events.map((event, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  {event.type}
                </span>
                <span className="text-sm text-gray-500">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium">Call ID:</span> {event.callDetails.id}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Status:</span> {event.callDetails.status}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Duration:</span> {event.callDetails.duration}
                </div>
                {Object.keys(event.callDetails.analysis).length > 0 && (
                  <div className="mt-2 p-2 bg-gray-50 rounded">
                    <div className="text-sm font-medium mb-1">Analysis:</div>
                    {Object.entries(event.callDetails.analysis).map(([key, value]) => (
                      <div key={key} className="text-sm">
                        <span className="font-medium">{key}:</span> {JSON.stringify(value)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default App
