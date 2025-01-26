require('dotenv').config();
const express = require('express');
const Retell = require('retell-sdk').default;

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Initialize Retell client
const client = new Retell({
  apiKey: process.env.RETELL_API_KEY
});

const activeRequests = new Map();
const seatSwitchRequests = new Map();
const processedConsents = new Set();
const clients = new Set();

// Initialize with a properly formatted seat (letter first)
let currentUserSeat = 'B14';

function formatSeatToFrontend(seat) {
  // If already in frontend format (A12), return as is
  if (/^[A-F]\d{1,2}$/.test(seat)) {
    return seat;
  }
  // Convert from backend format (12A) to frontend format (A12)
  const match = seat.match(/^(\d{1,2})([A-F])$/);
  return match ? `${match[2]}${match[1]}` : seat;
}

function formatCallAnalysis(call) {
  const customData = call?.call_analysis?.custom_analysis_data;
  
  // Determine which type of analysis to return based on the data available
  const customAnalysis = customData?.seat_switch_consent !== undefined
    ? {
        // Bot #2 (Outbound Consent) format
        seat_switch_consent: customData.seat_switch_consent
      }
    : {
        // Bot #1 (Inbound Request) format
        seat_switch_requested: customData.seat_switch_requested,
        current_seat: customData.current_seat_number,
        requested_seat: customData.requested_seat_number,
        switch_reason: customData.seat_switch_reason
      };

  return {
    customAnalysis,
    generalInfo: {
      call_id: call.call_id,
      bot_type: call.metadata?.bot_type || 'unknown',
      duration: call.end_timestamp ? 
        `${(call.end_timestamp - call.start_timestamp) / 1000} seconds` : null,
      user_sentiment: call.call_analysis?.user_sentiment,
      transcript: call.transcript
    }
  };
}

// Endpoint to get the current user's seat
app.get('/api/current-seat', (req, res) => {
  console.log('Current seat requested:', currentUserSeat);
  // Format and validate the seat
  const formattedSeat = formatSeatToFrontend(currentUserSeat);
  const isValidSeat = /^[A-F]\d{1,2}$/.test(formattedSeat);
  
  if (!isValidSeat) {
    console.error('❌ Invalid seat format:', currentUserSeat);
    currentUserSeat = 'A12'; // Reset to a valid seat (letter first)
  } else {
    currentUserSeat = formattedSeat; // Update to formatted version if valid
  }
  
  res.json({ seat: currentUserSeat });
});

// Endpoint to update the current user's seat
app.post('/api/update-seat', (req, res) => {
  const { newSeat } = req.body;
  const previousSeat = currentUserSeat;
  
  // Validate the new seat format
  const formattedNewSeat = formatSeatToFrontend(newSeat);
  if (!/^[A-F]\d{1,2}$/.test(formattedNewSeat)) {
    console.error('❌ Invalid seat format:', formattedNewSeat);
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid seat format' 
    });
  }
  
  // Store in frontend format (letter first)
  currentUserSeat = formattedNewSeat;
  console.log(`\n🔄 Seat updated from ${previousSeat} to ${currentUserSeat}`);
  
  // Send event to clients with both seats' information
  sendEventToClients({
    type: 'SEAT_UPDATED',
    data: {
      previousSeat: previousSeat,
      newSeat: currentUserSeat,
      seatSwap: {
        [previousSeat]: { 
          occupied: true, 
          passenger: "Original Passenger",
          class: "economy", // Add default class
          price: "$0" // Add default price
        },
        [currentUserSeat]: { 
          occupied: true, 
          passenger: "Mr. Khan",
          class: "economy", // Add default class
          price: "$0" // Add default price
        }
      }
    }
  });

  res.json({ success: true, seat: currentUserSeat });
});

// Endpoint for dynamic variables webhook
app.post("/dynamic-variables", (req, res) => {
  const { from_number, to_number, llm_id } = req.body;
  
  console.log('\n📱 Dynamic Variables Request:', {
    from: from_number,
    to: to_number,
    llm_id: llm_id
  });

  // Store the phone number for later outbound calls
  return res.json({
    caller_phone: from_number,
    caller_name: "User" // You would typically get this from your database
  });
});

async function triggerOutboundCall(currentSeatHolder, isConsentCall = false) {
  try {
    let dynamicVariables;
    let fromNumber;
    let toNumber;
    
    if (isConsentCall) {
      // For Bot #2 (Consent Bot)
      fromNumber = "+14699723435";
      toNumber = "+19035700044";  // Your number for consent demo
      dynamicVariables = {
        passenger_name: "Ibrahim",
        current_seat: String(currentSeatHolder.requested_seat),
        requested_seat: String(currentSeatHolder.current_seat),
        switch_reason: String(currentSeatHolder.reason)
      };
    } else {
      // For Bot #3 (Confirmation/News Bot)
      fromNumber = "+14697463182";
      toNumber = currentSeatHolder.caller_phone;
      dynamicVariables = {
        original_seat: String(currentSeatHolder.current_seat),
        requested_seat: String(currentSeatHolder.requested_seat),
        consent_given: String(currentSeatHolder.consent_result),
        denial_message: currentSeatHolder.consent_result ? "" : "Unfortunately, the passenger declined the seat switch request."
      };
    }

    const response = await client.call.createPhoneCall({
      from_number: fromNumber,
      to_number: toNumber,
      retell_llm_dynamic_variables: dynamicVariables,
      metadata: {
        bot_type: isConsentCall ? "outbound_consent" : "outbound_confirmation",
        original_request_id: currentSeatHolder.requestId,
        consent_result: currentSeatHolder.consent_result
      }
    });

    console.log('\n�� Outbound Call Triggered:', {
      type: 'OUTBOUND_CALL_CREATED',
      call_id: response.call_id,
      bot_type: isConsentCall ? 'Bot #2 (Consent)' : 'Bot #3 (Confirmation)',
      from_number: fromNumber,
      to_number: toNumber,
      variables: dynamicVariables,
      metadata: {
        bot_type: isConsentCall ? "outbound_consent" : "outbound_confirmation",
        original_request_id: currentSeatHolder.requestId,
        consent_result: currentSeatHolder.consent_result
      }
    });

    return response;
  } catch (error) {
    console.error('❌ Failed to trigger outbound call:', error);
    throw error;
  }
}

// Add this endpoint for SSE
app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  clients.add(res);
  req.on('close', () => clients.delete(res));
});

function sendEventToClients(eventData) {
  clients.forEach(client => {
    client.write(`data: ${JSON.stringify(eventData)}\n\n`);
  });
}

// Webhook endpoint
app.post("/webhook", (req, res) => {
  const { event, call } = req.body;
  
  // Send the event data to all connected clients
  sendEventToClients({
    type: event,
    timestamp: new Date().toISOString(),
    data: call
  });

  const eventData = {
    event_type: event,
    timestamp: new Date().toISOString(),
    call_id: call.call_id
  };

  console.log('\n=== Webhook Event ===');
  console.log(JSON.stringify(eventData, null, 2));

  switch (event) {
    case "call_started":
      const startData = {
        type: "CALL_START",
        bot_type: call.metadata?.bot_type || 'unknown',
        variables: call.retell_llm_dynamic_variables || {}
      };
      console.log(JSON.stringify(startData, null, 2));
      break;
      
    case "call_ended":
      const endData = {
        type: "CALL_END",
        duration_seconds: (call.end_timestamp - call.start_timestamp) / 1000,
        disconnection_reason: call.disconnection_reason
      };
      console.log(JSON.stringify(endData, null, 2));
      break;
      
    case "call_analyzed":
      const rawAnalysis = call.call_analysis;
      
      console.log('\n🔍 Processing Call Analysis:', {
        bot_type: call.metadata?.bot_type,
        call_id: call.call_id,
        has_consent_data: rawAnalysis.custom_analysis_data?.seat_switch_consent !== undefined,
        has_switch_request: rawAnalysis.custom_analysis_data?.seat_switch_requested === true
      });
      
      if (call.metadata?.bot_type === "outbound_consent") {
        const consent = rawAnalysis.custom_analysis_data?.seat_switch_consent;
        const originalRequestId = call.metadata?.original_request_id;
        
        console.log('🤝 Processing Consent:', {
          consent,
          originalRequestId
        });

        if (originalRequestId) {
          const originalRequest = seatSwitchRequests.get(originalRequestId);
          if (originalRequest) {
            // Store consent result
            originalRequest.consent_result = consent;
            
            // Always trigger confirmation call, regardless of consent result
            console.log('📞 Triggering confirmation call for:', {
              ...originalRequest,
              consent_result: consent ? 'approved' : 'denied'
            });
            
            // Trigger Bot #3 (Confirmation Call) with consent result
            triggerOutboundCall(originalRequest, false)
              .then(response => {
                console.log('✅ Confirmation call triggered:', response.call_id);
              })
              .catch(error => {
                console.error('❌ Failed to trigger confirmation call:', error);
              });
          } else {
            console.error('❌ Original request not found for ID:', originalRequestId);
          }
        }
      } else if (rawAnalysis.custom_analysis_data?.seat_switch_requested) {
        console.log('\n📝 New Seat Switch Request Detected');
        
        // Convert seat format (from 12A to A12)
        const formatToFrontend = (seat) => {
          const match = seat.match(/^(\d{1,2})([A-F])$/);
          return match ? `${match[2]}${match[1]}` : seat;
        };

        const currentSeat = formatToFrontend(rawAnalysis.custom_analysis_data.current_seat_number);
        const requestedSeat = formatToFrontend(rawAnalysis.custom_analysis_data.requested_seat_number);
        
        // Store the original request with formatted seats
        seatSwitchRequests.set(call.call_id, {
          requestId: call.call_id,
          caller_phone: call.from_number,
          current_seat: currentSeat,
          requested_seat: requestedSeat,
          reason: rawAnalysis.custom_analysis_data.seat_switch_reason
        });
        
        // Send event to frontend about the request with formatted seats
        sendEventToClients({
          type: 'SEAT_SWITCH_REQUESTED',
          data: {
            currentSeat: currentSeat,    // Now in A12 format
            requestedSeat: requestedSeat // Now in A12 format
          }
        });
        
        // Trigger consent call
        triggerOutboundCall(seatSwitchRequests.get(call.call_id), true);
      }

      console.log('\n🔍 Raw Analysis:');
      console.log(JSON.stringify(rawAnalysis, null, 2));

      // Format the analysis based on the data we received
      const analysisData = {
        type: "CALL_ANALYSIS",
        call_details: {
          id: call.call_id,
          bot_type: call.metadata?.bot_type || 'unknown',
          duration_seconds: (call.end_timestamp - call.start_timestamp) / 1000,
          sentiment: rawAnalysis.user_sentiment,
          success: rawAnalysis.call_successful
        },
        seat_request: rawAnalysis.custom_analysis_data?.seat_switch_requested ? {
          current_seat: rawAnalysis.custom_analysis_data.current_seat_number,
          requested_seat: rawAnalysis.custom_analysis_data.requested_seat_number,
          reason: rawAnalysis.custom_analysis_data.seat_switch_reason
        } : null,
        summary: rawAnalysis.call_summary,
        transcript: call.transcript
      };

      console.log('\n📊 Formatted Analysis:');
      console.log(JSON.stringify(analysisData, null, 2));

      if (call.metadata?.bot_type === 'outbound_confirmation') {
        console.log('✨ Processing confirmation call analysis');
        const originalRequestId = call.metadata?.original_request_id;
        
        if (originalRequestId) {
          const originalRequest = seatSwitchRequests.get(originalRequestId);
          if (originalRequest) {
            // Send SEAT_SWITCH_CONFIRMED event to frontend
            sendEventToClients({
              type: 'SEAT_SWITCH_CONFIRMED',
              data: {
                success: true,
                oldSeat: originalRequest.current_seat,
                newSeat: originalRequest.requested_seat
              }
            });

            // Update the current user's seat in backend (ensure frontend format)
            currentUserSeat = formatSeatToFrontend(originalRequest.requested_seat);
            console.log('🔄 Updated current seat to:', currentUserSeat);
            
            // Clean up the request
            seatSwitchRequests.delete(originalRequestId);
          }
        }
      }
      break;
      
    default:
      console.log(JSON.stringify({ type: "UNKNOWN_EVENT", event }, null, 2));
  }
  
  res.status(204).send();
});

// Basic health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "healthy",
    services: {
      bot1: "+14697271468",
      bot2: "+14699723435",
      bot3: "+14697463182"
    },
    name: "TalkTuahAirline"
  });
});

const PORT = process.env.PORT || 42069;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 