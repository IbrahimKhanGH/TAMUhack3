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
const consentCallToOriginalRequest = new Map();
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
    console.log(`📞 Triggering ${isConsentCall ? 'Consent' : 'Confirmation'} call for call_id: ${currentSeatHolder.requestId}`);
    let dynamicVariables;
    let fromNumber;
    let toNumber;
    
    if (isConsentCall) {
      fromNumber = "+14699723435";
      toNumber = "+19035700044";  // Your number for consent demo
      dynamicVariables = {
        passenger_name: "Ibrahim",
        current_seat: String(currentSeatHolder.requested_seat),
        requested_seat: String(currentSeatHolder.current_seat),
        switch_reason: String(currentSeatHolder.reason)
      };
    } else {
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

    console.log(`📞 Outbound ${isConsentCall ? 'Consent' : 'Confirmation'} Call Created:`, response);
    
    if (isConsentCall) {
      // Map the consent call ID to the original seat switch request ID
      consentCallToOriginalRequest.set(response.call_id, currentSeatHolder.requestId);
      console.log(`🔗 Mapped consent call_id ${response.call_id} to original request_id ${currentSeatHolder.requestId}`);
    }
    
    return response;
  } catch (error) {
    console.error(`❌ Failed to create outbound ${isConsentCall ? 'Consent' : 'Confirmation'} call:`, error);
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
app.post("/webhook", async (req, res) => {
  const { event, call } = req.body;
  
  console.log('\n=== 🎯 Webhook Event Details ===');
  console.log('Event Type:', event);
  console.log('Call ID:', call.call_id);
  console.log('Bot Type:', call.metadata?.bot_type);
  console.log('Timestamps:', {
    start: call.start_timestamp,
    end: call.end_timestamp,
    duration: call.end_timestamp ? (call.end_timestamp - call.start_timestamp) / 1000 : 'N/A'
  });

  switch (event) {
    case "call_started":
      console.log('\n📞 Call Started Data:', {
        call_id: call.call_id,
        bot_type: call.metadata?.bot_type,
        variables: call.retell_llm_dynamic_variables
      });

      sendEventToClients({
        type: event,
        timestamp: new Date().toISOString(),
        data: {
          call_id: call.call_id,
          bot_type: call.metadata?.bot_type,
          duration_seconds: 0,
          status: 'Started'
        }
      });
      break;
      
    case "call_ended":
      console.log('\n📞 Call Ended Data:', {
        call_id: call.call_id,
        bot_type: call.metadata?.bot_type,
        duration: (call.end_timestamp - call.start_timestamp) / 1000,
        reason: call.disconnection_reason
      });

      sendEventToClients({
        type: event,
        timestamp: new Date().toISOString(),
        data: {
          call_id: call.call_id,
          bot_type: call.metadata?.bot_type,
          duration_seconds: (call.end_timestamp - call.start_timestamp) / 1000,
          status: 'Ended',
          disconnection_reason: call.disconnection_reason
        }
      });
      break;
      
    case "call_analyzed":
      const analysis = call.call_analysis;
      
      console.log('\n🔍 Call Analysis Raw Data:', {
        call_id: call.call_id,
        bot_type: call.metadata?.bot_type,
        duration: call.end_timestamp ? (call.end_timestamp - call.start_timestamp) / 1000 : 'N/A',
        sentiment: analysis?.user_sentiment,
        custom_data: analysis?.custom_analysis_data,
        summary: analysis?.call_summary
      });

      // Handle Seat Switch Requests
      if (analysis.custom_analysis_data?.seat_switch_requested) {
        console.log('\n📝 New Seat Switch Request Detected');
        
        // Store the original request with formatted seats
        seatSwitchRequests.set(call.call_id, {
          requestId: call.call_id,
          caller_phone: call.from_number,
          current_seat: analysis.custom_analysis_data.current_seat_number,
          requested_seat: analysis.custom_analysis_data.requested_seat_number,
          reason: analysis.custom_analysis_data.seat_switch_reason
        });
        
        // Send event to frontend about the request with formatted seats
        sendEventToClients({
          type: 'SEAT_SWITCH_REQUESTED',
          data: {
            currentSeat: formatSeatToFrontend(analysis.custom_analysis_data.current_seat_number),
            requestedSeat: formatSeatToFrontend(analysis.custom_analysis_data.requested_seat_number)
          }
        });
        
        // Trigger consent call
        try {
          await triggerOutboundCall(seatSwitchRequests.get(call.call_id), true);
        } catch (error) {
          console.error('❌ Error triggering consent call:', error);
        }
      }

      // Handle Confirmation Calls based on consent call's call_id
      if (call.metadata?.bot_type === 'outbound_consent') {
        const consentCallId = call.call_id;
        const originalRequestId = consentCallToOriginalRequest.get(consentCallId);
        
        if (originalRequestId) {
          const originalRequest = seatSwitchRequests.get(originalRequestId);
          
          if (originalRequest) {
            console.log('✨ Processing confirmation call for original_request_id:', originalRequestId);
            
            // Trigger confirmation call
            try {
              await triggerOutboundCall(originalRequest, false);
            } catch (error) {
              console.error('❌ Error triggering confirmation call:', error);
            }
            
            // Remove the mapping after triggering
            consentCallToOriginalRequest.delete(consentCallId);
          }
        } else {
          console.warn(`⚠️ No original_request_id found for consent_call_id: ${consentCallId}`);
        }
      }

      // Handle Confirmation Call Analysis
      if (call.metadata?.bot_type === 'outbound_confirmation') {
        const originalRequestId = call.metadata.original_request_id;
        const originalRequest = seatSwitchRequests.get(originalRequestId);
        
        if (originalRequest) {
          console.log('✅ Seat Switch Confirmed for original_request_id:', originalRequestId);
          
          // Send SEAT_SWITCH_CONFIRMED event to frontend
          sendEventToClients({
            type: 'SEAT_SWITCH_CONFIRMED',
            data: {
              success: analysis?.call_successful,
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

      // Send call_analyzed event to frontend
      sendEventToClients({
        type: event,
        timestamp: new Date().toISOString(),
        data: {
          call_id: call.call_id,
          bot_type: call.metadata?.bot_type || 'unknown',
          duration_seconds: call.end_timestamp ? 
            (call.end_timestamp - call.start_timestamp) / 1000 : null,
          status: 'Analyzed',
          sentiment: analysis?.user_sentiment || 'neutral',
          transcript: call.transcript || '',
          custom_data: analysis?.custom_analysis_data || {},
          summary: analysis?.call_summary || '',
          call_successful: analysis?.call_successful,
          in_voicemail: analysis?.in_voicemail,
          agent_task_completion: analysis?.agent_task_completion_rating,
          call_completion: analysis?.call_completion_rating
        }
      });

      console.log('\n📤 Sending to Frontend:', JSON.stringify({
        type: event,
        timestamp: new Date().toISOString(),
        data: {
          call_id: call.call_id,
          bot_type: call.metadata?.bot_type || 'unknown',
          duration_seconds: call.end_timestamp ? 
            (call.end_timestamp - call.start_timestamp) / 1000 : null,
          status: 'Analyzed',
          sentiment: analysis?.user_sentiment || 'neutral',
          transcript: call.transcript || '',
          custom_data: analysis?.custom_analysis_data || {},
          summary: analysis?.call_summary || '',
          call_successful: analysis?.call_successful,
          in_voicemail: analysis?.in_voicemail,
          agent_task_completion: analysis?.agent_task_completion_rating,
          call_completion: analysis?.call_completion_rating
        }
      }, null, 2));

      break;
      
    default:
      console.log(JSON.stringify({ type: "UNKNOWN_EVENT", event }, null, 2));
  }

  res.status(204).send();
});

// Alert Call Endpoint
app.post("/api/trigger-alert", async (req, res) => {
  try {
    const {
      caller_name,
      flight_number,
      alert_type,
      reason_for_change,
      gate_number,
      estimated_delay_duration,
      confidence_level,
      new_departure_time,
      recommendation
    } = req.body;

    console.log('\n🚨 Triggering Alert Call with variables:', {
      caller_name,
      flight_number,
      alert_type,
      reason_for_change
    });

    // Create the outbound call using Retell client
    const response = await client.call.createPhoneCall({
      from_number: "+19726946749",
      to_number: "+19035700044",
      retell_llm_dynamic_variables: {
        caller_name: caller_name || "valued passenger",
        flight_number: flight_number || "AA2093",
        alert_type: alert_type || "delay",
        reason_for_change: reason_for_change || "weather conditions",
        gate_number: gate_number || "not available",
        estimated_delay_duration: estimated_delay_duration || "unknown",
        confidence_level: confidence_level || "medium",
        new_departure_time: new_departure_time || "to be determined",
        recommendation: recommendation || "stay tuned for updates"
      },
      metadata: {
        bot_type: "alert_bot",
        alert_type: alert_type
      }
    });

    console.log('📞 Alert Call Created:', {
      call_id: response.call_id,
      status: response.status
    });

    res.json({
      success: true,
      message: "Alert call triggered successfully",
      call_id: response.call_id
    });

  } catch (error) {
    console.error('❌ Error triggering alert call:', error);
    res.status(500).json({
      success: false,
      message: "Failed to trigger alert call",
      error: error.message
    });
  }
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