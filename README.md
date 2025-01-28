# TalkTuahAirlines

TalkTuahAirlines is a **multilingual, task-oriented AI assistant** that streamlines the airport experience. Designed for **stress-free** navigation, proactive seat-swapping, and real-time flight alerts, it communicates in **human-like voices** through phone calls—no extra apps or internet required.


## Inspiration
Airports can be intimidating, especially for first-timers or when dealing with long lines and seat-swapping hassles. TalkTuahAirlines aims to **eliminate** stress by offering a **proactive** assistant that feels more human than robotic. It blends **navigation, TSA guidance**, and **flight info** into a single, natural conversation.


## Key Features
- **Airport Navigation**  
  Provides directions to gates, restrooms, restaurants, and lounges. Answers queries like “Where’s the nearest coffee shop near Gate A12?”

- **Seat Swapping**  
  Calls the current seat holder, politely negotiates a switch, and notifies the requester of the outcome—no awkward confrontations.

- **Flight Information**  
  Offers real-time flight status, gate changes, and boarding times. Shares how full the flight is on request.

- **TSA Guidelines**  
  Advises on packing rules and security procedures (e.g., liquids limit, laptop rules).

- **Real-Time Alerts**  
  Automatically notifies users of delays, cancellations, or gate changes with recommended next steps.

- **Multilingual Support**  
  Handles English and Spanish calls via **Eleven Labs** for lifelike voice synthesis.

- **24/7 Availability**  
  Accessible through standard phone calls, without needing an app or internet.


## How It Works
- **Backend**  
  Built on Node.js to handle API calls, process tasks, and orchestrate seat swaps.
- **Frontend**  
  React with Tailwind CSS for a user-friendly interface.
- **Voice AI**  
  - Retell AI as a central wrapper  
  - GPT API for natural language tasks  
  - Twilio for phone call management  
  - Eleven Labs for voice synthesis in English & Spanish


## Challenges
- **Task-Oriented AI**  
  Orchestrating multi-step workflows (like seat-swapping) while maintaining smooth conversation.
- **Voice Integration**  
  Balancing **Twilio** and **Eleven Labs** to achieve a lifelike, warm tone.
- **Time Constraints**  
  Implementing core features—airport knowledge bases, seat-swapping logic—on a tight schedule.


## What I Learned
- **API Orchestration**: Combining multiple services for a seamless, human-like experience.  
- **User-Focused Design**: Adding multilingual support and automatic updates greatly enhances usability.  
- **Practical AI**: Moving beyond Q&A to actual task execution (seat swaps, real-time alerts) increases real-world value.


