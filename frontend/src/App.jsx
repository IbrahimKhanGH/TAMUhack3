import { useState, useEffect } from 'react'
import { seatMap } from './seatMap.js'  // Make sure to include the .js extension

function App() {
  const [events, setEvents] = useState([]);
  const [health, setHealth] = useState(null);
  const [selectedCall, setSelectedCall] = useState(null);
  const [activeTab, setActiveTab] = useState('calls'); // 'calls' or 'demo'
  const [flightData, setFlightData] = useState({
    flightNumber: 'AA2093',
    departure: 'DFW',
    arrival: 'SFO',
    departureTime: '7:22 AM',
    arrivalTime: '9:26 AM',
    duration: '4h 04m',
    date: '2024-02-13',
    aircraft: 'Boeing 737 MAX 8',
    terminal: {
      departure: 'Terminal D',
      arrival: 'Terminal 1'
    },
    gate: {
      departure: 'D23',
      arrival: 'B6'
    },
    amenities: {
      meal: 'Food for purchase',
      wifi: true,
      power: true,
      entertainment: true
    },
    seats: seatMap.seats
  });

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
          transcript: data.data.transcript,
          analysis: data.data.call_analysis?.custom_analysis_data || {}
        }
      };
      setEvents(prev => [simplifiedData, ...prev].slice(0, 10)); // Keep only last 10 events
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const renderSeatMap = () => {
    const rows = [];
    const totalRows = 30;
    const midPoint = 17; // Split at row 15

    // Helper function to get seat class style
    const getSeatStyle = (seatClass, isOccupied, isYourSeat) => {
      const baseStyle = "w-8 h-8 rounded flex flex-col items-center justify-center text-xs";
      if (isYourSeat) return `${baseStyle} bg-yellow-100 border-2 border-yellow-400`;
      if (isOccupied) return `${baseStyle} bg-red-100 text-red-800`;
      
      switch (seatClass) {
        case 'first':
          return `${baseStyle} bg-purple-100 text-purple-800`;
        case 'extra':
          return `${baseStyle} bg-blue-100 text-blue-800`;
        default:
          return `${baseStyle} bg-green-100 text-green-800`;
      }
    };

    // Helper function to render a single row
    const renderRow = (row) => {
      // Skip rows 5-7 as they don't exist on American Airlines
      if (row >= 5 && row <= 7) return null;

      return (
        <div key={row} className="flex gap-1 mb-1">
          <div className="w-6 flex items-center justify-center text-xs text-gray-500">
            {row}
          </div>
          <div className="flex gap-1">
            {row <= 4 ? (
              // First Class 2-2 config
              <>
                <div className="w-4"></div>
                {['A', 'C'].map(letter => (
                  <div
                    key={`${letter}${row}`}
                    className={getSeatStyle('first', flightData.seats[`${letter}${row}`]?.occupied, `${letter}${row}` === 'A12')}
                  >
                    <div className="text-xs font-bold">{letter}{row}</div>
                  </div>
                ))}
                <div className="w-4"></div>
              </>
            ) : (
              // Regular 3-3 config
              ['A', 'B', 'C'].map(letter => (
                <div
                  key={`${letter}${row}`}
                  className={getSeatStyle(
                    row <= 12 ? 'extra' : 'economy',
                    flightData.seats[`${letter}${row}`]?.occupied,
                    `${letter}${row}` === 'A12'
                  )}
                >
                  <div className="text-xs font-bold">{letter}{row}</div>
                </div>
              ))
            )}
          </div>
          <div className="w-16"></div>
          <div className="flex gap-1">
            {row <= 4 ? (
              // First Class 2-2 config
              <>
                <div className="w-4"></div>
                {['D', 'F'].map(letter => (
                  <div
                    key={`${letter}${row}`}
                    className={getSeatStyle('first', flightData.seats[`${letter}${row}`]?.occupied, `${letter}${row}` === 'A12')}
                  >
                    <div className="text-xs font-bold">{letter}{row}</div>
                  </div>
                ))}
                <div className="w-4"></div>
              </>
            ) : (
              // Regular 3-3 config
              ['D', 'E', 'F'].map(letter => (
                <div
                  key={`${letter}${row}`}
                  className={getSeatStyle(
                    row <= 12 ? 'extra' : 'economy',
                    flightData.seats[`${letter}${row}`]?.occupied,
                    `${letter}${row}` === 'A12'
                  )}
                >
                  <div className="text-xs font-bold">{letter}{row}</div>
                </div>
              ))
            )}
          </div>
        </div>
      );
    };

    return (
      <div className="flex gap-8">
        {/* Front half of plane */}
        <div className="relative">
          <div className="absolute -left-6 top-0 h-full w-1 bg-blue-200 rounded-t-full"></div>
          <div className="mb-2 text-sm text-blue-800 font-medium">Front of Aircraft</div>
          {Array.from({ length: midPoint }, (_, i) => i + 1)
            .map(row => renderRow(row))
            .filter(Boolean)} {/* Filter out null values from skipped rows */}
        </div>

        {/* Back half of plane */}
        <div className="relative">
          <div className="absolute -right-6 top-0 h-full w-1 bg-blue-200 rounded-b-full"></div>
          <div className="mb-2 text-sm text-blue-800 font-medium">Rear of Aircraft</div>
          {Array.from({ length: totalRows - midPoint }, (_, i) => i + midPoint + 1)
            .map(row => renderRow(row))
            .filter(Boolean)} {/* Filter out null values from skipped rows */}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-800">
      {/* Header with Navigation */}
      <header className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              {/* Logo and Title */}
              <div className="flex items-center space-x-4">
                <img 
                  src="https://www.aa.com/content/images/chrome/rebrand/aa-logo.png" 
                  alt="American Airlines" 
                  className="h-8"
                />
                <h1 className="text-2xl font-bold text-blue-900">
                  Talk TuAAh
                </h1>
              </div>

              {/* Navigation Tabs - Moved inline */}
              <nav className="flex space-x-4">
                <button
                  onClick={() => setActiveTab('calls')}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    activeTab === 'calls'
                      ? 'bg-blue-100 text-blue-800'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Call Logs
                </button>
                <button
                  onClick={() => setActiveTab('demo')}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    activeTab === 'demo'
                      ? 'bg-blue-100 text-blue-800'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Flight Demo
                </button>
              </nav>
            </div>

            {/* System Status */}
            {health && (
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span className="text-sm text-gray-600">System Online</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4">
        {activeTab === 'calls' ? (
          <div>
            {/* Service Status Cards */}
            {health && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {Object.entries(health.services || {}).map(([key, value]) => (
                  <div key={key} className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="bg-blue-50 px-4 py-2">
                      <h3 className="font-semibold text-blue-900">
                        {key === 'bot1' ? 'Inbound Bot' : 
                         key === 'bot2' ? 'Consent Bot' : 'Confirmation Bot'}
                      </h3>
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-sm text-gray-600">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Call Events */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
                <h2 className="text-xl font-semibold text-blue-900">Recent Calls</h2>
              </div>
              
              <div className="divide-y divide-gray-100">
                {events.map((event, index) => (
                  <div key={index} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium
                          ${event.type === 'call_started' ? 'bg-blue-100 text-blue-800' :
                            event.type === 'call_ended' ? 'bg-green-100 text-green-800' :
                            'bg-purple-100 text-purple-800'}`}>
                          {event.type.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <button
                        onClick={() => setSelectedCall(event)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        View Details
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <span className="text-xs text-gray-500">Call ID</span>
                          <p className="text-sm font-medium text-gray-900">{event.callDetails.id.slice(-6)}</p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500">Status</span>
                          <p className="text-sm font-medium text-gray-900">{event.callDetails.status}</p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500">Duration</span>
                          <p className="text-sm font-medium text-gray-900">{event.callDetails.duration}</p>
                        </div>
                      </div>

                      {Object.keys(event.callDetails.analysis).length > 0 && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                          <h4 className="text-sm font-medium text-gray-900 mb-2">Analysis Results</h4>
                          <div className="grid grid-cols-2 gap-4">
                            {Object.entries(event.callDetails.analysis).map(([key, value]) => (
                              <div key={key}>
                                <span className="text-xs text-gray-500">{key.replace('_', ' ')}</span>
                                <p className="text-sm font-medium text-gray-900">{JSON.stringify(value)}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-4">
            <div className="flex gap-6">
              {/* Flight Info (Left Side) */}
              <div className="w-1/3">
                <h2 className="text-xl font-bold text-blue-900 mb-3">Flight Details</h2>
                
                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Flight</h3>
                    <p className="text-2xl font-bold">{flightData.flightNumber}</p>
                    <p className="text-sm text-gray-600">{flightData.aircraft}</p>
                  </div>

                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Departure</h3>
                      <p className="text-2xl font-bold">{flightData.departure}</p>
                      <p className="text-sm text-gray-600">{flightData.terminal.departure}</p>
                      <p className="text-sm text-gray-600">Gate {flightData.gate.departure}</p>
                      <p className="text-base font-medium">{flightData.departureTime}</p>
                    </div>
                    
                    {/* Duration in middle */}
                    <div className="flex flex-col items-center justify-center mt-6">
                      <p className="text-sm text-gray-500">Duration</p>
                      <div className="flex items-center">
                        <span className="text-sm font-medium">→</span>
                        <p className="text-sm font-medium mx-2">{flightData.duration}</p>
                        <span className="text-sm font-medium">→</span>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Arrival</h3>
                      <p className="text-2xl font-bold">{flightData.arrival}</p>
                      <p className="text-sm text-gray-600">{flightData.terminal.arrival}</p>
                      <p className="text-sm text-gray-600">Gate {flightData.gate.arrival}</p>
                      <p className="text-base font-medium">{flightData.arrivalTime}</p>
                    </div>
                  </div>

                  <div className="mt-2">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Amenities & Services</h3>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm">✈️ Food for Purchase</p>
                      </div>
                      <div className="text-sm text-gray-500">$10 - $15</div>

                      <div className="flex items-center justify-between">
                        <p className="text-sm">📶 Wi-Fi</p>
                      </div>
                      <div className="text-sm">
                        <span className="font-medium text-blue-800">$19</span>
                        <span className="text-gray-500 text-xs"> / flight</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-sm">🔌 Power Outlets</p>
                      </div>
                      <div className="text-sm text-gray-500">Complimentary</div>

                      <div className="flex items-center justify-between">
                        <p className="text-sm">📱 Entertainment</p>
                      </div>
                      <div className="text-sm">
                        <span className="font-medium text-blue-800">$12</span>
                        <span className="text-gray-500 text-xs"> / flight</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-sm">🥨 Snacks</p>
                      </div>
                      <div className="text-sm text-gray-500">$4 - $10</div>

                      <div className="flex items-center justify-between">
                        <p className="text-sm">🍷 Alcoholic Beverages</p>
                      </div>
                      <div className="text-sm text-gray-500">$9 - $12</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Vertical Divider */}
              <div className="w-px bg-gray-200"></div>

              {/* Seat Map (Right Side) */}
              <div className="w-2/3">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-blue-900">Seat Map</h2>
                  
                  {/* More compact legend */}
                  <div className="flex gap-3 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-purple-100"></div>
                      <span>First</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-blue-100"></div>
                      <span>Extra</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-green-100"></div>
                      <span>Main</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-red-100"></div>
                      <span>Occupied</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-yellow-100 border-2 border-yellow-400"></div>
                      <span>Your Seat</span>
                    </div>
                  </div>
                </div>

                {/* Seat Map */}
                <div className="overflow-x-auto">
                  <div className="inline-block">
                    {renderSeatMap()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Transcript Modal */}
      {selectedCall && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Call Transcript</h3>
              <button 
                onClick={() => setSelectedCall(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              {selectedCall.callDetails.transcript?.split('\n').map((line, i) => (
                <p key={i} className="mb-2">
                  <span className="font-medium">
                    {line.startsWith('Agent:') ? 'Agent: ' : 
                     line.startsWith('User:') ? 'User: ' : ''}
                  </span>
                  <span className="text-gray-700">
                    {line.replace(/^(Agent:|User:)/, '')}
                  </span>
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
