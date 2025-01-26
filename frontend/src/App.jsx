import { useState, useEffect, useCallback } from 'react'
import { seatMap } from './seatMap.js'  // Make sure to include the .js extension
import axios from 'axios'

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
  const [originalSeat, setOriginalSeat] = useState(null);
  const [requestedSeat, setRequestedSeat] = useState(null);
  const [seatSwitchPending, setSeatSwitchPending] = useState(false);

  // **1. Define handleSeatSwitch before useEffect**
  // Function to handle seat switching
  const handleSeatSwitch = useCallback((oldSeat, newSeat) => {
    console.log('🛠️ Handling seat switch:', { oldSeat, newSeat });
    
    // Validate seat format
    const isValidSeat = (seat) => /^[A-F]\d{1,2}$/.test(seat);
    if (!isValidSeat(oldSeat) || !isValidSeat(newSeat)) {
      console.error('❌ Invalid seat format:', { oldSeat, newSeat });
      return;
    }

    setFlightData(prev => ({
      ...prev,
      seats: {
        ...prev.seats,
        [oldSeat]: { ...prev.seats[oldSeat], occupied: false, passenger: null },
        [newSeat]: { ...prev.seats[newSeat], occupied: true, passenger: "Mr. Khan" }
      }
    }));
    setOriginalSeat(newSeat);

    // Format seat for backend (convert from "A12" to "12A")
    const formatForBackend = (seat) => {
      const letter = seat[0];
      const number = seat.slice(1);
      return `${number}${letter}`;
    };

    axios.post('/api/update-seat', { newSeat: formatForBackend(newSeat) })
      .then(response => {
        console.log('✅ Seat updated successfully:', response.data.seat);
      })
      .catch(error => {
        console.error('❌ Error updating seat:', error);
      });
  }, []);

  // **2. Fetch the current seat from the backend when the component mounts**
  useEffect(() => {
    console.log('🚀 Fetching current seat...');
    axios.get('/api/current-seat')
      .then(response => {
        const seatId = response.data.seat;
        console.log('📍 Current seat fetched:', {
          rawSeat: seatId,
          seatExists: seatId in flightData.seats
        });
        
        if (seatId) {
          setOriginalSeat(seatId);
          setFlightData(prev => ({
            ...prev,
            seats: {
              ...prev.seats,
              [seatId]: {
                ...prev.seats[seatId],
                occupied: true,
                passenger: "Mr. Khan"
              }
            }
          }));
        }
      })
      .catch(error => {
        console.error('❌ Error fetching current seat:', error);
      });
  }, []);

  // **3. Handle Server-Sent Events (SSE)**
  useEffect(() => {
    const eventSource = new EventSource('/events');
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('\n🎯 SSE Event Received:', data);

      switch(data.type) {
        case 'call_started':
        case 'call_ended':
        case 'call_analyzed':
          // Check if we already have an event of this type with this call ID
          setEvents(prev => {
            const existingEvent = prev.find(e => 
              e.callDetails.id === data.data.call_id && 
              e.type === data.type
            );
            
            if (existingEvent) {
              console.log('📝 Duplicate event detected, skipping:', {
                type: data.type,
                call_id: data.data.call_id
              });
              return prev;
            }

            return [{
              type: data.type,
              timestamp: data.timestamp,
              callDetails: {
                id: data.data.call_id,
                status: data.data.status,
                duration: data.data.duration_seconds ? 
                         `${Math.round(data.data.duration_seconds)}s` : 'N/A',
                sentiment: data.data.sentiment || 'neutral',
                transcript: data.data.transcript || '',
                customData: data.data.custom_data || {},
                summary: data.data.summary || ''
              }
            }, ...prev];
          });
          break;

        case 'SEAT_SWITCH_REQUESTED':
          console.log('🔄 Seat Switch Requested:', data.data);
          setRequestedSeat(data.data.requestedSeat);
          setSeatSwitchPending(true);
          
          setFlightData(prev => ({
            ...prev,
            seats: {
              ...prev.seats,
              [data.data.currentSeat]: {
                ...prev.seats[data.data.currentSeat],
                pending: true
              },
              [data.data.requestedSeat]: {
                ...prev.seats[data.data.requestedSeat],
                pending: true
              }
            }
          }));
          break;

        case 'SEAT_SWITCH_CONFIRMED':
          console.log('✅ Seat Switch Confirmed:', data.data);
          if (data.data.success) {
            // Format seats to match frontend format (letter first)
            const formatSeat = (seat) => {
              const match = seat.match(/^(\d{1,2})([A-F])$/);
              return match ? `${match[2]}${match[1]}` : seat;
            };

            const oldSeat = formatSeat(data.data.oldSeat);
            const newSeat = formatSeat(data.data.newSeat);
            
            console.log('🔄 Updating seats:', { oldSeat, newSeat });
            
            setFlightData(prev => ({
              ...prev,
              seats: {
                ...prev.seats,
                [oldSeat]: {
                  ...prev.seats[oldSeat],
                  occupied: true,
                  passenger: "Previous Passenger",
                  pending: false,
                  highlighted: false
                },
                [newSeat]: {
                  ...prev.seats[newSeat],
                  occupied: true,
                  passenger: "Mr. Khan",
                  pending: false,
                  highlighted: true
                }
              }
            }));
            
            setOriginalSeat(newSeat);
            setSeatSwitchPending(false);
            setRequestedSeat(null);
          }
          break;

        default:
          console.log('ℹ️ Unhandled event type:', data.type);
      }

      // Log current state after processing
      console.log('📊 Current State:', {
        originalSeat,
        requestedSeat,
        seatSwitchPending,
        timestamp: new Date().toISOString()
      });
    };

    eventSource.onerror = (error) => {
      console.error('❌ SSE Error:', error);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // **4. Logging for handleSeatSwitch**
  // This is already included within handleSeatSwitch via console.log

  // **5. Render Seat Map Function**
  const renderSeatMap = () => {
    const rows = [];
    const totalRows = 30;
    const midPoint = 17; // Split at row 15

    // Helper function to get seat class style
    const getSeatStyle = (seatClass, isOccupied, seatId) => {
      const baseStyle = "w-8 h-8 rounded flex flex-col items-center justify-center text-xs transition-all duration-500";
      
      // Check if this is the current user's seat
      if (seatId === originalSeat || flightData.seats[seatId]?.highlighted) {
        return `${baseStyle} bg-yellow-100 border-2 border-yellow-400 ${
          seatSwitchPending ? 'animate-pulse' : ''
        }`;
      }
      
      // Requested seat - with gentle glow animation
      if (seatId === requestedSeat && seatSwitchPending) {
        return `${baseStyle} bg-blue-200 border-2 border-blue-400 animate-pulse`;
      }
      
      // Different shades for occupied seats with fade transition
      if (isOccupied) {
        switch (seatClass) {
          case 'first':
            return `${baseStyle} bg-red-300 text-red-900 transform hover:scale-105`;
          case 'extra':
            return `${baseStyle} bg-red-200 text-red-900 transform hover:scale-105`;
          default:
            return `${baseStyle} bg-red-100 text-red-800 transform hover:scale-105`;
        }
      }
      
      // Available seats with hover effect
      switch (seatClass) {
        case 'first':
          return `${baseStyle} bg-purple-100 text-purple-800 hover:bg-purple-200`;
        case 'extra':
          return `${baseStyle} bg-blue-100 text-blue-800 hover:bg-blue-200`;
        default:
          return `${baseStyle} bg-green-100 text-green-800 hover:bg-green-200`;
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
          
          {row <= 4 ? (
            // First Class 2-2 config
            <div className="flex w-full justify-center">
              {/* Left side first class */}
              <div className="flex gap-1">
                {['A', 'C'].map(letter => (
                  <div
                    key={`${letter}${row}`}
                    className={getSeatStyle('first', flightData.seats[`${letter}${row}`]?.occupied, `${letter}${row}`)}
                  >
                    <div className="text-xs font-bold">{letter}{row}</div>
                    {!flightData.seats[`${letter}${row}`]?.occupied && (
                      <div className="text-[8px] text-gray-600">
                        {flightData.seats[`${letter}${row}`]?.price}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Aisle */}
              <div className="w-16"></div>
              
              {/* Right side first class */}
              <div className="flex gap-1">
                {['D', 'F'].map(letter => (
                  <div
                    key={`${letter}${row}`}
                    className={getSeatStyle('first', flightData.seats[`${letter}${row}`]?.occupied, `${letter}${row}`)}
                  >
                    <div className="text-xs font-bold">{letter}{row}</div>
                    {!flightData.seats[`${letter}${row}`]?.occupied && (
                      <div className="text-[8px] text-gray-600">
                        {flightData.seats[`${letter}${row}`]?.price}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Regular 3-3 config
            <div className="flex w-full">
              <div className="flex gap-1">
                {['A', 'B', 'C'].map(letter => (
                  <div
                    key={`${letter}${row}`}
                    className={getSeatStyle(
                      row <= 12 ? 'extra' : 'economy',
                      flightData.seats[`${letter}${row}`]?.occupied,
                      `${letter}${row}`
                    )}
                  >
                    <div className="text-xs font-bold">{letter}{row}</div>
                    {!flightData.seats[`${letter}${row}`]?.occupied && (
                      <div className="text-[8px] text-gray-600">
                        {flightData.seats[`${letter}${row}`]?.price}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Aisle */}
              <div className="w-16"></div>
              
              <div className="flex gap-1">
                {['D', 'E', 'F'].map(letter => (
                  <div
                    key={`${letter}${row}`}
                    className={getSeatStyle(
                      row <= 12 ? 'extra' : 'economy',
                      flightData.seats[`${letter}${row}`]?.occupied,
                      `${letter}${row}`
                    )}
                  >
                    <div className="text-xs font-bold">{letter}{row}</div>
                    {!flightData.seats[`${letter}${row}`]?.occupied && (
                      <div className="text-[8px] text-gray-600">
                        {flightData.seats[`${letter}${row}`]?.price}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
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

  // Add debug logging for originalSeat changes
  useEffect(() => {
    console.log('🔍 Original Seat Changed:', originalSeat);
  }, [originalSeat]);

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
                  TalkTuahAirline
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
                            event.type === 'call_analyzed' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-purple-100 text-purple-800'}`}>
                          {event.type.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      {event.callDetails?.transcript && (
                        <button
                          onClick={() => setSelectedCall(event)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          View Details
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <span className="text-xs text-gray-500">Call ID</span>
                          <p className="text-sm font-medium text-gray-900">
                            {event.callDetails.id.slice(-6)}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500">Status</span>
                          <p className="text-sm font-medium text-gray-900">
                            {event.callDetails.status}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500">Duration</span>
                          <p className="text-sm font-medium text-gray-900">
                            {event.callDetails.duration}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500">Sentiment</span>
                          <p className="text-sm font-medium text-gray-900">
                            {event.callDetails.sentiment}
                          </p>
                        </div>
                        {Object.entries(event.callDetails.customData || {}).map(([key, value]) => (
                          <div key={key}>
                            <span className="text-xs text-gray-500">{key.replace(/_/g, ' ').toUpperCase()}</span>
                            <p className="text-sm font-medium text-gray-900">
                              {typeof value === 'boolean' ? value.toString() : value}
                            </p>
                          </div>
                        ))}
                      </div>
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
